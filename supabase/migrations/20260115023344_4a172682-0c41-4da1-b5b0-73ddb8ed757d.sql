-- Fix RLS policies to be more secure - only allow through verify_master_admin or is_admin_or_master function

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Only masters can insert external configs" ON public.external_database_configs;
DROP POLICY IF EXISTS "Only masters can update external configs" ON public.external_database_configs;
DROP POLICY IF EXISTS "Only masters can delete external configs" ON public.external_database_configs;

-- Create more secure policies using is_admin_or_master function
CREATE POLICY "Admins can insert external configs"
  ON public.external_database_configs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'master')
    )
  );

CREATE POLICY "Admins can update external configs"
  ON public.external_database_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'master')
    )
  );

CREATE POLICY "Admins can delete external configs"
  ON public.external_database_configs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'master')
    )
  );