-- 1. Drop the broad SELECT policy that allows listing site-media bucket contents.
--    Public file URLs (/storage/v1/object/public/...) still work because the bucket
--    itself is marked public; this only removes the ability to LIST files.
DROP POLICY IF EXISTS "Public can view site-media" ON storage.objects;

-- 2. Revoke EXECUTE on background/trigger SECURITY DEFINER functions from public roles.
--    Trigger functions don't need direct EXECUTE (they fire from triggers).
--    Email queue helpers are called server-side via service_role only.
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.award_loyalty_point_on_booking() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.revoke_loyalty_point_on_cancel() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;

-- Ensure service_role retains access for server-side calls.
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;