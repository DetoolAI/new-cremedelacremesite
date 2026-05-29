-- Loyalty accounts: drop overly-permissive public policies
DROP POLICY IF EXISTS "Anyone can view loyalty accounts" ON public.loyalty_accounts;
DROP POLICY IF EXISTS "System can insert loyalty accounts" ON public.loyalty_accounts;
DROP POLICY IF EXISTS "System can update loyalty accounts" ON public.loyalty_accounts;

-- Loyalty transactions: drop overly-permissive public policies
DROP POLICY IF EXISTS "Anyone can view loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "System can insert loyalty transactions" ON public.loyalty_transactions;

-- Staff PIN: revoke column access from anon and authenticated roles.
-- Admin server routes use the service-role key which bypasses these grants.
REVOKE SELECT (pin) ON public.staff FROM anon, authenticated;
REVOKE UPDATE (pin), INSERT (pin) ON public.staff FROM anon;