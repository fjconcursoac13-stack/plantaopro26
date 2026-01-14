-- Criar função para limpar usuários órfãos do auth que não têm agente correspondente
-- Esta função usa SECURITY DEFINER para ter acesso ao schema auth
CREATE OR REPLACE FUNCTION public.cleanup_orphan_auth_user(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Buscar o user_id do usuário no auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  -- Se não encontrou, retorna true (não há o que limpar)
  IF v_user_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- Verificar se existe agente correspondente
  IF EXISTS (SELECT 1 FROM public.agents WHERE id = v_user_id) THEN
    -- Se existe agente, não limpar (usuário é válido)
    RETURN false;
  END IF;
  
  -- Limpar dados órfãos de todas as tabelas relacionadas
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE user_id = v_user_id;
  
  -- Excluir o usuário órfão do auth.users
  DELETE FROM auth.users WHERE id = v_user_id;
  
  RETURN true;
END;
$$;

-- Limpar o usuário órfão com CPF 22088318291
SELECT public.cleanup_orphan_auth_user('22088318291@agent.plantaopro.com');