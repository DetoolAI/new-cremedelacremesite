
-- 1. Strip emojis from existing service names (also collapse whitespace)
UPDATE public.services
SET name = trim(regexp_replace(regexp_replace(name, '[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF]', '', 'g'), '\s+', ' ', 'g'))
WHERE name ~ '[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF]';

UPDATE public.service_categories
SET name = trim(regexp_replace(regexp_replace(name, '[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF]', '', 'g'), '\s+', ' ', 'g'))
WHERE name ~ '[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF]';

-- 2. Fix address in page_content (remove "#" before 189ST everywhere it appears)
UPDATE public.page_content
SET value = (replace(replace(value::text, '#189ST', '189ST'), '%23189ST', '189ST'))::jsonb
WHERE value::text LIKE '%189ST%';

-- 3. Create Manicure & Pedicure Combos category
INSERT INTO public.service_categories (slug, name, description, display_order, active)
VALUES ('mani-pedi-combos', 'Manicure & Pedicure Combos', 'Bundled manicure + pedicure packages for the full Crème experience.', 6, true)
ON CONFLICT DO NOTHING;

-- 4. Add the combo services
DO $$
DECLARE
  cat_id uuid;
  combo record;
BEGIN
  SELECT id INTO cat_id FROM public.service_categories WHERE slug='mani-pedi-combos';
  IF cat_id IS NULL THEN RAISE EXCEPTION 'combo cat not found'; END IF;

  FOR combo IN
    SELECT * FROM (VALUES
      ('Russian Builder Gel Mani + Cateye + Gel Pedi + Soak', 153, 150),
      ('Gel-X Extensions + Dazzle Pedicure', 120, 120),
      ('Deluxe Premium Pedi Soak + Gel Mani Soak', 123, 120),
      ('Hard Gel Soak Off + Manicure + Regular', 70, 90),
      ('Regular Manicure & Pedicure', 50, 75),
      ('Reg Mani & Pedi + 1 Gel Soak', 56, 80),
      ('Buff Manicure + Reg Pedicure', 56, 75),
      ('Buff Manicure + Buff Pedicure', 62, 80),
      ('Regular Manicure & Ingrown Reg Pedicure', 60, 90),
      ('Reg Manicure + Callus Remover Pedi', 61, 90),
      ('Dazzle Dry Mani & Pedi + Callus', 71, 90),
      ('Mani + Pedi + 20min Massage', 75, 100),
      ('Gel Mani + 1 Soak + Reg Pedi', 75, 90),
      ('Gel Mani + Callus Remover Pedi', 81, 100),
      ('Protein Gel Mani + Reg Pedi + Gel Soak', 81, 100),
      ('Builder Gel Overlay + Reg Pedi', 105, 120),
      ('Builder Gel Overlay + Gel Pedi + Soak', 118, 130),
      ('Premium Spa Pedi Soak + Gel Mani + Soak', 123, 130),
      ('Russian Gel Overlay + Callus Gel Pedi + 1 G Soak + Mid Art', 179, 150),
      ('Russian Builder Gel Overlay + Callus Gel Pedi + 1 G Soak', 149, 140),
      ('Acrylic Soak / Full Set / Art + Reg Pedi', 146, 140),
      ('Russian Builder Overlay + Spa Premium Gel Pedi', 173, 150),
      ('Acrylic Cover Fill + Mid Art + Gel Pedi w/ Soak', 143, 140),
      ('Ingrown Gel Pedi + Gel Mani + Acrylic Soak', 104, 120),
      ('7 Days Essie Twist Mani + Pedi', 56, 80),
      ('Acrylic Full-Set + Gel Pedi', 107, 130),
      ('Russian Builder Gel with Mid Art + Gel Pedi', 168, 150),
      ('Russian Hard Gel Mani + Russian Gel Pedi', 170, 150),
      ('Builder Gel Russian Manicure + Russian Pedi', 160, 150),
      ('Gel Mani + Callus Gel Pedi + 20min Massage', 106, 120),
      ('Russian Mani w/ Builder Gel + Reg Pedi', 125, 130),
      ('Acrylic Refill Russian Manicure + Reg Pedi', 110, 130),
      ('Rubber/Builder Gel Overlay + Ingrown Reg Pedi', 115, 130),
      ('Acrylic Refill + Ingrown Pedi', 100, 120),
      ('Russian Gel Mani + Russian Pedi', 130, 140),
      ('Russian Gel Mani & Russian Gel Pedi', 130, 140),
      ('Russian Gel Mani & Spa Deluxe Premium Pedi', 130, 140),
      ('Gel-X Extension Russian Manicure + Gel Pedi + Soak', 148, 150),
      ('Acrylic Backfill Russian Manicure + Gel Pedi + Soak', 123, 140),
      ('Russian Mani w/ Builder Gel + Gel Pedi + Soak', 138, 140),
      ('$60 Dazzle Dry Mani & Pedi Special', 60, 80),
      ('Gel Mani + Gel Pedi', 77, 100),
      ('Spa Premium Gel Pedi + Gel Mani', 109, 120),
      ('Gel Mani + Reg Pedicure', 70, 90),
      ('Gel Mani 1 Soak + Callus Pedicure', 86, 110),
      ('Gel Mani + 1 Soak + Gel Pedi', 82, 100),
      ('Gel Manicure + 2 Soaks + Gel Pedicure', 88, 110),
      ('Acrylic Refill + Reg Pedi', 95, 110),
      ('Ingrown Callus Gel Pedi + Gel Mani (2 Soaks)', 107, 120),
      ('Rubber Gel Overlay + Gel Pedi + 1 G Soak', 108, 120),
      ('Rubber Gel Overlay + Callus Gel Pedi + 1 G Soak', 119, 130),
      ('Builder Removal + Overlay + Gel Pedi + Soak', 138, 140),
      ('Spa Deluxe Pedi & Reg Mani', 85, 100),
      ('Baby Boomer (Ombre) + Gel Pedi + Soak', 128, 130),
      ('Gel-X Full Set + Gel Pedicure', 122, 130),
      ('Powder Gel / SNS Dip + Soak + Reg Pedicure', 89, 110),
      ('Powder Gel / SNS Dip + Soak + Spa Pedicure', 109, 120),
      ('Powder Gel / SNS Dip + Gel Pedicure + Soak', 96, 120),
      ('Acrylic Refill + Tired Feet Pedi', 101, 120),
      ('Acrylic Refill + Gel Pedi + G Soak', 103, 120),
      ('Nude Acrylic Cover Refill + Spa Premium Pedi', 137, 140),
      ('Acrylic Refill + Spa Pedicure', 110, 130),
      ('Acrylic Full Set + Gel Pedi + G Soak', 113, 140),
      ('Acrylic Full Set + Art + Reg Pedi', 130, 140),
      ('Acrylic Full Set + Art + Gel Pedi + G Soak', 143, 150),
      ('Nude Acrylic Cover Set + Spa Premium Gel Pedi', 147, 150),
      ('Hard Gel Overlay + Gel Pedi', 128, 130)
    ) AS t(svc_name, price, duration)
  LOOP
    INSERT INTO public.services (category_id, name, price_text, duration_minutes, active, display_order)
    VALUES (cat_id, combo.svc_name, '$' || combo.price, combo.duration, true, 0)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Assign all 5 active staff to all combo services
  INSERT INTO public.service_staff (service_id, staff_id)
  SELECT s.id, st.id
  FROM public.services s
  CROSS JOIN public.staff st
  WHERE s.category_id = cat_id AND st.active = true
  ON CONFLICT DO NOTHING;
END $$;
