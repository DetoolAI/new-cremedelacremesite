
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.membership_redemptions ADD COLUMN IF NOT EXISTS variant_name text;
