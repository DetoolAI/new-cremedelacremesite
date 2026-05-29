
ALTER TABLE public.membership_redemptions
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS membership_redemptions_pending_email_idx
  ON public.membership_redemptions (redeemed_at)
  WHERE email_sent_at IS NULL;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove prior schedule if any
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'dispatch-redemption-emails';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'dispatch-redemption-emails',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--a0a5ceda-0b2a-4333-858a-12e92ddccb41.lovable.app/api/public/dispatch-redemption-emails',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuZHpzeXJpc3llbnVpd3RrdnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5ODM1ODMsImV4cCI6MjA5MjU1OTU4M30.FOw1YMKQNsdQxhYgkhLDmjsbmJF9kujEePo_ZQZCY7Y"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
