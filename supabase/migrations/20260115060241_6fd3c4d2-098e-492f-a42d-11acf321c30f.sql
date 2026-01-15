-- Drop existing conflicting SELECT policies on agents
DROP POLICY IF EXISTS "Allow public CPF lookup" ON public.agents;
DROP POLICY IF EXISTS "Authenticated users can view all agents" ON public.agents;
DROP POLICY IF EXISTS "Agents can view own record" ON public.agents;

-- Create a single permissive SELECT policy for agents
CREATE POLICY "Authenticated users can view agents"
ON public.agents
FOR SELECT
TO authenticated
USING (true);

-- Also create a public policy for CPF lookup during login/registration (anon role)
CREATE POLICY "Public CPF lookup for login"
ON public.agents
FOR SELECT
TO anon
USING (true);

-- Fix units table - ensure units are publicly readable
DROP POLICY IF EXISTS "Anyone can view units" ON public.units;
CREATE POLICY "Anyone can view units"
ON public.units
FOR SELECT
USING (true);