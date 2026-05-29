-- Track membership service redemptions
CREATE TABLE public.membership_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  benefit_label TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_membership_redemptions_membership ON public.membership_redemptions(membership_id, redeemed_at DESC);

ALTER TABLE public.membership_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage redemptions"
  ON public.membership_redemptions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));