-- ============================================================
-- Migration 007: Custom KPIs
-- Allows organisations to define custom KPI formulas
-- ============================================================

-- Custom KPIs table
CREATE TABLE IF NOT EXISTS public.custom_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  format TEXT NOT NULL CHECK (format IN ('currency', 'percentage', 'months', 'ratio', 'number', 'days')),
  higher_is_better BOOLEAN NOT NULL DEFAULT true,
  formula_numerator TEXT NOT NULL,
  formula_denominator TEXT DEFAULT '',
  target_value NUMERIC,
  alert_threshold NUMERIC,
  alert_direction TEXT CHECK (alert_direction IN ('above', 'below')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, key)
);

-- RLS
ALTER TABLE public.custom_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_kpis_select" ON public.custom_kpis
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "custom_kpis_insert" ON public.custom_kpis
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "custom_kpis_update" ON public.custom_kpis
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "custom_kpis_delete" ON public.custom_kpis
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Index for fast org lookups
CREATE INDEX IF NOT EXISTS idx_custom_kpis_org_id ON public.custom_kpis(org_id);
