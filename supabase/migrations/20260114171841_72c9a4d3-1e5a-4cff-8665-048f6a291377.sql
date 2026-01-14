-- Drop all INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Insert agents policy" ON public.agents;
DROP POLICY IF EXISTS "Admins can manage agents" ON public.agents;

-- Create simple INSERT policy that allows any authenticated user to insert
CREATE POLICY "Allow authenticated insert"
ON public.agents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create admin manage policy for UPDATE/DELETE/SELECT
CREATE POLICY "Admins full access"
ON public.agents
FOR ALL
TO authenticated
USING (is_admin_or_master(auth.uid()))
WITH CHECK (is_admin_or_master(auth.uid()));