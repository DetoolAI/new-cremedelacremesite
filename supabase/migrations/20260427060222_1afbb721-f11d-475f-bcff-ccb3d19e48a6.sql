-- Customers (deduped contact list)
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  country text,
  zipcode text,
  whatsapp text,
  cellphone text,
  source text DEFAULT 'setmore_import',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_email ON public.customers (lower(email));
CREATE INDEX idx_customers_phone ON public.customers (phone);
CREATE INDEX idx_customers_name ON public.customers (lower(name));

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage customers" ON public.customers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Appointment history (historical, from Setmore)
CREATE TABLE public.appointments_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_date date,
  appointment_time text,
  service text,
  cost numeric,
  team_member text,
  customer_name text,
  country_code text,
  phone text,
  email text,
  label text,
  status text,
  comments text,
  booking_id text,
  booked_via text,
  booked_on timestamptz,
  address text,
  city text,
  state text,
  country text,
  zipcode text,
  whatsapp text,
  cellphone text,
  source text DEFAULT 'setmore_import',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_appt_hist_date ON public.appointments_history (appointment_date DESC);
CREATE INDEX idx_appt_hist_email ON public.appointments_history (lower(email));
CREATE INDEX idx_appt_hist_phone ON public.appointments_history (phone);
CREATE INDEX idx_appt_hist_name ON public.appointments_history (lower(customer_name));
CREATE INDEX idx_appt_hist_booking_id ON public.appointments_history (booking_id);

ALTER TABLE public.appointments_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage appointments_history" ON public.appointments_history FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Payments history
CREATE TABLE public.payments_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_at timestamptz,
  customer text,
  team_member text,
  service text,
  service_at timestamptz,
  amount numeric,
  type text,
  mode text,
  status text,
  appt_type text,
  booking_id text,
  transaction_id text,
  gateway text,
  source text DEFAULT 'setmore_import',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pay_hist_date ON public.payments_history (payment_at DESC);
CREATE INDEX idx_pay_hist_customer ON public.payments_history (lower(customer));
CREATE INDEX idx_pay_hist_booking_id ON public.payments_history (booking_id);
CREATE INDEX idx_pay_hist_txn ON public.payments_history (transaction_id);

ALTER TABLE public.payments_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payments_history" ON public.payments_history FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));