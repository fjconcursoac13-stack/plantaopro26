-- Criar função que deleta o usuário auth quando o agente é excluído
CREATE OR REPLACE FUNCTION public.delete_auth_user_on_agent_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deletar o usuário auth correspondente
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Criar trigger que executa a função quando um agente é deletado
DROP TRIGGER IF EXISTS trigger_delete_auth_user_on_agent_delete ON public.agents;
CREATE TRIGGER trigger_delete_auth_user_on_agent_delete
  AFTER DELETE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_auth_user_on_agent_delete();

-- Limpar usuários órfãos existentes (auth.users sem agente correspondente)
DELETE FROM auth.users 
WHERE email LIKE '%@agent.plantaopro.com' 
AND id NOT IN (SELECT id FROM public.agents WHERE id IS NOT NULL);