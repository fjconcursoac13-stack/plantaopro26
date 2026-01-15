-- =============================================================================
-- PLANTÃO PRO - MIGRAÇÃO COMPLETA + DADOS INICIAIS
-- Versão: 11.0 (Janeiro 2026)
-- =============================================================================
-- INSTRUÇÕES:
-- 1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard
-- 2. Vá para SQL Editor
-- 3. Cole TODO este conteúdo e execute
-- 4. Em Authentication > Settings: Desative "Email Confirmations"
-- =============================================================================

-- =============================================================================
-- EXTENSÕES
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TIPOS PERSONALIZADOS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'master');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- TABELAS PRINCIPAIS
-- =============================================================================

-- Unidades socioeducativas
CREATE TABLE IF NOT EXISTS public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  municipality TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  director_name TEXT,
  coordinator_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agentes de segurança
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT UNIQUE,
  matricula TEXT,
  team TEXT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'agent',
  blood_type TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  birth_date DATE,
  age INTEGER,
  position TEXT,
  department TEXT,
  avatar_url TEXT,
  first_shift_date DATE,
  is_active BOOLEAN DEFAULT true,
  is_frozen BOOLEAN DEFAULT false,
  frozen_at TIMESTAMP WITH TIME ZONE,
  frozen_by TEXT,
  unblocked_at TIMESTAMP WITH TIME ZONE,
  unblocked_by TEXT,
  license_status TEXT DEFAULT 'trial',
  license_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
  license_notes TEXT,
  bh_limit INTEGER DEFAULT 40,
  bh_hourly_rate NUMERIC(10,2) DEFAULT 25.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Perfis de usuário
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Papéis de usuário
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Administradores master
CREATE TABLE IF NOT EXISTS public.master_admin (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tokens de sessão master
CREATE TABLE IF NOT EXISTS public.master_session_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Plantões dos agentes
CREATE TABLE IF NOT EXISTS public.agent_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '07:00',
  end_time TIME NOT NULL DEFAULT '07:00',
  shift_type TEXT NOT NULL DEFAULT 'regular',
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  is_vacation BOOLEAN DEFAULT false,
  compensation_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Plantões (tabela legada)
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_type TEXT NOT NULL DEFAULT 'regular',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Banco de horas
CREATE TABLE IF NOT EXISTS public.overtime_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  operation_type TEXT NOT NULL DEFAULT 'credit',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Eventos dos agentes
CREATE TABLE IF NOT EXISTS public.agent_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'other',
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT false,
  reminder_before INTEGER,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Licenças/Afastamentos
CREATE TABLE IF NOT EXISTS public.agent_leaves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Alertas de plantão
CREATE TABLE IF NOT EXISTS public.shift_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  shift_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Configurações do planejador de plantões
CREATE TABLE IF NOT EXISTS public.shift_planner_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  config_name TEXT NOT NULL,
  config_type TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  agent_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Solicitações de transferência
CREATE TABLE IF NOT EXISTS public.transfer_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  from_unit_id UUID NOT NULL REFERENCES public.units(id),
  to_unit_id UUID NOT NULL REFERENCES public.units(id),
  from_team TEXT NOT NULL,
  to_team TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pagamentos
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  months_paid INTEGER NOT NULL DEFAULT 1,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  notes TEXT,
  registered_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Logs de acesso
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT 'login',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tentativas de login
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN DEFAULT false,
  attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Salas de chat
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'team',
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  team TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Membros das salas
CREATE TABLE IF NOT EXISTS public.chat_room_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mensagens de chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mensagens deletadas
CREATE TABLE IF NOT EXISTS public.deleted_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Códigos de ativação de licença
CREATE TABLE IF NOT EXISTS public.license_activation_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  duration_days INTEGER NOT NULL DEFAULT 30,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Uso de códigos de licença
CREATE TABLE IF NOT EXISTS public.license_code_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID NOT NULL REFERENCES public.license_activation_codes(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  previous_status TEXT,
  previous_expires_at TIMESTAMP WITH TIME ZONE,
  new_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cache de licença offline
CREATE TABLE IF NOT EXISTS public.offline_license_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL UNIQUE REFERENCES public.agents(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL,
  name TEXT NOT NULL,
  team TEXT,
  unit_id UUID REFERENCES public.units(id),
  license_status TEXT NOT NULL DEFAULT 'trial',
  license_expires_at TIMESTAMP WITH TIME ZONE,
  password_hash TEXT,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_sync TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Configurações de banco de dados externo
CREATE TABLE IF NOT EXISTS public.external_database_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================================================
-- ÍNDICES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_agents_cpf ON public.agents(cpf);
CREATE INDEX IF NOT EXISTS idx_agents_unit_id ON public.agents(unit_id);
CREATE INDEX IF NOT EXISTS idx_agents_team ON public.agents(team);
CREATE INDEX IF NOT EXISTS idx_agent_shifts_agent_id ON public.agent_shifts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_shifts_shift_date ON public.agent_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_overtime_bank_agent_id ON public.overtime_bank(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_shift_alerts_agent_id ON public.shift_alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON public.login_attempts(identifier);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempt_time ON public.login_attempts(attempt_time);

-- =============================================================================
-- FUNÇÕES AUXILIARES
-- =============================================================================

-- Verificar papel do usuário
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verificar se é admin ou master
CREATE OR REPLACE FUNCTION public.is_admin_or_master(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'master')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Calcular saldo do banco de horas
CREATE OR REPLACE FUNCTION public.calculate_bh_balance(p_agent_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN operation_type = 'credit' THEN hours
      WHEN operation_type = 'debit' THEN -hours
      ELSE 0
    END
  ), 0) INTO v_balance
  FROM public.overtime_bank
  WHERE agent_id = p_agent_id;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Calcular valor do banco de horas
CREATE OR REPLACE FUNCTION public.calculate_bh_value(p_agent_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC;
  v_hourly_rate NUMERIC;
BEGIN
  SELECT calculate_bh_balance(p_agent_id) INTO v_balance;
  SELECT COALESCE(bh_hourly_rate, 25.00) INTO v_hourly_rate
  FROM public.agents WHERE id = p_agent_id;
  
  RETURN v_balance * v_hourly_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verificar se licença expirou
CREATE OR REPLACE FUNCTION public.is_license_expired(p_agent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_status TEXT;
BEGIN
  SELECT license_expires_at, license_status INTO v_expires_at, v_status
  FROM public.agents WHERE id = p_agent_id;
  
  IF v_status = 'blocked' THEN
    RETURN true;
  END IF;
  
  IF v_expires_at IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN v_expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Estender licença
CREATE OR REPLACE FUNCTION public.extend_license(p_admin_id TEXT, p_agent_id UUID, p_months INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_current_expires TIMESTAMP WITH TIME ZONE;
  v_new_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT license_expires_at INTO v_current_expires
  FROM public.agents WHERE id = p_agent_id;
  
  IF v_current_expires IS NULL OR v_current_expires < now() THEN
    v_new_expires := now() + (p_months || ' months')::INTERVAL;
  ELSE
    v_new_expires := v_current_expires + (p_months || ' months')::INTERVAL;
  END IF;
  
  UPDATE public.agents
  SET license_expires_at = v_new_expires,
      license_status = 'active',
      license_notes = COALESCE(license_notes, '') || E'\n' || 
        to_char(now(), 'YYYY-MM-DD HH24:MI') || ' - Licença estendida por ' || 
        p_months || ' meses por ' || p_admin_id
  WHERE id = p_agent_id;
  
  RETURN to_char(v_new_expires, 'DD/MM/YYYY');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Congelar/Descongelar agente
CREATE OR REPLACE FUNCTION public.toggle_agent_freeze(p_admin_id TEXT, p_agent_id UUID, p_freeze BOOLEAN)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_freeze THEN
    UPDATE public.agents
    SET is_frozen = true,
        frozen_at = now(),
        frozen_by = p_admin_id,
        license_status = 'blocked'
    WHERE id = p_agent_id;
  ELSE
    UPDATE public.agents
    SET is_frozen = false,
        unblocked_at = now(),
        unblocked_by = p_admin_id,
        license_status = 'active'
    WHERE id = p_agent_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Gerar plantões do agente
CREATE OR REPLACE FUNCTION public.generate_agent_shifts(
  p_agent_id UUID,
  p_first_shift_date DATE,
  p_months_ahead INTEGER DEFAULT 6
)
RETURNS INTEGER AS $$
DECLARE
  v_current_date DATE;
  v_end_date DATE;
  v_shift_count INTEGER := 0;
  v_days_between INTEGER := 2;
BEGIN
  v_current_date := p_first_shift_date;
  v_end_date := p_first_shift_date + (p_months_ahead || ' months')::INTERVAL;
  
  WHILE v_current_date <= v_end_date LOOP
    INSERT INTO public.agent_shifts (agent_id, shift_date, start_time, end_time, shift_type, status)
    VALUES (p_agent_id, v_current_date, '07:00', '07:00', 'regular', 'scheduled')
    ON CONFLICT DO NOTHING;
    
    v_shift_count := v_shift_count + 1;
    v_current_date := v_current_date + ((v_days_between + 1) || ' days')::INTERVAL;
  END LOOP;
  
  RETURN v_shift_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verificar rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
  v_attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_attempt_count
  FROM public.login_attempts
  WHERE identifier = p_identifier
    AND success = false
    AND attempt_time > now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  RETURN v_attempt_count < p_max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Registrar tentativa de login
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_identifier TEXT,
  p_success BOOLEAN,
  p_ip TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.login_attempts (identifier, ip_address, success, attempt_time)
  VALUES (p_identifier, p_ip, p_success, now());
  
  DELETE FROM public.login_attempts
  WHERE attempt_time < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verificar credenciais do master admin
CREATE OR REPLACE FUNCTION public.verify_master_admin(p_username TEXT, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_stored_hash TEXT;
BEGIN
  SELECT password_hash INTO v_stored_hash
  FROM public.master_admin
  WHERE username = p_username;
  
  IF v_stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN v_stored_hash = crypt(p_password, v_stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar lembrete de plantão
CREATE OR REPLACE FUNCTION public.create_shift_reminder(
  p_agent_id UUID,
  p_shift_date DATE,
  p_shift_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.shift_alerts (
    agent_id, shift_id, title, message, alert_type, scheduled_for
  ) VALUES (
    p_agent_id,
    p_shift_id,
    'Lembrete de Plantão',
    'Seu plantão está agendado para ' || to_char(p_shift_date, 'DD/MM/YYYY'),
    'reminder',
    (p_shift_date - INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Limpar usuário órfão do auth
CREATE OR REPLACE FUNCTION public.cleanup_orphan_auth_user(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM auth.users WHERE email = p_email;
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Handler para novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Deletar usuário auth quando agente é deletado
CREATE OR REPLACE FUNCTION public.delete_auth_user_on_agent_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ativar licença com código
CREATE OR REPLACE FUNCTION public.activate_license_with_code(p_code TEXT, p_agent_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_code_record RECORD;
  v_agent_id UUID;
  v_current_expires TIMESTAMP WITH TIME ZONE;
  v_current_status TEXT;
  v_new_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  v_agent_id := COALESCE(p_agent_id, auth.uid());
  
  IF v_agent_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não identificado');
  END IF;
  
  SELECT * INTO v_code_record
  FROM public.license_activation_codes
  WHERE code = UPPER(TRIM(p_code)) AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Código inválido ou inativo');
  END IF;
  
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Código expirado');
  END IF;
  
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.used_count >= v_code_record.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Código atingiu limite de uso');
  END IF;
  
  SELECT license_expires_at, license_status INTO v_current_expires, v_current_status
  FROM public.agents WHERE id = v_agent_id;
  
  IF v_current_expires IS NULL OR v_current_expires < now() THEN
    v_new_expires := now() + (v_code_record.duration_days || ' days')::INTERVAL;
  ELSE
    v_new_expires := v_current_expires + (v_code_record.duration_days || ' days')::INTERVAL;
  END IF;
  
  UPDATE public.agents
  SET license_expires_at = v_new_expires,
      license_status = 'active'
  WHERE id = v_agent_id;
  
  INSERT INTO public.license_code_usage (
    code_id, agent_id, previous_status, previous_expires_at, new_expires_at
  ) VALUES (
    v_code_record.id, v_agent_id, v_current_status, v_current_expires, v_new_expires
  );
  
  UPDATE public.license_activation_codes
  SET used_count = used_count + 1
  WHERE id = v_code_record.id;
  
  RETURN json_build_object(
    'success', true,
    'new_expires_at', v_new_expires,
    'duration_days', v_code_record.duration_days
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Sincronizar cache de licença offline
CREATE OR REPLACE FUNCTION public.sync_offline_license_cache()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.offline_license_cache (
    agent_id, cpf, name, team, unit_id, license_status, license_expires_at, last_sync
  )
  SELECT 
    id, cpf, name, team, unit_id, license_status, license_expires_at, now()
  FROM public.agents
  WHERE cpf IS NOT NULL
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_shifts_updated_at ON public.agent_shifts;
CREATE TRIGGER update_agent_shifts_updated_at
  BEFORE UPDATE ON public.agent_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_events_updated_at ON public.agent_events;
CREATE TRIGGER update_agent_events_updated_at
  BEFORE UPDATE ON public.agent_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_leaves_updated_at ON public.agent_leaves;
CREATE TRIGGER update_agent_leaves_updated_at
  BEFORE UPDATE ON public.agent_leaves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_shifts_updated_at ON public.shifts;
CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_transfer_requests_updated_at ON public.transfer_requests;
CREATE TRIGGER update_transfer_requests_updated_at
  BEFORE UPDATE ON public.transfer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_shift_planner_configs_updated_at ON public.shift_planner_configs;
CREATE TRIGGER update_shift_planner_configs_updated_at
  BEFORE UPDATE ON public.shift_planner_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trigger_delete_auth_user_on_agent_delete ON public.agents;
CREATE TRIGGER trigger_delete_auth_user_on_agent_delete
  AFTER DELETE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.delete_auth_user_on_agent_delete();

-- =============================================================================
-- STORAGE
-- =============================================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- =============================================================================
-- HABILITAR ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_session_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_planner_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_code_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_license_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_database_configs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- POLÍTICAS RLS
-- =============================================================================

-- Units
DROP POLICY IF EXISTS "Units are viewable by everyone" ON public.units;
CREATE POLICY "Units are viewable by everyone" ON public.units FOR SELECT USING (true);

DROP POLICY IF EXISTS "Units are manageable by admins" ON public.units;
CREATE POLICY "Units are manageable by admins" ON public.units FOR ALL USING (true);

-- Agents
DROP POLICY IF EXISTS "Agents can view all agents" ON public.agents;
CREATE POLICY "Agents can view all agents" ON public.agents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Agents can insert themselves" ON public.agents;
CREATE POLICY "Agents can insert themselves" ON public.agents FOR INSERT 
  WITH CHECK (auth.uid() = id OR is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Agents can update themselves" ON public.agents;
CREATE POLICY "Agents can update themselves" ON public.agents FOR UPDATE 
  USING (auth.uid() = id OR is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete agents" ON public.agents;
CREATE POLICY "Admins can delete agents" ON public.agents FOR DELETE 
  USING (is_admin_or_master(auth.uid()));

-- Profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- User Roles
DROP POLICY IF EXISTS "User roles are viewable by authenticated users" ON public.user_roles;
CREATE POLICY "User roles are viewable by authenticated users" ON public.user_roles 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL 
  USING (is_admin_or_master(auth.uid()));

-- Master Admin
DROP POLICY IF EXISTS "Master admin viewable by all" ON public.master_admin;
CREATE POLICY "Master admin viewable by all" ON public.master_admin FOR SELECT USING (true);

-- Master Session Tokens
DROP POLICY IF EXISTS "Master session tokens are manageable" ON public.master_session_tokens;
CREATE POLICY "Master session tokens are manageable" ON public.master_session_tokens FOR ALL USING (true);

-- Agent Shifts
DROP POLICY IF EXISTS "Agent shifts are viewable by all authenticated" ON public.agent_shifts;
CREATE POLICY "Agent shifts are viewable by all authenticated" ON public.agent_shifts 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Agents can manage own shifts" ON public.agent_shifts;
CREATE POLICY "Agents can manage own shifts" ON public.agent_shifts FOR ALL 
  USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

-- Shifts
DROP POLICY IF EXISTS "Shifts are viewable by all authenticated" ON public.shifts;
CREATE POLICY "Shifts are viewable by all authenticated" ON public.shifts 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Agents can manage own shifts legacy" ON public.shifts;
CREATE POLICY "Agents can manage own shifts legacy" ON public.shifts FOR ALL 
  USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

-- Overtime Bank
DROP POLICY IF EXISTS "Overtime viewable by owner and admins" ON public.overtime_bank;
CREATE POLICY "Overtime viewable by owner and admins" ON public.overtime_bank 
  FOR SELECT USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Overtime manageable by owner and admins" ON public.overtime_bank;
CREATE POLICY "Overtime manageable by owner and admins" ON public.overtime_bank FOR ALL 
  USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

-- Agent Events
DROP POLICY IF EXISTS "Events viewable by owner" ON public.agent_events;
CREATE POLICY "Events viewable by owner" ON public.agent_events 
  FOR SELECT USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Events manageable by owner" ON public.agent_events;
CREATE POLICY "Events manageable by owner" ON public.agent_events FOR ALL 
  USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

-- Agent Leaves
DROP POLICY IF EXISTS "Leaves viewable by owner and admins" ON public.agent_leaves;
CREATE POLICY "Leaves viewable by owner and admins" ON public.agent_leaves 
  FOR SELECT USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Leaves manageable by owner and admins" ON public.agent_leaves;
CREATE POLICY "Leaves manageable by owner and admins" ON public.agent_leaves FOR ALL 
  USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

-- Shift Alerts
DROP POLICY IF EXISTS "Alerts viewable by owner" ON public.shift_alerts;
CREATE POLICY "Alerts viewable by owner" ON public.shift_alerts 
  FOR SELECT USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Alerts manageable by owner and admins" ON public.shift_alerts;
CREATE POLICY "Alerts manageable by owner and admins" ON public.shift_alerts FOR ALL 
  USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

-- Shift Planner Configs
DROP POLICY IF EXISTS "Planner configs viewable by owner" ON public.shift_planner_configs;
CREATE POLICY "Planner configs viewable by owner" ON public.shift_planner_configs 
  FOR SELECT USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Planner configs manageable by owner" ON public.shift_planner_configs;
CREATE POLICY "Planner configs manageable by owner" ON public.shift_planner_configs FOR ALL 
  USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

-- Transfer Requests
DROP POLICY IF EXISTS "Transfer requests viewable by involved parties" ON public.transfer_requests;
CREATE POLICY "Transfer requests viewable by involved parties" ON public.transfer_requests 
  FOR SELECT USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Transfer requests manageable" ON public.transfer_requests;
CREATE POLICY "Transfer requests manageable" ON public.transfer_requests FOR ALL 
  USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

-- Payments
DROP POLICY IF EXISTS "Payments viewable by owner and admins" ON public.payments;
CREATE POLICY "Payments viewable by owner and admins" ON public.payments 
  FOR SELECT USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Payments manageable by admins" ON public.payments;
CREATE POLICY "Payments manageable by admins" ON public.payments FOR ALL 
  USING (is_admin_or_master(auth.uid()));

-- Access Logs
DROP POLICY IF EXISTS "Access logs viewable by owner and admins" ON public.access_logs;
CREATE POLICY "Access logs viewable by owner and admins" ON public.access_logs 
  FOR SELECT USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Access logs insertable by owner" ON public.access_logs;
CREATE POLICY "Access logs insertable by owner" ON public.access_logs FOR INSERT 
  WITH CHECK (auth.uid() = agent_id);

-- Login Attempts
DROP POLICY IF EXISTS "Login attempts are public" ON public.login_attempts;
CREATE POLICY "Login attempts are public" ON public.login_attempts FOR ALL USING (true);

-- Chat Rooms
DROP POLICY IF EXISTS "Chat rooms viewable by authenticated" ON public.chat_rooms;
CREATE POLICY "Chat rooms viewable by authenticated" ON public.chat_rooms 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Chat rooms manageable by admins" ON public.chat_rooms;
CREATE POLICY "Chat rooms manageable by admins" ON public.chat_rooms FOR ALL 
  USING (is_admin_or_master(auth.uid()));

-- Chat Room Members
DROP POLICY IF EXISTS "Chat room members viewable" ON public.chat_room_members;
CREATE POLICY "Chat room members viewable" ON public.chat_room_members 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Chat room members manageable" ON public.chat_room_members;
CREATE POLICY "Chat room members manageable" ON public.chat_room_members FOR ALL 
  USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

-- Chat Messages
DROP POLICY IF EXISTS "Chat messages viewable by authenticated" ON public.chat_messages;
CREATE POLICY "Chat messages viewable by authenticated" ON public.chat_messages 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Chat messages insertable by authenticated" ON public.chat_messages;
CREATE POLICY "Chat messages insertable by authenticated" ON public.chat_messages 
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Chat messages updatable by sender" ON public.chat_messages;
CREATE POLICY "Chat messages updatable by sender" ON public.chat_messages 
  FOR UPDATE USING (auth.uid() = sender_id);

-- Deleted Messages
DROP POLICY IF EXISTS "Deleted messages manageable by owner" ON public.deleted_messages;
CREATE POLICY "Deleted messages manageable by owner" ON public.deleted_messages FOR ALL 
  USING (auth.uid() = agent_id);

-- License Activation Codes
DROP POLICY IF EXISTS "License codes viewable by admins" ON public.license_activation_codes;
CREATE POLICY "License codes viewable by admins" ON public.license_activation_codes 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "License codes manageable by admins" ON public.license_activation_codes;
CREATE POLICY "License codes manageable by admins" ON public.license_activation_codes FOR ALL 
  USING (is_admin_or_master(auth.uid()));

-- License Code Usage
DROP POLICY IF EXISTS "License usage viewable" ON public.license_code_usage;
CREATE POLICY "License usage viewable" ON public.license_code_usage 
  FOR SELECT USING (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "License usage insertable" ON public.license_code_usage;
CREATE POLICY "License usage insertable" ON public.license_code_usage FOR INSERT 
  WITH CHECK (auth.uid() = agent_id OR is_admin_or_master(auth.uid()));

-- Offline License Cache
DROP POLICY IF EXISTS "Offline cache viewable" ON public.offline_license_cache;
CREATE POLICY "Offline cache viewable" ON public.offline_license_cache 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Offline cache manageable by admins" ON public.offline_license_cache;
CREATE POLICY "Offline cache manageable by admins" ON public.offline_license_cache FOR ALL 
  USING (is_admin_or_master(auth.uid()));

-- External Database Configs
DROP POLICY IF EXISTS "External configs viewable by admins" ON public.external_database_configs;
CREATE POLICY "External configs viewable by admins" ON public.external_database_configs 
  FOR SELECT USING (is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "External configs manageable by admins" ON public.external_database_configs;
CREATE POLICY "External configs manageable by admins" ON public.external_database_configs FOR ALL 
  USING (is_admin_or_master(auth.uid()));

-- =============================================================================
-- HABILITAR REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;

-- =============================================================================
-- DADOS INICIAIS (SEED)
-- =============================================================================

-- Unidades
INSERT INTO public.units (id, name, municipality, address, phone, email, director_name, coordinator_name) VALUES
  ('7e6b9c14-da70-4732-b6e3-51eccc751f2e', 'CS Acre', 'Rio Branco', 'Av. Brasil, 1000 - Centro', '(68) 3223-0001', 'cs.acre@ise.ac.gov.br', 'Dr. João Silva', 'Carlos Santos'),
  ('0b0d9d6c-dfd2-4d8b-af9b-95fae975645d', 'CS Aquiri', 'Rio Branco', 'Rua Amazonas, 500 - Bosque', '(68) 3223-0002', 'cs.aquiri@ise.ac.gov.br', 'Dra. Maria Oliveira', 'Ana Costa'),
  ('f8d78670-b19f-4654-8f10-e91c7ecbce88', 'CS Mocinha Magalhães', 'Rio Branco', 'Av. Ceará, 800 - Cidade Nova', '(68) 3223-0003', 'cs.mocinha@ise.ac.gov.br', 'Dr. Pedro Souza', 'José Lima'),
  ('64eb9fa7-c831-478c-b968-153aeb1b4a32', 'CS Santa Juliana', 'Rio Branco', 'Rua Quinari, 200 - Tancredo Neves', '(68) 3223-0004', 'cs.santajuliana@ise.ac.gov.br', 'Dra. Lucia Pereira', 'Roberto Nunes'),
  ('05ca3120-d095-4e30-832b-e3026a540fa1', 'UIP', 'Rio Branco', 'Av. Getúlio Vargas, 1500 - Centro', '(68) 3223-0005', 'uip@ise.ac.gov.br', 'Dr. Fernando Alves', 'Marcos Ribeiro'),
  ('6ea1a1cd-0cdc-4ce8-ad61-0f9cfa214966', 'CS Cruzeiro', 'Cruzeiro do Sul', 'Av. Mâncio Lima, 300 - Centro', '(68) 3322-0001', 'cs.cruzeiro@ise.ac.gov.br', 'Dr. Ricardo Mendes', 'Patricia Gomes'),
  ('dd77c458-92fb-49e2-819d-7a32288cc390', 'CS Feijó', 'Feijó', 'Rua Principal, 150 - Centro', '(68) 3463-0001', 'cs.feijo@ise.ac.gov.br', 'Dr. Antonio Ferreira', 'Sandra Melo'),
  ('e97e1711-27ca-412b-9c5a-6183fc51cc04', 'CS Sena', 'Sena Madureira', 'Av. Avelino Chaves, 400 - Centro', '(68) 3612-0001', 'cs.sena@ise.ac.gov.br', 'Dra. Claudia Rocha', 'Paulo Freitas'),
  ('f20f1979-19e4-4662-a97a-bf2d6a3283d9', 'CS Brasiléia', 'Brasiléia', 'Rua Raimundo Chaar, 100 - Centro', '(68) 3546-0001', 'cs.brasileia@ise.ac.gov.br', 'Dr. Marcos Dias', 'Fernanda Cruz')
ON CONFLICT (id) DO NOTHING;

-- Administradores Master
INSERT INTO public.master_admin (username, password_hash) VALUES
  ('admin', crypt('master123', gen_salt('bf'))),
  ('franc', crypt('franc1982', gen_salt('bf')))
ON CONFLICT (username) DO NOTHING;

-- Sala de chat global
INSERT INTO public.chat_rooms (name, type, unit_id, team) VALUES
  ('Sistema ISE/ACRE - Todas as Unidades', 'all', NULL, NULL)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- FIM DA MIGRAÇÃO
-- =============================================================================
