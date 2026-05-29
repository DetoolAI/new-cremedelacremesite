-- 1. Per-service lead time (minutes of notice required before the appointment)
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS min_lead_minutes integer NOT NULL DEFAULT 0;

-- Default lead times by current duration (sensible starting values; admin can edit)
UPDATE public.services SET min_lead_minutes = 120 WHERE duration_minutes >= 120 AND min_lead_minutes = 0;
UPDATE public.services SET min_lead_minutes = 60  WHERE duration_minutes >= 60  AND duration_minutes < 120 AND min_lead_minutes = 0;
UPDATE public.services SET min_lead_minutes = 30  WHERE duration_minutes < 60   AND min_lead_minutes = 0;

-- 2. Per-staff weekly schedule
CREATE TABLE IF NOT EXISTS public.staff_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_staff_schedule_staff ON public.staff_schedule(staff_id, day_of_week);

ALTER TABLE public.staff_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view staff schedule"
  ON public.staff_schedule FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins manage staff schedule"
  ON public.staff_schedule FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Seed: each active staff member gets default 10:00–19:00 Mon–Sat and 10:00–18:00 Sun
INSERT INTO public.staff_schedule (staff_id, day_of_week, start_time, end_time)
SELECT s.id, d, '10:00'::time, CASE WHEN d = 0 THEN '18:00'::time ELSE '19:00'::time END
FROM public.staff s
CROSS JOIN unnest(ARRAY[0,1,2,3,4,5,6]) AS d
WHERE s.active = true
  AND d = ANY(s.work_days)
  AND NOT EXISTS (
    SELECT 1 FROM public.staff_schedule ss WHERE ss.staff_id = s.id AND ss.day_of_week = d
  );

-- 3. One-off time off / blocks
CREATE TABLE IF NOT EXISTS public.staff_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  off_date date NOT NULL,
  start_time time,            -- NULL = full day
  end_time time,              -- NULL = full day
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_lookup ON public.staff_time_off(staff_id, off_date);

ALTER TABLE public.staff_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view staff time off"
  ON public.staff_time_off FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins manage staff time off"
  ON public.staff_time_off FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. Default booking settings (max advance days)
INSERT INTO public.site_settings (key, value)
VALUES ('booking', '{"max_advance_days": 60}'::jsonb)
ON CONFLICT (key) DO NOTHING;