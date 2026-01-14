-- Create trigger to delete auth user when agent is deleted
DROP TRIGGER IF EXISTS trigger_delete_auth_user_on_agent_delete ON public.agents;

CREATE TRIGGER trigger_delete_auth_user_on_agent_delete
AFTER DELETE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.delete_auth_user_on_agent_delete();