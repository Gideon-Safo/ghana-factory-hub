ALTER TABLE public.stock_movements ADD CONSTRAINT qty_positive CHECK (quantity > 0);

ALTER TABLE public.production_runs ADD CONSTRAINT positive_qtys CHECK (
  planned_qty >= 0 AND actual_qty >= 0 AND defects_qty >= 0 AND rework_qty >= 0
);

DROP POLICY IF EXISTS "Auth insert audit" ON public.audit_logs;
CREATE POLICY "Auth insert audit" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());