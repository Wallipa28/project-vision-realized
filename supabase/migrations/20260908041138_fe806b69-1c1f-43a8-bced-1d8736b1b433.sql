-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','manager','supervisor','quality','viewer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.can_edit(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','manager','supervisor'));
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- MASTER DATA
CREATE TABLE public.plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.production_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id uuid NOT NULL REFERENCES public.production_lines(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plants, public.production_lines, public.machines, public.products TO authenticated;
GRANT ALL ON public.plants, public.production_lines, public.machines, public.products TO service_role;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plants_read" ON public.plants FOR SELECT TO authenticated USING (true);
CREATE POLICY "plants_write" ON public.plants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "lines_read" ON public.production_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "lines_write" ON public.production_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "machines_read" ON public.machines FOR SELECT TO authenticated USING (true);
CREATE POLICY "machines_write" ON public.machines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "products_read" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- TRANSACTIONS
CREATE TABLE public.production_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prod_date date NOT NULL,
  shift text NOT NULL DEFAULT 'A',
  plant_id uuid NOT NULL REFERENCES public.plants(id),
  line_id uuid NOT NULL REFERENCES public.production_lines(id),
  machine_id uuid REFERENCES public.machines(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  plan_qty numeric NOT NULL DEFAULT 0,
  actual_qty numeric NOT NULL DEFAULT 0,
  good_qty numeric NOT NULL DEFAULT 0,
  defect_qty numeric NOT NULL DEFAULT 0,
  reject_qty numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prod_date ON public.production_records (prod_date);

CREATE TABLE public.downtime_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prod_date date NOT NULL,
  line_id uuid NOT NULL REFERENCES public.production_lines(id),
  machine_id uuid REFERENCES public.machines(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_min integer NOT NULL DEFAULT 0,
  category text NOT NULL,
  cause text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_downtime_date ON public.downtime_records (prod_date);

CREATE TABLE public.defect_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prod_date date NOT NULL,
  line_id uuid NOT NULL REFERENCES public.production_lines(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  defect_type text NOT NULL,
  qty numeric NOT NULL DEFAULT 0,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_defect_date ON public.defect_records (prod_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_records, public.downtime_records, public.defect_records TO authenticated;
GRANT ALL ON public.production_records, public.downtime_records, public.defect_records TO service_role;
ALTER TABLE public.production_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downtime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prod_read" ON public.production_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "prod_write" ON public.production_records FOR ALL TO authenticated
  USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "down_read" ON public.downtime_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "down_write" ON public.downtime_records FOR ALL TO authenticated
  USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "defect_read" ON public.defect_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "defect_write" ON public.defect_records FOR ALL TO authenticated
  USING (public.can_edit(auth.uid()) OR public.has_role(auth.uid(),'quality'))
  WITH CHECK (public.can_edit(auth.uid()) OR public.has_role(auth.uid(),'quality'));

-- SEED
INSERT INTO public.plants (code, name) VALUES
  ('PL1','โรงงานบางปู'),
  ('PL2','โรงงานระยอง');

INSERT INTO public.production_lines (plant_id, code, name)
SELECT p.id, v.code, v.name FROM public.plants p
JOIN (VALUES
  ('PL1','LINE-A','ไลน์ผลิต A'),
  ('PL1','LINE-B','ไลน์ผลิต B'),
  ('PL1','LINE-C','ไลน์ผลิต C'),
  ('PL2','LINE-D','ไลน์ผลิต D')
) AS v(plant_code, code, name) ON v.plant_code = p.code;

INSERT INTO public.machines (line_id, code, name)
SELECT l.id, v.code, v.name FROM public.production_lines l
JOIN (VALUES
  ('LINE-A','MC-A01','เครื่องฉีด A01'),
  ('LINE-A','MC-A02','เครื่องฉีด A02'),
  ('LINE-B','MC-B01','เครื่องประกอบ B01'),
  ('LINE-C','MC-C01','เครื่องบรรจุ C01'),
  ('LINE-D','MC-D01','เครื่องบรรจุ D01')
) AS v(line_code, code, name) ON v.line_code = l.code;

INSERT INTO public.products (code, name, unit) VALUES
  ('P-1001','ฝาขวดพลาสติก 28mm','pcs'),
  ('P-1002','ขวด PET 500ml','pcs'),
  ('P-1003','กล่องบรรจุภัณฑ์ A','pcs'),
  ('P-1004','ชิ้นส่วนพลาสติก B','pcs');

INSERT INTO public.production_records (prod_date, shift, plant_id, line_id, machine_id, product_id, plan_qty, actual_qty, good_qty, defect_qty, reject_qty)
SELECT
  d::date,
  s.shift,
  l.plant_id,
  l.id,
  (SELECT m.id FROM public.machines m WHERE m.line_id = l.id LIMIT 1),
  pr.id,
  plan_q,
  actual_q,
  actual_q - defect_q - reject_q,
  defect_q,
  reject_q
FROM generate_series(current_date - 59, current_date, interval '1 day') AS d
CROSS JOIN (VALUES ('A'),('B')) AS s(shift)
CROSS JOIN public.production_lines l
CROSS JOIN LATERAL (
  SELECT p.id FROM public.products p ORDER BY md5(p.code || d::text || s.shift || l.code) LIMIT 1
) pr
CROSS JOIN LATERAL (
  SELECT 10000::numeric AS plan_q,
         (8200 + (abs(hashtext(d::text || s.shift || l.code)) % 2400))::numeric AS actual_q
) base
CROSS JOIN LATERAL (
  SELECT round(actual_q * (0.01 + (abs(hashtext('d' || d::text || s.shift || l.code)) % 30) / 1000.0)) AS defect_q,
         round(actual_q * (0.003 + (abs(hashtext('r' || d::text || s.shift || l.code)) % 12) / 1000.0)) AS reject_q
) q;

INSERT INTO public.downtime_records (prod_date, line_id, machine_id, start_time, end_time, duration_min, category, cause)
SELECT
  d::date,
  l.id,
  (SELECT m.id FROM public.machines m WHERE m.line_id = l.id LIMIT 1),
  (d + interval '9 hour')::timestamptz,
  (d + interval '9 hour' + (dur || ' minutes')::interval)::timestamptz,
  dur,
  cat.category,
  cat.cause
FROM generate_series(current_date - 59, current_date, interval '1 day') AS d
CROSS JOIN public.production_lines l
CROSS JOIN LATERAL (
  SELECT (15 + (abs(hashtext('dt' || d::text || l.code)) % 90)) AS dur
) t
CROSS JOIN LATERAL (
  SELECT * FROM (VALUES
    ('เครื่องจักรขัดข้อง','มอเตอร์สายพานขัดข้อง'),
    ('รอวัตถุดิบ','วัตถุดิบส่งล่าช้า'),
    ('เปลี่ยนรุ่นผลิต','Setup/Changeover'),
    ('ปัญหาคุณภาพ','ปรับตั้งค่าเครื่องใหม่'),
    ('ไฟฟ้าขัดข้อง','ไฟตกในสายการผลิต')
  ) AS c(category, cause)
  OFFSET (abs(hashtext('cat' || d::text || l.code)) % 5) LIMIT 1
) cat
WHERE (abs(hashtext('has' || d::text || l.code)) % 3) <> 0;

INSERT INTO public.defect_records (prod_date, line_id, product_id, defect_type, qty)
SELECT
  pr.prod_date,
  pr.line_id,
  pr.product_id,
  dt.defect_type,
  GREATEST(round(pr.defect_qty * dt.ratio), 1)
FROM public.production_records pr
CROSS JOIN (VALUES
  ('รอยขีดข่วน', 0.35),
  ('สีไม่ได้มาตรฐาน', 0.25),
  ('ขนาดไม่ได้สเปค', 0.2),
  ('แตกร้าว', 0.12),
  ('ปนเปื้อน', 0.08)
) AS dt(defect_type, ratio)
WHERE pr.defect_qty > 0;