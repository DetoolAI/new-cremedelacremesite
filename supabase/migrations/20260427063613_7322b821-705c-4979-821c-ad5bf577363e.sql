ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deposit_amount_cents integer,
  ADD COLUMN IF NOT EXISTS deposit_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS square_payment_id text;

CREATE INDEX IF NOT EXISTS idx_bookings_square_payment_id ON public.bookings(square_payment_id) WHERE square_payment_id IS NOT NULL;