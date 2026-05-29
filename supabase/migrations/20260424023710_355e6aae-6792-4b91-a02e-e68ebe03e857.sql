-- Contact form submissions table
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit a contact request
CREATE POLICY "Anyone can submit a contact request"
  ON public.contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(first_name) BETWEEN 1 AND 100
    AND char_length(last_name) BETWEEN 1 AND 100
    AND char_length(email) BETWEEN 3 AND 255
    AND char_length(phone) BETWEEN 5 AND 50
    AND char_length(service) BETWEEN 1 AND 200
    AND (notes IS NULL OR char_length(notes) <= 2000)
  );

-- No public read/update/delete — submissions are only viewable through the
-- Lovable Cloud dashboard (service role bypasses RLS automatically).

-- Helpful index for sorting newest first in the dashboard
CREATE INDEX idx_contact_submissions_created_at
  ON public.contact_submissions (created_at DESC);