-- Migration 006: UK Tax Engine fields and tax settings
-- Adds UK-specific tax configuration per organisation for accurate financial modelling.
-- From competitive audit: Kevin Steel / Inflectiv Intelligence pattern.

-- UK Tax Settings per organisation
CREATE TABLE IF NOT EXISTS public.tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,

  -- Corporation Tax
  corporation_tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.25, -- 25% default UK rate

  -- VAT
  vat_registered BOOLEAN NOT NULL DEFAULT false,
  vat_rate NUMERIC(5,4) NOT NULL DEFAULT 0.20, -- 20% standard rate
  vat_flat_rate NUMERIC(5,4), -- Flat rate scheme percentage (if applicable)
  vat_quarter_start_month INTEGER NOT NULL DEFAULT 1, -- 1=Jan, 4=Apr, 7=Jul, 10=Oct
  vat_scheme TEXT NOT NULL DEFAULT 'standard' CHECK (vat_scheme IN ('standard', 'flat_rate', 'cash', 'annual')),

  -- PAYE / Employment
  paye_rate NUMERIC(5,4) NOT NULL DEFAULT 0.20, -- Basic rate
  employee_ni_rate NUMERIC(5,4) NOT NULL DEFAULT 0.08, -- Employee NI (8% from 2024)
  employer_ni_rate NUMERIC(5,4) NOT NULL DEFAULT 0.138, -- Employer NI (13.8%)
  employer_ni_threshold NUMERIC(10,2) NOT NULL DEFAULT 9100, -- Annual threshold
  employer_pension_rate NUMERIC(5,4) NOT NULL DEFAULT 0.03, -- Minimum auto-enrolment (3%)

  -- HMRC Payment Plans
  has_vat_payment_plan BOOLEAN NOT NULL DEFAULT false,
  vat_payment_plan_balance NUMERIC(12,2) DEFAULT 0,
  vat_payment_plan_monthly NUMERIC(12,2) DEFAULT 0,

  has_corp_tax_payment_plan BOOLEAN NOT NULL DEFAULT false,
  corp_tax_payment_plan_balance NUMERIC(12,2) DEFAULT 0,
  corp_tax_payment_plan_monthly NUMERIC(12,2) DEFAULT 0,

  has_paye_payment_plan BOOLEAN NOT NULL DEFAULT false,
  paye_payment_plan_balance NUMERIC(12,2) DEFAULT 0,
  paye_payment_plan_monthly NUMERIC(12,2) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(org_id)
);

-- Enable RLS
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies — org_id scoped
CREATE POLICY "tax_settings_select" ON public.tax_settings
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tax_settings_insert" ON public.tax_settings
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tax_settings_update" ON public.tax_settings
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Payroll Groups (from Kevin Steel pattern)
-- Group salary nominals by team for workforce planning
CREATE TABLE IF NOT EXISTS public.payroll_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "Product Team", "Marketing", "Client Services"

  -- Group-level rates (override org defaults if set)
  employer_ni_rate NUMERIC(5,4), -- NULL = use org default
  employer_pension_rate NUMERIC(5,4), -- NULL = use org default

  -- Metadata
  headcount INTEGER NOT NULL DEFAULT 0,
  total_annual_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_groups_select" ON public.payroll_groups
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "payroll_groups_insert" ON public.payroll_groups
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "payroll_groups_update" ON public.payroll_groups
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "payroll_groups_delete" ON public.payroll_groups
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Xero Account Mappings (auto-mapping pattern from Aleph)
-- Maps Xero GL accounts to standard Advisory OS categories
CREATE TABLE IF NOT EXISTS public.account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,

  -- Standard category mapping
  standard_category TEXT NOT NULL, -- e.g. 'revenue_recurring', 'cogs_direct_labour', 'opex_marketing'

  -- AI mapping metadata
  ai_confidence NUMERIC(3,2), -- 0.00-1.00 confidence from Claude API
  ai_suggested BOOLEAN NOT NULL DEFAULT false,
  user_confirmed BOOLEAN NOT NULL DEFAULT false,
  user_overridden BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(org_id, account_id)
);

-- Enable RLS
ALTER TABLE public.account_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_mappings_select" ON public.account_mappings
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "account_mappings_insert" ON public.account_mappings
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "account_mappings_update" ON public.account_mappings
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tax_settings_org ON public.tax_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_groups_org ON public.payroll_groups(org_id);
CREATE INDEX IF NOT EXISTS idx_account_mappings_org ON public.account_mappings(org_id);
CREATE INDEX IF NOT EXISTS idx_account_mappings_account ON public.account_mappings(account_id);
