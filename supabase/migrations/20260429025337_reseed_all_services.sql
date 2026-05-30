-- Re-seed all services after the DELETE FROM public.services in 20260429025336.
-- Data sourced from migrations 20260429012953 and 20260429013638.

-- MANICURES
INSERT INTO public.services (category_id, name, duration_minutes, price_text, display_order, active)
SELECT c.id, v.name, v.dur, v.price, v.ord, true
FROM public.service_categories c, (VALUES
  ('Regular Manicure',                  30, '$20.80',  10),
  ('7 Days Manicure',                   30, '$23.92',  20),
  ('Buff & Shine Manicure',             30, '$26.00',  30),
  ('Dazzle Dry Manicure',               30, '$26.00',  40),
  ('Gel Manicure',                      30, '$36.40',  50),
  ('Protein Gel Manicure',              45, '$41.60',  60),
  ('Gel Manicure + Soak-Off',           50, '$41.60',  70),
  ('Luxurious Deluxe Spa Manicure',     60, '$52.00',  80),
  ('Russian Manicure',                  60, '$62.40',  90)
) AS v(name, dur, price, ord)
WHERE c.slug = 'manicures';

-- PEDICURES
INSERT INTO public.services (category_id, name, duration_minutes, price_text, display_order, active)
SELECT c.id, v.name, v.dur, v.price, v.ord, true
FROM public.service_categories c, (VALUES
  ('Regular Pedicure',                   30, '$36.40',  10),
  ('Color Gel Pedicure',                 50, '$43.68',  20),
  ('Dazzle Dry Pedicure',                50, '$46.80',  30),
  ('Tired Feet Pedicure',                55, '$46.80',  40),
  ('Ingrown Pedicure',                   50, '$46.80',  50),
  ('Callus Remover Pedicure',            40, '$47.84',  60),
  ('Color Gel Pedicure & Soak-Off',      60, '$49.92',  70),
  ('Spa Pedicure',                       60, '$57.20',  80),
  ('Spa Deluxe Pedicure',                60, '$67.60',  90),
  ('Russian Dry Pedicure',               75, '$72.80', 100),
  ('Spa Deluxe Premium Gel Pedicure',    80, '$80.08', 110),
  ('Russian Spa Deluxe Pedicure',        90, '$98.08', 120)
) AS v(name, dur, price, ord)
WHERE c.slug = 'pedicures';

-- EXTENSIONS & ACRYLIC
INSERT INTO public.services (category_id, name, description, duration_minutes, price_text, display_order, active)
SELECT c.id, v.name, v.descr, v.dur, v.price, v.ord, true
FROM public.service_categories c, (VALUES
  ('Dip Powder Overlay',           'Healthy nail product creating a durable, protective layer; promotes nail health.',                                                                      60, '$52.00',         10),
  ('Rubber Gel Overlay',           'Adds thickness and strength directly on the natural nail.',                                                                                            60, '$62.40',         20),
  ('Acrylic Back Fill',            'Strongest form of nail enhancement. Great for rougher hands or feet. Can be soak off.',                                                                60, '$57.20–$62.40',  30),
  ('Builder Gel Overlay',          'Adds thickness and strength to natural nail or tips for extensions, refills, or directly on natural nail. Comes in clear and nude shades.',           60, '$72.80',         40),
  ('Acrylic Full Set',             'Strongest form of nail enhancement. Great for rougher hands or feet. Can be soak off.',                                                                75, '$67.60–$81.12',  50),
  ('Poly Gel / Hard Gel Full Set', 'Strongest gel enhancement. Not soak-able like other enhancements; must be filed off.',                                                                 75, '$83.20',         60),
  ('Gel-X Extensions (Soft Gel Tips)', 'Full cover tip adhered to natural nail with a soak-able soft gel. Adds length, very natural and lightweight.',                                    75, '$83.20',         70),
  ('Baby Boomer / Ombre Full Set', 'Soft gradient style fading from pink or nude base to white tip; similar to French manicure but without the distinct white line.',                     75, '$83.20',         80)
) AS v(name, descr, dur, price, ord)
WHERE c.slug = 'extensions';

-- MANICURE COMBINADA
INSERT INTO public.services (category_id, name, description, duration_minutes, price_text, display_order, active)
SELECT c.id, v.name, v.descr, v.dur, v.price, v.ord, true
FROM public.service_categories c, (VALUES
  ('Russian Manicure (w/ Rubber Base Overlay)',  'Russian dry manicure paired with rubber base overlay.',     75, '$83.20',  10),
  ('Russian Manicure (w/ Acrylic)',              'Russian dry manicure paired with acrylic.',                 75, '$88.40',  20),
  ('Russian Manicure (w/ Builder Gel Overlay)',  'Russian dry manicure paired with builder gel overlay.',     75, '$93.60',  30),
  ('Russian Manicure (w/ Hard or Poly Gel)',     'Russian dry manicure paired with hard or poly gel.',        90, '$104.00', 40),
  ('Russian Manicure (w/ Gel-X Extensions)',     'Russian dry manicure paired with Gel-X extensions.',        90, '$104.00', 50)
) AS v(name, descr, dur, price, ord)
WHERE c.slug = 'manicure-combinada';

-- ADD-ONS
INSERT INTO public.services (category_id, name, description, duration_minutes, price_text, display_order, active)
SELECT c.id, v.name, v.descr, v.dur, v.price, v.ord, true
FROM public.service_categories c, (VALUES
  ('Regular Hardener or Quick Dry',  'Optional add-on.', 10, '$2.08',          10),
  ('Longer Lasting Base + Top',      'Optional add-on.', 10, '$5.20',          20),
  ('Gel Protein',                    'Optional add-on.', 15, '$8.31',          30),
  ('Nail Repair',                    'Optional add-on.', 15, '$4.16–$10.04',   40),
  ('Ingrown Nail',                   'Optional add-on.', 15, '$10.04',         50),
  ('Gel Soak Off',                   'Optional add-on.', 15, '$11.44',         60),
  ('Hard Gel or Acrylic Soak Off',   'Optional add-on.', 20, '$20.80',         70),
  ('Callus Remover',                 'Optional add-on.', 20, '$11.44–$20.80',  80),
  ('20 Minutes Foot Massage',        'Optional add-on.', 20, '$26.00',         90),
  ('Russian Deep Clean',             'Optional add-on.', 20, '$20.80–$31.20', 100)
) AS v(name, descr, dur, price, ord)
WHERE c.slug = 'add-ons';

-- NAIL ART
INSERT INTO public.services (category_id, name, description, duration_minutes, price_text, display_order, active)
SELECT c.id, v.name, v.descr, v.dur, v.price, v.ord, true
FROM public.service_categories c, (VALUES
  ('French',              'Classic French tip nail art.',                          20, '$15.60',          10),
  ('Chrome or Cat Eyes',  'Chrome or cat-eye finish.',                             20, '$15.60',          20),
  ('Hand Painted',        'Custom hand-painted nail art.',                         30, '$20.80–$52.00',   30),
  ('Hybrid Techniques',   'Combination of advanced nail art techniques.',          45, '$36.40–$67.60',   40)
) AS v(name, descr, dur, price, ord)
WHERE c.slug = 'nail-art';

-- COLOR & REPAIRS
INSERT INTO public.services (category_id, name, description, duration_minutes, price_text, display_order, active)
SELECT c.id, v.name, v.descr, v.dur, v.price, v.ord, true
FROM public.service_categories c, (VALUES
  ('Hands - Solid Color',               'Polish change only, hands.',                      20, '$10.40', 10),
  ('Feet - Solid Color',                'Polish change only, feet.',                       20, '$15.60', 20),
  ('Hands - Longer Lasting Regular',    'Longer lasting regular polish change, hands.',    25, '$20.80', 30),
  ('Feet - Longer Lasting Regular',     'Longer lasting regular polish change, feet.',     25, '$26.00', 40),
  ('Hands - Gel Polish',                'Gel polish change, hands.',                       30, '$25.00', 50),
  ('Feet - Gel Polish',                 'Gel polish change, feet.',                        30, '$31.20', 60)
) AS v(name, descr, dur, price, ord)
WHERE c.slug = 'color-repairs';

-- KIDS
INSERT INTO public.services (category_id, name, description, duration_minutes, price_text, display_order, active)
SELECT c.id, v.name, v.descr, v.dur, v.price, v.ord, true
FROM public.service_categories c, (VALUES
  ('Kids Manicure',              'Manicure for kids 2-10 years.',                          30, '$12.48', 10),
  ('Kids Pedicure',              'Pedicure for kids 2-10 years.',                          30, '$20.80', 20),
  ('Kids Mani & Pedi',           'Mani + pedi combo for kids 2-10 years.',                 45, '$31.20', 30),
  ('Kids Mani & Pedi + 2 Stickers', 'Mani + pedi combo with 2 stickers for kids 2-10 years.', 45, '$37.44', 40),
  ('Kids Gel Mani & Gel Pedi',   'Gel mani + gel pedi for kids 2-10 years.',               60, '$52.00', 50)
) AS v(name, descr, dur, price, ord)
WHERE c.slug = 'kids';

-- WAXING
INSERT INTO public.services (category_id, name, description, duration_minutes, price_text, display_order, active)
SELECT c.id, v.name, v.descr, v.dur, v.price, v.ord, true
FROM public.service_categories c, (VALUES
  ('Lips Waxing',        'Lip waxing.',        15, '$8.32',  10),
  ('Chin Waxing',        'Chin waxing.',        15, '$8.32',  20),
  ('Eyebrow Waxing',     'Eyebrow waxing.',     15, '$10.40', 30),
  ('Underarms Waxing',   'Underarm waxing.',    20, '$20.80', 40)
) AS v(name, descr, dur, price, ord)
WHERE c.slug = 'waxing';

-- Assign all active staff to all newly inserted services
INSERT INTO public.service_staff (service_id, staff_id)
SELECT s.id, st.id
FROM public.services s
CROSS JOIN public.staff st
WHERE s.active = true
  AND st.active = true
  AND s.category_id IN (
    SELECT id FROM public.service_categories
    WHERE slug IN ('manicures','pedicures','extensions','manicure-combinada','add-ons','nail-art','color-repairs','kids','waxing')
  )
ON CONFLICT DO NOTHING;
