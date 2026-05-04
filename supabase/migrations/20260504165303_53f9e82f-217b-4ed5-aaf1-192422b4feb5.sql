
-- 1. Lock down SECURITY DEFINER role-check functions to authenticated users only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;

-- 2. Replace permissive read policies with role-scoped ones

-- sales: admin + sales only
DROP POLICY IF EXISTS "Auth read sales" ON public.sales;
CREATE POLICY "Role read sales" ON public.sales
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','sales']::public.app_role[]));

-- components: admin + inventory + production
DROP POLICY IF EXISTS "Auth read components" ON public.components;
CREATE POLICY "Role read components" ON public.components
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','production']::public.app_role[]));

-- bom: admin + inventory + production
DROP POLICY IF EXISTS "Auth read bom" ON public.bom;
CREATE POLICY "Role read bom" ON public.bom
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','production']::public.app_role[]));

-- stock_movements: admin + inventory + production
DROP POLICY IF EXISTS "Auth read stock_movements" ON public.stock_movements;
CREATE POLICY "Role read stock_movements" ON public.stock_movements
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','production']::public.app_role[]));

-- production_runs: admin + production + qc
DROP POLICY IF EXISTS "Auth read production_runs" ON public.production_runs;
CREATE POLICY "Role read production_runs" ON public.production_runs
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','production','qc']::public.app_role[]));

-- qc_inspections: admin + qc + production
DROP POLICY IF EXISTS "Auth read qc" ON public.qc_inspections;
CREATE POLICY "Role read qc" ON public.qc_inspections
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','qc','production']::public.app_role[]));

-- fault_records: admin + qc + production
DROP POLICY IF EXISTS "Auth read faults" ON public.fault_records;
CREATE POLICY "Role read faults" ON public.fault_records
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','qc','production']::public.app_role[]));

-- tv_models: any role can read (needed for joins on sales/production/QC pages)
DROP POLICY IF EXISTS "Auth read tv_models" ON public.tv_models;
CREATE POLICY "Role read tv_models" ON public.tv_models
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','sales','inventory','production','qc']::public.app_role[]));
