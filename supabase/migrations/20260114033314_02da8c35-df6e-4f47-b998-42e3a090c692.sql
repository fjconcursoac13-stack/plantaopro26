-- Create access_logs table for tracking user logins
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT 'login',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on access_logs
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/Master can view all logs
CREATE POLICY "Admin can view all access logs"
ON public.access_logs
FOR SELECT
TO authenticated
USING (public.is_admin_or_master(auth.uid()));

-- Policy: Users can view their own logs
CREATE POLICY "Users can view own access logs"
ON public.access_logs
FOR SELECT
TO authenticated
USING (agent_id = auth.uid());

-- Policy: Authenticated can insert their own logs
CREATE POLICY "Users can insert own access logs"
ON public.access_logs
FOR INSERT
TO authenticated
WITH CHECK (agent_id = auth.uid());

-- Create payments table for manual payment registration
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  months_paid INTEGER NOT NULL DEFAULT 1,
  payment_method TEXT DEFAULT 'manual',
  notes TEXT,
  registered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/Master can manage all payments
CREATE POLICY "Admin can manage all payments"
ON public.payments
FOR ALL
TO authenticated
USING (public.is_admin_or_master(auth.uid()));

-- Policy: Users can view their own payments
CREATE POLICY "Users can view own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (agent_id = auth.uid());

-- Add license-related columns to agents table if not exists
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS frozen_by UUID,
ADD COLUMN IF NOT EXISTS unblocked_by UUID,
ADD COLUMN IF NOT EXISTS unblocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS license_notes TEXT;

-- Create function to check if agent license is expired
CREATE OR REPLACE FUNCTION public.is_license_expired(p_agent_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_is_frozen BOOLEAN;
BEGIN
  SELECT license_expires_at, COALESCE(is_frozen, false)
  INTO v_expires_at, v_is_frozen
  FROM public.agents
  WHERE id = p_agent_id;
  
  IF v_is_frozen THEN
    RETURN true;
  END IF;
  
  IF v_expires_at IS NULL THEN
    RETURN false;
  END IF;
  
  -- Expired after 3 days grace period
  RETURN v_expires_at + INTERVAL '3 days' < NOW();
END;
$$;

-- Create function to extend license
CREATE OR REPLACE FUNCTION public.extend_license(
  p_agent_id UUID,
  p_months INTEGER,
  p_admin_id UUID
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_expires TIMESTAMP WITH TIME ZONE;
  v_new_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT license_expires_at INTO v_current_expires
  FROM public.agents
  WHERE id = p_agent_id;
  
  -- If no expiry or already expired, start from now
  IF v_current_expires IS NULL OR v_current_expires < NOW() THEN
    v_new_expires := NOW() + (p_months || ' months')::INTERVAL;
  ELSE
    v_new_expires := v_current_expires + (p_months || ' months')::INTERVAL;
  END IF;
  
  UPDATE public.agents
  SET 
    license_expires_at = v_new_expires,
    license_status = 'active',
    is_frozen = false,
    unblocked_by = p_admin_id,
    unblocked_at = NOW(),
    updated_at = NOW()
  WHERE id = p_agent_id;
  
  RETURN v_new_expires;
END;
$$;

-- Create function to freeze/unfreeze agent
CREATE OR REPLACE FUNCTION public.toggle_agent_freeze(
  p_agent_id UUID,
  p_freeze BOOLEAN,
  p_admin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.agents
  SET 
    is_frozen = p_freeze,
    frozen_at = CASE WHEN p_freeze THEN NOW() ELSE NULL END,
    frozen_by = CASE WHEN p_freeze THEN p_admin_id ELSE NULL END,
    unblocked_by = CASE WHEN NOT p_freeze THEN p_admin_id ELSE unblocked_by END,
    unblocked_at = CASE WHEN NOT p_freeze THEN NOW() ELSE unblocked_at END,
    license_status = CASE WHEN p_freeze THEN 'frozen' ELSE 'active' END,
    updated_at = NOW()
  WHERE id = p_agent_id;
  
  RETURN true;
END;
$$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_access_logs_agent_id ON public.access_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON public.access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_agent_id ON public.payments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_license_expires ON public.agents(license_expires_at);