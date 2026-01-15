-- Criar tabela para códigos de reativação de licenças
CREATE TABLE public.license_activation_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  used_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para histórico de uso de códigos
CREATE TABLE public.license_code_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID NOT NULL REFERENCES public.license_activation_codes(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  previous_status TEXT,
  previous_expires_at TIMESTAMP WITH TIME ZONE,
  new_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para cache offline de licenças válidas
CREATE TABLE public.offline_license_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE UNIQUE,
  cpf TEXT NOT NULL,
  name TEXT NOT NULL,
  team TEXT,
  unit_id UUID REFERENCES public.units(id),
  license_status TEXT NOT NULL DEFAULT 'active',
  license_expires_at TIMESTAMP WITH TIME ZONE,
  password_hash TEXT,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_sync TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para license_activation_codes
ALTER TABLE public.license_activation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage activation codes" 
ON public.license_activation_codes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'master')
  )
);

-- RLS para license_code_usage
ALTER TABLE public.license_code_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view code usage" 
ON public.license_code_usage 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'master')
  )
);

CREATE POLICY "Authenticated users can create usage records" 
ON public.license_code_usage 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS para offline_license_cache
ALTER TABLE public.offline_license_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage offline cache" 
ON public.offline_license_cache 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'master')
  )
);

CREATE POLICY "Users can view their own cached license" 
ON public.offline_license_cache 
FOR SELECT 
USING (agent_id = auth.uid());

-- Criar índices
CREATE INDEX idx_activation_codes_code ON public.license_activation_codes(code);
CREATE INDEX idx_activation_codes_active ON public.license_activation_codes(is_active);
CREATE INDEX idx_offline_cache_cpf ON public.offline_license_cache(cpf);
CREATE INDEX idx_offline_cache_agent ON public.offline_license_cache(agent_id);

-- Função para ativar licença com código
CREATE OR REPLACE FUNCTION public.activate_license_with_code(
  p_code TEXT,
  p_agent_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record license_activation_codes%ROWTYPE;
  v_agent_record agents%ROWTYPE;
  v_new_expires_at TIMESTAMP WITH TIME ZONE;
  v_affected_count INTEGER := 0;
BEGIN
  -- Buscar código
  SELECT * INTO v_code_record
  FROM license_activation_codes
  WHERE code = UPPER(p_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR used_count < max_uses);

  IF v_code_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Código inválido ou expirado');
  END IF;

  -- Se agent_id foi fornecido, ativar apenas para esse agente
  IF p_agent_id IS NOT NULL THEN
    SELECT * INTO v_agent_record FROM agents WHERE id = p_agent_id;
    
    IF v_agent_record.id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Agente não encontrado');
    END IF;

    -- Calcular nova data de expiração
    v_new_expires_at := COALESCE(
      GREATEST(v_agent_record.license_expires_at, now()),
      now()
    ) + (v_code_record.duration_days || ' days')::INTERVAL;

    -- Atualizar agente
    UPDATE agents
    SET license_status = 'active',
        license_expires_at = v_new_expires_at,
        updated_at = now()
    WHERE id = p_agent_id;

    -- Registrar uso
    INSERT INTO license_code_usage (code_id, agent_id, previous_status, previous_expires_at, new_expires_at)
    VALUES (v_code_record.id, p_agent_id, v_agent_record.license_status, v_agent_record.license_expires_at, v_new_expires_at);

    v_affected_count := 1;
  ELSE
    -- Ativar para todos os agentes ativos
    FOR v_agent_record IN SELECT * FROM agents WHERE is_active = true LOOP
      v_new_expires_at := COALESCE(
        GREATEST(v_agent_record.license_expires_at, now()),
        now()
      ) + (v_code_record.duration_days || ' days')::INTERVAL;

      UPDATE agents
      SET license_status = 'active',
          license_expires_at = v_new_expires_at,
          updated_at = now()
      WHERE id = v_agent_record.id;

      INSERT INTO license_code_usage (code_id, agent_id, previous_status, previous_expires_at, new_expires_at)
      VALUES (v_code_record.id, v_agent_record.id, v_agent_record.license_status, v_agent_record.license_expires_at, v_new_expires_at);

      v_affected_count := v_affected_count + 1;
    END LOOP;
  END IF;

  -- Atualizar contador de uso do código
  UPDATE license_activation_codes
  SET used_count = used_count + v_affected_count
  WHERE id = v_code_record.id;

  RETURN json_build_object(
    'success', true,
    'affected_count', v_affected_count,
    'duration_days', v_code_record.duration_days,
    'code_description', v_code_record.description
  );
END;
$$;

-- Função para sincronizar cache offline
CREATE OR REPLACE FUNCTION public.sync_offline_license_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Inserir ou atualizar cache para todos os agentes ativos
  INSERT INTO offline_license_cache (agent_id, cpf, name, team, unit_id, license_status, license_expires_at, last_sync)
  SELECT 
    a.id,
    a.cpf,
    a.name,
    a.team,
    a.unit_id,
    COALESCE(a.license_status, 'active'),
    a.license_expires_at,
    now()
  FROM agents a
  WHERE a.is_active = true AND a.cpf IS NOT NULL
  ON CONFLICT (agent_id) DO UPDATE SET
    cpf = EXCLUDED.cpf,
    name = EXCLUDED.name,
    team = EXCLUDED.team,
    unit_id = EXCLUDED.unit_id,
    license_status = EXCLUDED.license_status,
    license_expires_at = EXCLUDED.license_expires_at,
    last_sync = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;