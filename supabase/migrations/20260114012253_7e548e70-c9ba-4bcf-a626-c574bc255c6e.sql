-- Delete orphaned auth users (users without corresponding agents)
DELETE FROM auth.users 
WHERE id IN (
  SELECT u.id 
  FROM auth.users u 
  LEFT JOIN public.agents a ON u.id = a.id 
  WHERE a.id IS NULL
);

-- Create a function to delete auth user when agent is deleted
CREATE OR REPLACE FUNCTION public.delete_auth_user_on_agent_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the corresponding auth.users entry
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run AFTER agent is deleted
DROP TRIGGER IF EXISTS on_agent_delete_cleanup ON public.agents;
CREATE TRIGGER on_agent_delete_cleanup
  AFTER DELETE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_auth_user_on_agent_delete();