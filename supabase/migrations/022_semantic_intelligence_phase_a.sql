-- Semantic Intelligence Layer: Phase A
-- Accounting config + Data health reports

-- ============================================================
-- Table 1: org_accounting_config (one row per org)
-- Pulled from Xero Organisation API on first connect + each sync
-- ============================================================
CREATE TABLE IF NOT EXISTS public.org_accounting_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  financial_year_end_month INTEGER NOT NULL CHECK (financial_year_end_month BETWEEN 1 AND 12),
  financial_year_end_day INTEGER NOT NULL CHECK (financial_year_end_day BETWEEN 1 AND 31),
  vat_scheme TEXT,
  vat_period TEXT,
  base_currency TEXT NOT NULL DEFAULT 'GBP',
  corporation_tax_period TEXT,
  last_filed_accounts_date DATE,
  xero_org_type TEXT,
  xero_org_status TEXT,
  tax_number TEXT,
  registration_number TEXT,
  period_lock_date DATE,
  end_of_year_lock_date DATE,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_accounting_config_org_unique UNIQUE (org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_accounting_config_org ON public.org_accounting_config(org_id);
ALTER TABLE public.org_accounting_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org accounting config"
  ON public.org_accounting_config FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Service can manage org accounting config"
  ON public.org_accounting_config FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================
-- Table 2: data_health_reports (per org, per period)
-- Generated during each sync — scores data quality 0-100
-- ============================================================
CREATE TABLE IF NOT EXISTS public.data_health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  checks JSONB NOT NULL,
  recommendations TEXT[],
  forecast_ready BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_data_health_org_period ON public.data_health_reports(org_id, period);
ALTER TABLE public.data_health_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view data health reports"
  ON public.data_health_reports FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Service can manage data health reports"
  ON public.data_health_reports FOR ALL
  USING (true) WITH CHECK (true);
