-- Allow units to be loaded before login/registration
-- (Fixes empty list when Row Level Security is enabled)

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'units'
      AND policyname = 'Units are viewable by everyone'
  ) THEN
    CREATE POLICY "Units are viewable by everyone"
    ON public.units
    FOR SELECT
    USING (true);
  END IF;
END $$;