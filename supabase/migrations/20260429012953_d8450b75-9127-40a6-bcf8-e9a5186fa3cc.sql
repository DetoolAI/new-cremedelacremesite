-- 1. Deactivate ALL existing services in Manicures and Pedicures categories
UPDATE public.services
SET active = false
WHERE category_id IN (
  SELECT id FROM public.service_categories WHERE slug IN ('manicures', 'pedicures')
);

-- 2. Insert the new Manicure services from the menu
WITH cat AS (SELECT id FROM public.service_categories WHERE slug = 'manicures')
INSERT INTO public.services (category_id, name, duration_minutes, price_text, display_order, active)
SELECT cat.id, v.name, v.dur, v.price, v.ord, true
FROM cat, (VALUES
  ('Regular Manicure',                  30, '$20.80', 10),
  ('7 Days Manicure',                   30, '$23.92', 20),
  ('Buff & Shine Manicure',             30, '$26.00', 30),
  ('Dazzle Dry Manicure',               30, '$26.00', 40),
  ('Gel Manicure',                      40, '$36.40', 50),
  ('Protein Gel Manicure',              45, '$41.60', 60),
  ('Gel Manicure + Soak-Off',           50, '$41.60', 70),
  ('Luxurious Deluxe Spa Manicure',     60, '$52.00', 80),
  ('Russian Manicure',                  60, '$62.40', 90)
) AS v(name, dur, price, ord);

-- 3. Insert the new Pedicure services from the menu
WITH cat AS (SELECT id FROM public.service_categories WHERE slug = 'pedicures')
INSERT INTO public.services (category_id, name, duration_minutes, price_text, display_order, active)
SELECT cat.id, v.name, v.dur, v.price, v.ord, true
FROM cat, (VALUES
  ('Regular Pedicure',                   45, '$36.40',  10),
  ('Color Gel Pedicure',                 50, '$43.68',  20),
  ('Dazzle Dry Pedicure',                50, '$46.80',  30),
  ('Tired Feet Pedicure',                55, '$46.80',  40),
  ('Ingrown Pedicure',                   55, '$46.80',  50),
  ('Callus Remover Pedicure',            60, '$47.84',  60),
  ('Color Gel Pedicure & Soak-Off',      60, '$49.92',  70),
  ('Spa Pedicure',                       60, '$57.20',  80),
  ('Spa Deluxe Pedicure',                70, '$67.60',  90),
  ('Russian Dry Pedicure',               75, '$72.80', 100),
  ('Spa Deluxe Premium Gel Pedicure',    80, '$80.08', 110),
  ('Russian Spa Deluxe Pedicure',        90, '$98.08', 120)
) AS v(name, dur, price, ord);

-- 4. Clear old service_staff assignments for the deactivated services in these two categories
DELETE FROM public.service_staff
WHERE service_id IN (
  SELECT s.id FROM public.services s
  JOIN public.service_categories c ON c.id = s.category_id
  WHERE c.slug IN ('manicures', 'pedicures') AND s.active = false
);

-- 5. Assign ALL active staff to ALL the newly inserted (active) services in these two categories
INSERT INTO public.service_staff (service_id, staff_id)
SELECT s.id, st.id
FROM public.services s
JOIN public.service_categories c ON c.id = s.category_id
CROSS JOIN public.staff st
WHERE c.slug IN ('manicures', 'pedicures')
  AND s.active = true
  AND st.active = true
ON CONFLICT DO NOTHING;