-- Create shift_swaps table for shift swap requests
CREATE TABLE public.shift_swaps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    requester_shift_id UUID NOT NULL REFERENCES public.agent_shifts(id) ON DELETE CASCADE,
    target_shift_id UUID REFERENCES public.agent_shifts(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their swap requests" 
ON public.shift_swaps FOR SELECT 
USING (auth.uid() = requester_id OR auth.uid() = target_id);

CREATE POLICY "Users can create swap requests" 
ON public.shift_swaps FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Target can update swap status" 
ON public.shift_swaps FOR UPDATE 
USING (auth.uid() = target_id);

CREATE POLICY "Requester can cancel own request" 
ON public.shift_swaps FOR DELETE 
USING (auth.uid() = requester_id AND status = 'pending');

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    content TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = agent_id);

CREATE POLICY "System can create notifications for any agent" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = agent_id);

CREATE POLICY "Users can delete their notifications" 
ON public.notifications FOR DELETE 
USING (auth.uid() = agent_id);

-- Add bh_future_months_allowed column to agents table for admin config
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS bh_future_months_allowed INTEGER DEFAULT 0;

-- Update trigger for shift_swaps
CREATE TRIGGER update_shift_swaps_updated_at
BEFORE UPDATE ON public.shift_swaps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();