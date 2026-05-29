
-- Service categories
CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  display_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Services
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 60,
  display_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_services_category ON public.services(category_id);

-- Staff / technicians
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bio text,
  display_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bookings
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Customer info
  customer_first_name text NOT NULL CHECK (char_length(customer_first_name) BETWEEN 1 AND 100),
  customer_last_name text NOT NULL CHECK (char_length(customer_last_name) BETWEEN 1 AND 100),
  customer_email text NOT NULL CHECK (char_length(customer_email) BETWEEN 3 AND 255),
  customer_phone text NOT NULL CHECK (char_length(customer_phone) BETWEEN 5 AND 50),
  customer_type text NOT NULL DEFAULT 'new' CHECK (customer_type IN ('new', 'returning')),
  is_member boolean NOT NULL DEFAULT false,
  -- Service / staff
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  service_category text,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  staff_name text NOT NULL DEFAULT 'Any Available Technician',
  -- Appointment
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  duration_minutes int,
  -- Extras
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_appt ON public.bookings(appointment_date, appointment_time);
CREATE INDEX idx_bookings_status ON public.bookings(status);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Public read for the catalog
CREATE POLICY "Anyone can view active categories" ON public.service_categories FOR SELECT USING (active = true);
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (active = true);
CREATE POLICY "Anyone can view active staff" ON public.staff FOR SELECT USING (active = true);

-- Admin manages catalog
CREATE POLICY "Admins manage categories" ON public.service_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage services" ON public.services FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage staff" ON public.staff FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Bookings — anyone can submit, only admins can read/update
CREATE POLICY "Anyone can create a booking" ON public.bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(customer_first_name) BETWEEN 1 AND 100
    AND char_length(customer_last_name) BETWEEN 1 AND 100
    AND char_length(customer_email) BETWEEN 3 AND 255
    AND char_length(customer_phone) BETWEEN 5 AND 50
    AND char_length(service_name) BETWEEN 1 AND 200
    AND (notes IS NULL OR char_length(notes) <= 2000)
    AND appointment_date >= CURRENT_DATE
  );

CREATE POLICY "Admins view all bookings" ON public.bookings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update bookings" ON public.bookings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete bookings" ON public.bookings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
