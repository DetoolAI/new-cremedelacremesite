-- Seed all base service categories with fixed UUIDs so later migrations can reference them.
INSERT INTO public.service_categories (id, name, slug, display_order, active) VALUES
  ('dc8ed095-e498-4ee3-bae4-15cb8a0ddfc4', 'Manicures',                   'manicures',          10,  true),
  ('306f94f3-443b-498e-b428-68b8e8b3859b', 'Pedicures',                   'pedicures',          20,  true),
  ('8f2ee9d8-e521-4ba5-9987-d976e79e4b94', 'Extensions & Acrylic',        'extensions',         30,  true),
  ('8ac86698-c6a4-4284-9319-3cd632bd3444', 'Combos',                      'mani-pedi-combos',   40,  true),
  ('c5f1c2bc-5e3b-4e1c-b465-1f3d4337e227', 'Color & Repairs',             'color-repairs',      50,  true),
  ('8a0e51dc-52a8-45c2-81f7-de63ae7c4b81', 'Kids',                        'kids',               60,  true),
  ('7febbe46-fc9c-40e0-a1fb-ffeb70c8f9cd', 'Waxing',                      'waxing',             70,  true)
ON CONFLICT (id) DO NOTHING;
