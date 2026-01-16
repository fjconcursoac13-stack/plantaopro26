-- Fix permissive INSERT policy on notifications
-- Allow authenticated users to create notifications
DROP POLICY IF EXISTS "System can create notifications for any agent" ON public.notifications;

CREATE POLICY "Authenticated users can create notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);