-- Replace existing staff with the real team and their workdays in the bio column
DELETE FROM public.staff;
INSERT INTO public.staff (name, bio, active, display_order) VALUES
  ('Ana', 'Works Tuesdays–Sundays', true, 1),
  ('Johana', 'Off Thursdays & 1st Sunday Monthly', true, 2),
  ('Maryy', 'Works Mondays & Wednesdays', true, 3),
  ('Zuly', 'Works Thursdays – Sundays', true, 4),
  ('Angie', '', true, 5);