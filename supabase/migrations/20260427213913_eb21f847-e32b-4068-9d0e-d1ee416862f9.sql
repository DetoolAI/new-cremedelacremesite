-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ LOYALTY ACCOUNTS ============
CREATE TABLE public.loyalty_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  phone TEXT,
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_redeemed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_accounts_email_lower ON public.loyalty_accounts (LOWER(email));

ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view loyalty accounts"
  ON public.loyalty_accounts FOR SELECT
  USING (true);

CREATE POLICY "Admins manage loyalty accounts"
  ON public.loyalty_accounts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert loyalty accounts"
  ON public.loyalty_accounts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update loyalty accounts"
  ON public.loyalty_accounts FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_loyalty_accounts_updated_at
  BEFORE UPDATE ON public.loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ LOYALTY TRANSACTIONS ============
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.loyalty_accounts(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'adjusted')),
  reason TEXT,
  booking_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_tx_account ON public.loyalty_transactions (account_id, created_at DESC);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view loyalty transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (true);

CREATE POLICY "Admins manage loyalty transactions"
  ON public.loyalty_transactions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert loyalty transactions"
  ON public.loyalty_transactions FOR INSERT
  WITH CHECK (true);

-- ============ LOYALTY REWARDS CATALOG ============
CREATE TABLE public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  discount_amount_cents INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rewards"
  ON public.loyalty_rewards FOR SELECT
  USING (active = true);

CREATE POLICY "Admins manage rewards"
  ON public.loyalty_rewards FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_loyalty_rewards_updated_at
  BEFORE UPDATE ON public.loyalty_rewards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ AUTO-AWARD POINTS ON BOOKING ============
CREATE OR REPLACE FUNCTION public.award_loyalty_point_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_full_name TEXT;
BEGIN
  IF NEW.customer_email IS NULL OR TRIM(NEW.customer_email) = '' THEN
    RETURN NEW;
  END IF;

  v_full_name := TRIM(CONCAT(NEW.customer_first_name, ' ', NEW.customer_last_name));

  -- Upsert account
  INSERT INTO public.loyalty_accounts (email, customer_name, phone, points_balance, lifetime_earned)
  VALUES (LOWER(NEW.customer_email), v_full_name, NEW.customer_phone, 1, 1)
  ON CONFLICT (email) DO UPDATE
  SET points_balance = public.loyalty_accounts.points_balance + 1,
      lifetime_earned = public.loyalty_accounts.lifetime_earned + 1,
      customer_name = COALESCE(NULLIF(v_full_name, ''), public.loyalty_accounts.customer_name),
      phone = COALESCE(NEW.customer_phone, public.loyalty_accounts.phone)
  RETURNING id INTO v_account_id;

  -- Log transaction
  INSERT INTO public.loyalty_transactions (account_id, points, type, reason, booking_id)
  VALUES (v_account_id, 1, 'earned', 'Booking: ' || COALESCE(NEW.service_name, 'service'), NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_loyalty_on_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_point_on_booking();

-- ============ SEED REWARDS ============
INSERT INTO public.loyalty_rewards (name, description, points_required, discount_amount_cents, display_order)
VALUES
  ('$10 Off', 'Save $10 on any service', 10, 1000, 1),
  ('$25 Off', 'Save $25 on any service', 25, 2500, 2),
  ('$50 Off', 'Save $50 on any service', 50, 5000, 3);