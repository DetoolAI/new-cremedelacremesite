ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS pin text;
CREATE UNIQUE INDEX IF NOT EXISTS staff_pin_unique_active ON public.staff (pin) WHERE pin IS NOT NULL AND active = true;