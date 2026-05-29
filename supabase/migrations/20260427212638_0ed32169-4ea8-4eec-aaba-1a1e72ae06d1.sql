-- Fix shifted/garbled customer data
-- Original import shifted columns: name=email, email=phone(+1...), address=phone digits
-- Real names live in appointments_history.customer_name keyed by email

-- 1. Move misplaced phone (currently in 'email' column with +1 prefix) into 'phone'
UPDATE public.customers
SET phone = email
WHERE phone IS NULL
  AND email IS NOT NULL
  AND email LIKE '+%';

-- 2. Move misplaced email (currently in 'name' column) into 'email'
UPDATE public.customers
SET email = name
WHERE name LIKE '%@%'
  AND (email IS NULL OR email LIKE '+%');

-- 3. Clear bogus 'address' values that are just phone digit strings (no letters, no spaces)
UPDATE public.customers
SET address = NULL
WHERE address IS NOT NULL
  AND address ~ '^[0-9+\-\(\)\s]+$';

-- 4. Backfill real names from appointments_history by matching email
WITH real_names AS (
  SELECT DISTINCT ON (LOWER(email))
    LOWER(email) AS email_lc,
    customer_name
  FROM public.appointments_history
  WHERE email IS NOT NULL
    AND customer_name IS NOT NULL
    AND customer_name NOT LIKE '%@%'
    AND TRIM(customer_name) <> ''
  ORDER BY LOWER(email), customer_name
)
UPDATE public.customers c
SET name = rn.customer_name
FROM real_names rn
WHERE LOWER(c.email) = rn.email_lc
  AND (c.name IS NULL OR c.name LIKE '%@%');

-- 5. Backfill phone from appointments_history when still missing
WITH real_phones AS (
  SELECT DISTINCT ON (LOWER(email))
    LOWER(email) AS email_lc,
    phone
  FROM public.appointments_history
  WHERE email IS NOT NULL
    AND phone IS NOT NULL
    AND TRIM(phone) <> ''
  ORDER BY LOWER(email), phone
)
UPDATE public.customers c
SET phone = rp.phone
FROM real_phones rp
WHERE LOWER(c.email) = rp.email_lc
  AND (c.phone IS NULL OR c.phone = '');