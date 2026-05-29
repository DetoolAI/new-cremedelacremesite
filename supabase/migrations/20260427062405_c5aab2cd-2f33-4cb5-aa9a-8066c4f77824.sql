-- 1. Link bookings to imported customers
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- 2. Indexes for fast customer matching
CREATE INDEX IF NOT EXISTS idx_customers_email_lower ON public.customers (lower(email));
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_cellphone ON public.customers (cellphone);

-- 3. Indexes for Customer 360 lookups
CREATE INDEX IF NOT EXISTS idx_appt_history_email_lower ON public.appointments_history (lower(email));
CREATE INDEX IF NOT EXISTS idx_appt_history_phone ON public.appointments_history (phone);
CREATE INDEX IF NOT EXISTS idx_appt_history_customer_lower ON public.appointments_history (lower(customer_name));
CREATE INDEX IF NOT EXISTS idx_appt_history_date ON public.appointments_history (appointment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_history_customer_lower ON public.payments_history (lower(customer));
CREATE INDEX IF NOT EXISTS idx_payments_history_date ON public.payments_history (payment_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_history_status ON public.payments_history (status);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_email_lower ON public.bookings (lower(customer_email));

-- 4. Lifetime-stats view per imported customer (joined by lowercased name + email)
CREATE OR REPLACE VIEW public.customer_lifetime_stats AS
SELECT
  c.id AS customer_id,
  c.name,
  c.email,
  c.phone,
  COALESCE(p.total_spent, 0)::numeric AS total_spent,
  COALESCE(p.visit_count, 0)::int AS visit_count,
  p.last_visit
FROM public.customers c
LEFT JOIN LATERAL (
  SELECT
    SUM(amount) FILTER (WHERE status IN ('Completed','Successful','Paid','completed','successful','paid')) AS total_spent,
    COUNT(*) AS visit_count,
    MAX(payment_at) AS last_visit
  FROM public.payments_history ph
  WHERE (
    (c.email IS NOT NULL AND lower(ph.customer) = lower(c.name))
    OR (c.name IS NOT NULL AND lower(ph.customer) = lower(c.name))
  )
) p ON TRUE;

-- View inherits RLS from underlying tables; admins can read
GRANT SELECT ON public.customer_lifetime_stats TO authenticated;