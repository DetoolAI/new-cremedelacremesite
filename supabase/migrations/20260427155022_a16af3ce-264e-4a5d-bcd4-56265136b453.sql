-- Memberships table tracks Square Subscriptions for the Crème Society membership
CREATE TABLE public.memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_first_name TEXT NOT NULL,
  customer_last_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_postal_code TEXT,
  billing_country TEXT DEFAULT 'US',
  tier_name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL,
  square_customer_id TEXT,
  square_card_id TEXT,
  square_subscription_id TEXT,
  square_plan_variation_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Anyone can enroll (public form). Server route uses service role anyway,
-- but we keep a sane permissive INSERT policy with input length guards.
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
);

CREATE POLICY "Admins view all memberships"
ON public.memberships
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update memberships"
ON public.memberships
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete memberships"
ON public.memberships
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_memberships_email ON public.memberships(customer_email);
CREATE INDEX idx_memberships_status ON public.memberships(status);
CREATE INDEX idx_memberships_square_subscription_id ON public.memberships(square_subscription_id);