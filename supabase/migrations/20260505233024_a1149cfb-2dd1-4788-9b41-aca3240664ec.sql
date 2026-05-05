ALTER TABLE public.tv_models
  ADD COLUMN IF NOT EXISTS supplier text,
  ADD COLUMN IF NOT EXISTS warehouse_location text,
  ADD COLUMN IF NOT EXISTS initial_stock integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_code text;