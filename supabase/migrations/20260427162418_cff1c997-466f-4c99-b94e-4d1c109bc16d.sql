ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS square_booking_id text,
  ADD COLUMN IF NOT EXISTS square_team_member_id text,
  ADD COLUMN IF NOT EXISTS square_sync_error text;