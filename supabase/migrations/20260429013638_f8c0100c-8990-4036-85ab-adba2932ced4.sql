
-- 1. Deactivate old services in affected categories
UPDATE public.services SET active = false
WHERE category_id IN (
  '306f94f3-443b-498e-b428-68b8e8b3859b',
  '8f2ee9d8-e521-4ba5-9987-d976e79e4b94',
  '8ac86698-c6a4-4284-9319-3cd632bd3444',
  'c5f1c2bc-5e3b-4e1c-b465-1f3d4337e227',
  '8a0e51dc-52a8-45c2-81f7-de63ae7c4b81',
  '7febbe46-fc9c-40e0-a1fb-ffeb70c8f9cd'
);

-- 2. Rename Combos -> Manicure Combinada
UPDATE public.service_categories
SET name = 'Manicure Combinada', slug = 'manicure-combinada',
    description = 'Russian Manicure paired with overlay or extension finishes'
WHERE id = '8ac86698-c6a4-4284-9319-3cd632bd3444';

-- 3. New categories
INSERT INTO public.service_categories (name, slug, description, display_order, active) VALUES
  ('Add-Ons / Para Agregar', 'add-ons', 'Optional add-ons for any service', 90, true),
  ('Nail Art', 'nail-art', 'Custom nail art and finishes', 95, true);

-- 4. Insert services using inline scalar subqueries
INSERT INTO public.services (category_id, name, description, duration_minutes, price_text, display_order, active) VALUES
-- Extensions & Acrylic
((SELECT id FROM public.service_categories WHERE slug='extensions'), 'Dip Powder Overlay', 'Healthy nail product creating a durable, protective layer; promotes nail health.', 60, '$52.00', 10, true),
((SELECT id FROM public.service_categories WHERE slug='extensions'), 'Rubber Gel Overlay', 'Adds thickness and strength directly on the natural nail.', 60, '$62.40', 20, true),
((SELECT id FROM public.service_categories WHERE slug='extensions'), 'Acrylic Back Fill', 'Strongest form of nail enhancement. Great for rougher hands or feet. Can be soak off.', 60, '$57.20–$62.40', 30, true),
((SELECT id FROM public.service_categories WHERE slug='extensions'), 'Builder Gel Overlay', 'Adds thickness and strength to natural nail or tips for extensions, refills, or directly on natural nail. Comes in clear and nude shades.', 60, '$72.80', 40, true),
((SELECT id FROM public.service_categories WHERE slug='extensions'), 'Acrylic Full Set', 'Strongest form of nail enhancement. Great for rougher hands or feet. Can be soak off.', 75, '$67.60–$81.12', 50, true),
((SELECT id FROM public.service_categories WHERE slug='extensions'), 'Poly Gel / Hard Gel Full Set', 'Strongest gel enhancement. Not soak-able like other enhancements; must be filed off.', 75, '$83.20', 60, true),
((SELECT id FROM public.service_categories WHERE slug='extensions'), 'Gel-X Extensions (Soft Gel Tips)', 'Full cover tip adhered to natural nail with a soak-able soft gel. Adds length, very natural and lightweight.', 75, '$83.20', 70, true),
((SELECT id FROM public.service_categories WHERE slug='extensions'), 'Baby Boomer / Ombre Full Set', 'Soft gradient style fading from pink or nude base to white tip; similar to French manicure but without the distinct white line.', 75, '$83.20', 80, true),

-- Manicure Combinada
((SELECT id FROM public.service_categories WHERE slug='manicure-combinada'), 'Russian Manicure (w/ Rubber Base Overlay)', 'Russian dry manicure paired with rubber base overlay.', 75, '$83.20', 10, true),
((SELECT id FROM public.service_categories WHERE slug='manicure-combinada'), 'Russian Manicure (w/ Acrylic)', 'Russian dry manicure paired with acrylic.', 75, '$88.40', 20, true),
((SELECT id FROM public.service_categories WHERE slug='manicure-combinada'), 'Russian Manicure (w/ Builder Gel Overlay)', 'Russian dry manicure paired with builder gel overlay.', 75, '$93.60', 30, true),
((SELECT id FROM public.service_categories WHERE slug='manicure-combinada'), 'Russian Manicure (w/ Hard or Poly Gel)', 'Russian dry manicure paired with hard or poly gel.', 90, '$104.00', 40, true),
((SELECT id FROM public.service_categories WHERE slug='manicure-combinada'), 'Russian Manicure (w/ Gel-X Extensions)', 'Russian dry manicure paired with Gel-X extensions.', 90, '$104.00', 50, true),

-- Add-Ons
((SELECT id FROM public.service_categories WHERE slug='add-ons'), 'Regular Hardener or Quick Dry', 'Optional add-on.', 10, '$2.08', 10, true),
((SELECT id FROM public.service_categories WHERE slug='add-ons'), 'Longer Lasting Base + Top', 'Optional add-on.', 10, '$5.20', 20, true),
((SELECT id FROM public.service_categories WHERE slug='add-ons'), 'Gel Protein', 'Optional add-on.', 15, '$8.31', 30, true),
((SELECT id FROM public.service_categories WHERE slug='add-ons'), 'Nail Repair', 'Optional add-on.', 15, '$4.16–$10.04', 40, true),
((SELECT id FROM public.service_categories WHERE slug='add-ons'), 'Ingrown Nail', 'Optional add-on.', 15, '$10.04', 50, true),
((SELECT id FROM public.service_categories WHERE slug='add-ons'), 'Gel Soak Off', 'Optional add-on.', 15, '$11.44', 60, true),
((SELECT id FROM public.service_categories WHERE slug='add-ons'), 'Hard Gel or Acrylic Soak Off', 'Optional add-on.', 20, '$20.80', 70, true),
((SELECT id FROM public.service_categories WHERE slug='add-ons'), 'Callus Remover', 'Optional add-on.', 20, '$11.44–$20.80', 80, true),
((SELECT id FROM public.service_categories WHERE slug='add-ons'), '20 Minutes Foot Massage', 'Optional add-on.', 20, '$26.00', 90, true),
((SELECT id FROM public.service_categories WHERE slug='add-ons'), 'Russian Deep Clean', 'Optional add-on.', 20, '$20.80–$31.20', 100, true),

-- Nail Art
((SELECT id FROM public.service_categories WHERE slug='nail-art'), 'French', 'Classic French tip nail art.', 20, '$15.60', 10, true),
((SELECT id FROM public.service_categories WHERE slug='nail-art'), 'Chrome or Cat Eyes', 'Chrome or cat-eye finish.', 20, '$15.60', 20, true),
((SELECT id FROM public.service_categories WHERE slug='nail-art'), 'Hand Painted', 'Custom hand-painted nail art.', 30, '$20.80–$52.00', 30, true),
((SELECT id FROM public.service_categories WHERE slug='nail-art'), 'Hybrid Techniques', 'Combination of advanced nail art techniques.', 45, '$36.40–$67.60', 40, true),

-- Color Only & Repairs (Polish Change Only / Cambio de Color)
((SELECT id FROM public.service_categories WHERE slug='color-repairs'), 'Hands - Solid Color', 'Polish change only, hands.', 20, '$10.40', 10, true),
((SELECT id FROM public.service_categories WHERE slug='color-repairs'), 'Feet - Solid Color', 'Polish change only, feet.', 20, '$15.60', 20, true),
((SELECT id FROM public.service_categories WHERE slug='color-repairs'), 'Hands - Longer Lasting Regular', 'Longer lasting regular polish change, hands.', 25, '$20.80', 30, true),
((SELECT id FROM public.service_categories WHERE slug='color-repairs'), 'Feet - Longer Lasting Regular', 'Longer lasting regular polish change, feet.', 25, '$26.00', 40, true),
((SELECT id FROM public.service_categories WHERE slug='color-repairs'), 'Hands - Gel Polish', 'Gel polish change, hands.', 30, '$25.00', 50, true),
((SELECT id FROM public.service_categories WHERE slug='color-repairs'), 'Feet - Gel Polish', 'Gel polish change, feet.', 30, '$31.20', 60, true),

-- Kids
((SELECT id FROM public.service_categories WHERE slug='kids'), 'Kids Manicure', 'Manicure for kids 2-10 years.', 30, '$12.48', 10, true),
((SELECT id FROM public.service_categories WHERE slug='kids'), 'Kids Pedicure', 'Pedicure for kids 2-10 years.', 30, '$20.80', 20, true),
((SELECT id FROM public.service_categories WHERE slug='kids'), 'Kids Mani & Pedi', 'Mani + pedi combo for kids 2-10 years.', 45, '$31.20', 30, true),
((SELECT id FROM public.service_categories WHERE slug='kids'), 'Kids Mani & Pedi + 2 Stickers', 'Mani + pedi combo with 2 stickers for kids 2-10 years.', 45, '$37.44', 40, true),
((SELECT id FROM public.service_categories WHERE slug='kids'), 'Kids Gel Mani & Gel Pedi', 'Gel mani + gel pedi for kids 2-10 years.', 60, '$52.00', 50, true),

-- Waxing
((SELECT id FROM public.service_categories WHERE slug='waxing'), 'Lips Waxing', 'Lip waxing.', 15, '$8.32', 10, true),
((SELECT id FROM public.service_categories WHERE slug='waxing'), 'Chin Waxing', 'Chin waxing.', 15, '$8.32', 20, true),
((SELECT id FROM public.service_categories WHERE slug='waxing'), 'Eyebrow Waxing', 'Eyebrow waxing.', 15, '$10.40', 30, true),
((SELECT id FROM public.service_categories WHERE slug='waxing'), 'Underarms Waxing', 'Underarm waxing.', 20, '$20.80', 40, true);

-- 5. Assign all active staff to all active services lacking assignments
INSERT INTO public.service_staff (service_id, staff_id)
SELECT s.id, st.id
FROM public.services s
CROSS JOIN public.staff st
WHERE s.active = true
  AND st.active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.service_staff ss WHERE ss.service_id = s.id AND ss.staff_id = st.id
  );
