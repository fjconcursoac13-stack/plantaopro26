-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Secure insert agents" ON public.agents;

-- Create a simpler INSERT policy that allows:
-- 1. Authenticated users to insert their OWN record (id = auth.uid())
-- 2. Admins/Masters to insert ANY record
CREATE POLICY "Allow agent registration"
ON public.agents
FOR INSERT
TO authenticated
WITH CHECK (
  -- Self-registration: the agent id must match the authenticated user id
  (id = auth.uid())
  OR
  -- Admin/Master can insert any agent
  is_admin_or_master(auth.uid())
);