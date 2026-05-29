DROP VIEW IF EXISTS public.customer_lifetime_stats;

CREATE VIEW public.customer_lifetime_stats
WITH (security_invoker = true) AS
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
  WHERE c.name IS NOT NULL AND lower(ph.customer) = lower(c.name)
) p ON TRUE;

GRANT SELECT ON public.customer_lifetime_stats TO authenticated;