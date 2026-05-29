
-- Reset working days to match the new schedules
UPDATE public.staff SET work_days = ARRAY[0,2,3,4,5,6]::int[] WHERE name = 'Ana';
UPDATE public.staff SET work_days = ARRAY[1,4,5]::int[]       WHERE name = 'Angie';
UPDATE public.staff SET work_days = ARRAY[0,1,2,3,5,6]::int[] WHERE name = 'Johana';
UPDATE public.staff SET work_days = ARRAY[1,3]::int[]         WHERE name = 'Mary';
UPDATE public.staff SET work_days = ARRAY[0,1,4,5,6]::int[]   WHERE name = 'Zuly';

-- Wipe existing schedule + time-off rows
DELETE FROM public.staff_schedule;
DELETE FROM public.staff_time_off;

-- Insert clean single-block schedules
WITH s AS (SELECT id, name FROM public.staff)
INSERT INTO public.staff_schedule (staff_id, day_of_week, start_time, end_time)
SELECT s.id, x.dow, x.st::time, x.et::time
FROM s
JOIN (VALUES
  ('Ana', 0, '10:00', '18:00'),
  ('Ana', 2, '10:00', '19:00'),
  ('Ana', 3, '10:00', '19:00'),
  ('Ana', 4, '10:00', '19:00'),
  ('Ana', 5, '10:00', '19:00'),
  ('Ana', 6, '10:00', '19:00'),
  ('Angie', 1, '12:30', '19:00'),
  ('Angie', 4, '11:00', '19:00'),
  ('Angie', 5, '11:00', '19:00'),
  ('Johana', 0, '10:00', '18:00'),
  ('Johana', 1, '10:00', '19:00'),
  ('Johana', 2, '10:00', '19:00'),
  ('Johana', 3, '10:00', '19:00'),
  ('Johana', 5, '10:00', '19:00'),
  ('Johana', 6, '10:00', '19:00'),
  ('Mary', 1, '10:00', '19:00'),
  ('Mary', 3, '10:00', '19:00'),
  ('Zuly', 0, '10:00', '18:00'),
  ('Zuly', 1, '10:00', '19:00'),
  ('Zuly', 4, '10:00', '19:00'),
  ('Zuly', 5, '10:00', '19:00'),
  ('Zuly', 6, '10:00', '19:00')
) AS x(name, dow, st, et) ON x.name = s.name;
