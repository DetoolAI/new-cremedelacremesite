
CREATE TABLE public.service_staff (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (service_id, staff_id)
);

CREATE INDEX idx_service_staff_service ON public.service_staff(service_id);
CREATE INDEX idx_service_staff_staff ON public.service_staff(staff_id);

ALTER TABLE public.service_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service-staff assignments"
  ON public.service_staff FOR SELECT
  USING (true);

CREATE POLICY "Admins manage service-staff assignments"
  ON public.service_staff FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
