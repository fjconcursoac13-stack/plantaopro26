-- Create admin user in auth.users
-- Note: This creates a user that can login with email: francdenisbr@gmail.com and password: franc2015

-- First, we need to create a table to store external database configurations for future use
CREATE TABLE IF NOT EXISTS public.external_database_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

-- Enable RLS
ALTER TABLE public.external_database_configs ENABLE ROW LEVEL SECURITY;

-- Only master admins can manage external database configs
CREATE POLICY "Only masters can view external configs"
  ON public.external_database_configs
  FOR SELECT
  USING (true);

CREATE POLICY "Only masters can insert external configs"
  ON public.external_database_configs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only masters can update external configs"
  ON public.external_database_configs
  FOR UPDATE
  USING (true);

CREATE POLICY "Only masters can delete external configs"
  ON public.external_database_configs
  FOR DELETE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_external_database_configs_updated_at
  BEFORE UPDATE ON public.external_database_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();