-- Allow users to delete their own agent record
CREATE POLICY "Users can delete their own agent record"
ON public.agents
FOR DELETE
USING (cpf = split_part(auth.email(), '@'::text, 1));

-- Allow users to delete their own agent_shifts
DROP POLICY IF EXISTS "Users can delete own shifts" ON public.agent_shifts;
CREATE POLICY "Users can delete own shifts"
ON public.agent_shifts
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Allow users to delete their own shifts (in shifts table)
DROP POLICY IF EXISTS "Users can delete own shifts" ON public.shifts;
CREATE POLICY "Users can delete own shifts"
ON public.shifts
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Allow users to delete their own payments
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;
CREATE POLICY "Users can delete own payments"
ON public.payments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM agents a
    WHERE a.id = payments.agent_id 
    AND a.cpf = split_part(auth.email(), '@'::text, 1)
  )
  OR is_admin_or_master(auth.uid())
);

-- Allow users to delete their own access_logs
DROP POLICY IF EXISTS "Users can delete own access logs" ON public.access_logs;
CREATE POLICY "Users can delete own access logs"
ON public.access_logs
FOR DELETE
USING (
  agent_id = auth.uid() 
  OR is_admin_or_master(auth.uid())
);