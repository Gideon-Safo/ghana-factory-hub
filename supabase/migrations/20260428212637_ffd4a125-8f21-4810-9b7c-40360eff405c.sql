
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'production', 'qc', 'inventory', 'sales');
CREATE TYPE public.shift_type AS ENUM ('Morning', 'Afternoon', 'Night');
CREATE TYPE public.qc_result AS ENUM ('PASS', 'FAIL');
CREATE TYPE public.qc_test_result AS ENUM ('PASS', 'FAIL', 'NA');
CREATE TYPE public.fault_status AS ENUM ('pending', 'in_repair', 'fixed', 'scrapped', 'retested');
CREATE TYPE public.fault_type AS ENUM ('display', 'power', 'sound', 'firmware', 'cosmetic', 'other');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'production');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ TV MODELS ============
CREATE TABLE public.tv_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  size_inches INT NOT NULL,
  is_smart BOOLEAN NOT NULL DEFAULT false,
  default_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tv_models ENABLE ROW LEVEL SECURITY;

-- ============ COMPONENTS / INVENTORY ============
CREATE TABLE public.components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  supplier TEXT,
  current_stock INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  warehouse_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;

-- ============ BOM ============
CREATE TABLE public.bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.tv_models(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  qty_per_unit INT NOT NULL DEFAULT 1,
  UNIQUE(model_id, component_id)
);
ALTER TABLE public.bom ENABLE ROW LEVEL SECURITY;

-- ============ STOCK MOVEMENTS ============
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN','OUT','ADJUST')),
  quantity INT NOT NULL,
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Trigger: update component stock when a movement is logged
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.movement_type = 'IN' THEN
    UPDATE public.components SET current_stock = current_stock + NEW.quantity, updated_at = now() WHERE id = NEW.component_id;
  ELSIF NEW.movement_type = 'OUT' THEN
    UPDATE public.components SET current_stock = current_stock - NEW.quantity, updated_at = now() WHERE id = NEW.component_id;
  ELSIF NEW.movement_type = 'ADJUST' THEN
    UPDATE public.components SET current_stock = NEW.quantity, updated_at = now() WHERE id = NEW.component_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_apply_stock_movement
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- ============ PRODUCTION RUNS ============
CREATE TABLE public.production_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift shift_type NOT NULL,
  model_id UUID NOT NULL REFERENCES public.tv_models(id),
  planned_qty INT NOT NULL DEFAULT 0,
  actual_qty INT NOT NULL DEFAULT 0,
  defects_qty INT NOT NULL DEFAULT 0,
  rework_qty INT NOT NULL DEFAULT 0,
  supervisor TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.production_runs ENABLE ROW LEVEL SECURITY;

-- Auto-deduct stock based on BOM when production run inserted
CREATE OR REPLACE FUNCTION public.deduct_bom_on_production()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT component_id, qty_per_unit FROM public.bom WHERE model_id = NEW.model_id LOOP
    INSERT INTO public.stock_movements (component_id, movement_type, quantity, reference, created_by)
    VALUES (r.component_id, 'OUT', r.qty_per_unit * NEW.actual_qty, 'Production run ' || NEW.id::text, NEW.created_by);
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_deduct_bom_on_production
  AFTER INSERT ON public.production_runs
  FOR EACH ROW WHEN (NEW.actual_qty > 0)
  EXECUTE FUNCTION public.deduct_bom_on_production();

-- ============ QC INSPECTIONS ============
CREATE TABLE public.qc_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT NOT NULL UNIQUE,
  model_id UUID REFERENCES public.tv_models(id),
  display_test qc_test_result NOT NULL DEFAULT 'NA',
  audio_test qc_test_result NOT NULL DEFAULT 'NA',
  ports_test qc_test_result NOT NULL DEFAULT 'NA',
  remote_test qc_test_result NOT NULL DEFAULT 'NA',
  final_result qc_result NOT NULL,
  notes TEXT,
  inspector_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;

-- ============ FAULT RECORDS ============
CREATE TABLE public.fault_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT NOT NULL,
  model_id UUID REFERENCES public.tv_models(id),
  fault_type fault_type NOT NULL,
  diagnosis TEXT,
  repair_action TEXT,
  technician TEXT,
  status fault_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fault_records ENABLE ROW LEVEL SECURITY;

-- ============ SALES ============
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  model_id UUID NOT NULL REFERENCES public.tv_models(id),
  units_sold INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  revenue NUMERIC(14,2) GENERATED ALWAYS AS (units_sold * unit_price) STORED,
  customer_name TEXT,
  region TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles: only admin manages, users can read their own
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Helper: any authenticated user can SELECT factory data
CREATE POLICY "Auth read tv_models" ON public.tv_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory/Admin write tv_models" ON public.tv_models FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::app_role[]));

CREATE POLICY "Auth read components" ON public.components FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory/Admin write components" ON public.components FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::app_role[]));

CREATE POLICY "Auth read bom" ON public.bom FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory/Admin write bom" ON public.bom FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::app_role[]));

CREATE POLICY "Auth read stock_movements" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory/Production/Admin write stock" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory','production']::app_role[]));

CREATE POLICY "Auth read production_runs" ON public.production_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Production/Admin write production" ON public.production_runs FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','production']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','production']::app_role[]));

CREATE POLICY "Auth read qc" ON public.qc_inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "QC/Admin write qc" ON public.qc_inspections FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','qc']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','qc']::app_role[]));

CREATE POLICY "Auth read faults" ON public.fault_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "QC/Admin write faults" ON public.fault_records FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','qc']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','qc']::app_role[]));

CREATE POLICY "Auth read sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sales/Admin write sales" ON public.sales FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','sales']::app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','sales']::app_role[]));

CREATE POLICY "Admins read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Auth insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
