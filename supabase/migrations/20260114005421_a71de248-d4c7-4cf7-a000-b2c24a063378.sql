-- Add policy to allow public CPF lookup for login verification
CREATE POLICY "Allow public CPF lookup"
ON public.agents
FOR SELECT
TO anon
USING (true);

-- Also ensure authenticated users can see agents for team member lists
CREATE POLICY "Authenticated users can view all agents"
ON public.agents
FOR SELECT
TO authenticated
USING (true);