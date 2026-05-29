-- Clean up test bookings
DELETE FROM public.bookings
WHERE customer_email ~ '(x\.com|example\.com|test|justiniheme)';

-- Clean up test newsletter/notify leads
DELETE FROM public.leads
WHERE email ~ '(x\.com|example\.com|test|justiniheme)';

-- Clean up loyalty transactions for test accounts first (FK)
DELETE FROM public.loyalty_transactions
WHERE account_id IN (
  SELECT id FROM public.loyalty_accounts
  WHERE email ~ '(x\.com|example\.com|test|justiniheme)'
);

-- Then remove the test loyalty accounts
DELETE FROM public.loyalty_accounts
WHERE email ~ '(x\.com|example\.com|test|justiniheme)';