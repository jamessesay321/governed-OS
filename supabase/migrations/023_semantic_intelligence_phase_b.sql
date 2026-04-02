-- Semantic Intelligence Layer: Phase B
-- CoA Taxonomy + Semantic Mapping enhancements

-- ============================================================
-- 1. Add version tracking and lock status to account_mappings
-- ============================================================
ALTER TABLE public.account_mappings
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by UUID,
  ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;

-- ============================================================
-- 2. Mapping audit trail (immutable log of all mapping changes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.account_mapping_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  previous_category TEXT,
  new_category TEXT NOT NULL,
  changed_by UUID,
  change_source TEXT NOT NULL CHECK (change_source IN ('auto', 'manual', 'blueprint', 'bulk_confirm')),
  confidence NUMERIC(3,2),
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mapping_history_org ON public.account_mapping_history(org_id);
CREATE INDEX IF NOT EXISTS idx_mapping_history_account ON public.account_mapping_history(account_id);
ALTER TABLE public.account_mapping_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view mapping history"
  ON public.account_mapping_history FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- Immutable: no UPDATE or DELETE policies
CREATE POLICY "Service can insert mapping history"
  ON public.account_mapping_history FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 3. Tracking category mappings (Xero tracking categories → semantic types)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tracking_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  xero_category_id TEXT NOT NULL,
  xero_category_name TEXT NOT NULL,
  semantic_type TEXT NOT NULL CHECK (semantic_type IN (
    'location', 'department', 'project', 'product_line', 'cost_centre', 'custom'
  )),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tracking_category_org_unique UNIQUE (org_id, xero_category_id)
);

CREATE INDEX IF NOT EXISTS idx_tracking_category_org ON public.tracking_category_mappings(org_id);
ALTER TABLE public.tracking_category_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tracking categories"
  ON public.tracking_category_mappings FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Service can manage tracking categories"
  ON public.tracking_category_mappings FOR ALL
  USING (true) WITH CHECK (true);
