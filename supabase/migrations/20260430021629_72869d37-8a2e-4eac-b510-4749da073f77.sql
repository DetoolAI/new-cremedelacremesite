-- Cap loyalty points balance at 10 and keep only the $10 reward
CREATE OR REPLACE FUNCTION public.award_loyalty_point_on_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_id UUID;
  v_full_name TEXT;
  v_current_balance INT;
  v_new_balance INT;
  v_points_added INT;
BEGIN
  IF NEW.customer_email IS NULL OR TRIM(NEW.customer_email) = '' THEN
    RETURN NEW;
  END IF;

  v_full_name := TRIM(CONCAT(NEW.customer_first_name, ' ', NEW.customer_last_name));

  -- Find existing balance (if any)
  SELECT points_balance INTO v_current_balance
  FROM public.loyalty_accounts
  WHERE email = LOWER(NEW.customer_email);

  v_current_balance := COALESCE(v_current_balance, 0);
  v_new_balance := LEAST(10, v_current_balance + 1);
  v_points_added := v_new_balance - v_current_balance; -- 0 if already at cap

  INSERT INTO public.loyalty_accounts (email, customer_name, phone, points_balance, lifetime_earned)
  VALUES (LOWER(NEW.customer_email), v_full_name, NEW.customer_phone, v_new_balance, v_points_added)
  ON CONFLICT (email) DO UPDATE
  SET points_balance = v_new_balance,
      lifetime_earned = public.loyalty_accounts.lifetime_earned + v_points_added,
      customer_name = COALESCE(NULLIF(v_full_name, ''), public.loyalty_accounts.customer_name),
      phone = COALESCE(NEW.customer_phone, public.loyalty_accounts.phone)
  RETURNING id INTO v_account_id;

  -- Only log if a point was actually awarded
  IF v_points_added > 0 THEN
    INSERT INTO public.loyalty_transactions (account_id, points, type, reason, booking_id)
    VALUES (v_account_id, 1, 'earned', 'Booking: ' || COALESCE(NEW.service_name, 'service'), NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;

-- Deactivate the $25 and $50 tiers; keep only $10 Off (10 points)
UPDATE public.loyalty_rewards
SET active = false
WHERE points_required > 10;