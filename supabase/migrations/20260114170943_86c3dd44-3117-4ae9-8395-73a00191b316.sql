-- Drop conflicting INSERT policies for agents table
DROP POLICY IF EXISTS "Admins can insert agents" ON public.agents;
DROP POLICY IF EXISTS "Users can create their own agent record" ON public.agents;

-- Create a single, clear INSERT policy for agents
-- Allows: 1) Self-registration during signup, 2) Admin/Master inserting any agent
CREATE POLICY "Insert agents policy"
ON public.agents
FOR INSERT
WITH CHECK (
  -- Allow self-registration (CPF matches email)
  (cpf = split_part(auth.email(), '@', 1))
  OR
  -- Allow admins and masters to insert any agent
  is_admin_or_master(auth.uid())
  OR
  -- Allow authenticated users to create records during signup flow
  (auth.uid() IS NOT NULL)
);