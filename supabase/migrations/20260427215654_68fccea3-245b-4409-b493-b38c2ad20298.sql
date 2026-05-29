-- Add trigger to revoke loyalty point when a booking is cancelled
CREATE OR REPLACE FUNCTION public.revoke_loyalty_point_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Only act when status transitions TO cancelled (and wasn't already cancelled)
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    IF NEW.customer_email IS NULL OR TRIM(NEW.customer_email) = '' THEN
      RETURN NEW;
    END IF;

    SELECT id INTO v_account_id
    FROM public.loyalty_accounts
    WHERE email = LOWER(NEW.customer_email);

    IF v_account_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Subtract 1 point (don't go below 0)
    UPDATE public.loyalty_accounts
    SET points_balance = GREATEST(0, points_balance - 1),
        lifetime_earned = GREATEST(0, lifetime_earned - 1)
    WHERE id = v_account_id;

    -- Log the reversal
    INSERT INTO public.loyalty_transactions (account_id, points, type, reason, booking_id)
    VALUES (v_account_id, -1, 'adjustment', 'Booking cancelled: ' || COALESCE(NEW.service_name, 'service'), NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revoke_loyalty_on_cancel ON public.bookings;
CREATE TRIGGER trg_revoke_loyalty_on_cancel
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.revoke_loyalty_point_on_cancel();
