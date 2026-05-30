-- Ensure the Manicures category exists with its fixed UUID
INSERT INTO public.service_categories (id, name, slug, display_order, active)
VALUES ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Manicures', 'manicures', 10, true)
ON CONFLICT (id) DO NOTHING;

-- Refresh the Manicures category with the current Square catalog
DELETE FROM public.services
WHERE category_id = 'dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4';

INSERT INTO public.services (category_id, name, duration_minutes, price_text, active, display_order) VALUES
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', '✨ Russian Regular Polish Manicure', 40, '$35', true, 10),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Essie Twist 7-Day Manicure', 25, '$23', true, 20),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Dazzle Dry Manicure', 20, '$25', true, 30),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Gel Manicure', 30, '$35', true, 40),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Gel Manicure + Gel Soak Off 🏅', 40, '$40', true, 50),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Gel Mani + Acrylic Soak Off', 60, '$46', true, 60),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', '🍋 Protein/Hardener Gel Manicure', 40, '$40', true, 70),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Russian Gel Manicure', 60, '$60', true, 80),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', '🌸 Gel Mani Soak + Microfrench', 60, '$45', true, 90),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Hard Gel Soak + Builder Overlay', 100, '$90', true, 100),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', '🍁 Builder Gel Overlay Russian Manicure', 90, '$90', true, 110),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', '🍁 Rubber/Builder Gel Overlay Russian Manicure', 80, '$85', true, 120),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Gel French Manicure', 40, '$41', true, 130),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Hard Gel Soak + Gel Mani', 60, '$52', true, 140),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', '🍋 Russian Gel Manicure', 60, '$60', true, 150),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', '🍁 Protein/Hardener Gel Mani + Gsoak', 60, '$46', true, 160),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Buff Man-i-cure', 30, '$25', true, 170),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Buff Man-i-cure + Gel Soak', 30, '$31', true, 180),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Reg Manicure + Gel Soak', 35, '$26', true, 190),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'French Manicure Reg. Polish', 30, '$26', true, 200),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Reg Manicure + 10-Min Massage', 30, '$31', true, 210),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Powder Gel/SNS Dip', 40, '$43', true, 220),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Powder Gel/SNS Dip + Soak', 60, '$54', true, 230),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Hard Gel Soak + Gel Manicure', 70, '$55', true, 240),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Gel French Mani + Gel Soak', 60, '$47', true, 250),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Chrome Gel Mani', 60, '$50', true, 260),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Russian Protein Gel 🏅', 60, '$66', true, 270),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Gel Mani + Cat Eye', 50, '$50', true, 280),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Gel Mani + Soak + Collagen Gloves', 60, '$50', true, 290),
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Acrylic Soak + Gel Mani', 60, '$43', true, 300);