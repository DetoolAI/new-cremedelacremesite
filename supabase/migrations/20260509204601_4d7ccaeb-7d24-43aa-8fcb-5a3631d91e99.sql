-- Dedupe by lowercased email (when email exists), keep oldest
WITH ranked_email AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY LOWER(TRIM(email))
    ORDER BY created_at ASC, id ASC
  ) AS rn
  FROM customers
  WHERE email IS NOT NULL AND TRIM(email) <> ''
)
DELETE FROM customers WHERE id IN (SELECT id FROM ranked_email WHERE rn > 1);

-- Dedupe rows with no email by phone digits
WITH ranked_phone AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY regexp_replace(COALESCE(phone, cellphone, ''), '\D', '', 'g')
    ORDER BY created_at ASC, id ASC
  ) AS rn
  FROM customers
  WHERE (email IS NULL OR TRIM(email) = '')
    AND regexp_replace(COALESCE(phone, cellphone, ''), '\D', '', 'g') <> ''
)
DELETE FROM customers WHERE id IN (SELECT id FROM ranked_phone WHERE rn > 1);