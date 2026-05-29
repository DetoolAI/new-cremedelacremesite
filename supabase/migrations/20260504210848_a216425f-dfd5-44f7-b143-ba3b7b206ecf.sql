ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS customer_initials TEXT,
  ADD COLUMN IF NOT EXISTS signature_data_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- Update insert policy to allow the new fields and require signature presence
DROP POLICY IF EXISTS "Anyone can create a membership enrollment" ON public.memberships;
CREATE POLICY "Anyone can create a membership enrollment"
ON public.memberships
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(customer_first_name) BETWEEN 1 AND 100
  AND char_length(customer_last_name) BETWEEN 1 AND 100
  AND char_length(customer_email) BETWEEN 3 AND 255
  AND char_length(customer_phone) BETWEEN 5 AND 50
  AND char_length(tier_name) BETWEEN 1 AND 100
  AND monthly_price_cents > 0
  AND monthly_price_cents <= 100000
  AND (notes IS NULL OR char_length(notes) <= 2000)
  AND (customer_initials IS NULL OR char_length(customer_initials) BETWEEN 1 AND 10)
  AND (signature_data_url IS NULL OR char_length(signature_data_url) <= 200000)
);
