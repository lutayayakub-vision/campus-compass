
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.classes TO authenticated, anon;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classes readable" ON public.classes FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE public.buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  lat double precision NOT NULL,
  lng double precision NOT NULL
);
GRANT SELECT ON public.buildings TO authenticated, anon;
GRANT ALL ON public.buildings TO service_role;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buildings readable" ON public.buildings FOR SELECT TO authenticated, anon USING (true);

CREATE TYPE public.app_role AS ENUM ('rep', 'fresher');
CREATE TYPE public.fresher_status AS ENUM ('lost', 'guided', 'found');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'fresher',
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  target_building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_class_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT class_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "classmates select" ON public.profiles FOR SELECT TO authenticated
  USING (class_id IS NOT NULL AND class_id = public.my_class_id());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.locations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  sharing boolean NOT NULL DEFAULT true,
  status public.fresher_status NOT NULL DEFAULT 'lost',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.class_of(_user uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT class_id FROM public.profiles WHERE id = _user
$$;

CREATE POLICY "own location all" ON public.locations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "classmates location select" ON public.locations FOR SELECT TO authenticated
  USING (public.class_of(user_id) IS NOT NULL AND public.class_of(user_id) = public.my_class_id());
CREATE POLICY "rep updates classmate status" ON public.locations FOR UPDATE TO authenticated
  USING (public.my_role() = 'rep' AND public.class_of(user_id) = public.my_class_id())
  WITH CHECK (public.my_role() = 'rep' AND public.class_of(user_id) = public.my_class_id());

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_pair_idx ON public.messages (sender_id, recipient_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversation select" ON public.messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "send as self" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.class_of(recipient_id) = public.my_class_id());

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER locations_updated BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.locations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

INSERT INTO public.classes (name, code) VALUES
  ('BSc Computer Science Year 1', 'BCS1'),
  ('Bachelor of Laws Year 1', 'LLB1'),
  ('BSc Civil Engineering Year 1', 'BCE1'),
  ('Bachelor of Commerce Year 1', 'BCOM1');

INSERT INTO public.buildings (name, description, lat, lng) VALUES
  ('CIT Block A (Computing)', 'College of Computing and Information Sciences', 0.331520, 32.568230),
  ('Main Building (Ivory Tower)', 'Central administration and lecture halls', 0.331570, 32.570390),
  ('CEDAT', 'College of Engineering, Design, Art and Technology', 0.329100, 32.566600),
  ('Frank Kalimuzo Central Teaching Facility', 'Large shared lecture theatres', 0.334100, 32.567600),
  ('Senate Building', 'Admissions and registry', 0.335200, 32.569200),
  ('School of Law', 'Faculty of Law lecture rooms', 0.333100, 32.571400),
  ('Freedom Square', 'Central open ground, common meeting point', 0.332400, 32.569600),
  ('University Main Gate', 'Entrance from Makerere Hill Road', 0.329600, 32.571900);
