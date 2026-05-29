CREATE UNIQUE INDEX IF NOT EXISTS bookings_no_overlap_specific_staff
ON public.bookings (staff_id, appointment_date, appointment_time)
WHERE staff_id IS NOT NULL
  AND status IN ('confirmed', 'pending', 'checked_in');