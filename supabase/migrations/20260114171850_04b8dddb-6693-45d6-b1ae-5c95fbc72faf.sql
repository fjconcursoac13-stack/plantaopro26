-- Replace the permissive INSERT policy with a more specific one
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.agents;

-- Create INSERT policy that checks admin OR self-registration
CREATE POLICY "Secure insert agents"
ON public.agents
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin_or_master(auth.uid()) 
  OR (cpf = split_part(auth.email(), '@', 1))
  OR (auth.uid() = id)
);