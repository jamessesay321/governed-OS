-- Debt Command Centre: facilities, schedules, documents, DLAs, creditor plans
-- All tables enforce org_id multi-tenancy with RLS

-- ============================================================
-- 1. debt_facilities — master list of all loans, MCAs, credit lines
-- ============================================================
CREATE TABLE IF NOT EXISTS debt_facilities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  facility_name text NOT NULL,
  lender        text NOT NULL,
  facility_type text NOT NULL CHECK (facility_type IN (
    'term_loan', 'unsecured_loan', 'secured_loan', 'mca',
    'credit_card', 'overdraft', 'government_loan', 'director_loan',
    'creditor_plan', 'personal_loan', 'other'
  )),
  classification text NOT NULL DEFAULT 'unclassified' CHECK (classification IN (
    'good', 'okay', 'bad', 'unclassified'
  )),
  -- Financials
  original_amount    numeric(12,2) NOT NULL DEFAULT 0,
  current_balance    numeric(12,2) NOT NULL DEFAULT 0,
  monthly_repayment  numeric(12,2) DEFAULT 0,
  interest_rate      numeric(6,4) DEFAULT 0,       -- as decimal e.g. 0.079
  effective_apr      numeric(6,4) DEFAULT NULL,     -- for MCAs and high-cost
  fixed_fee          numeric(12,2) DEFAULT 0,
  -- Dates
  start_date         date,
  maturity_date      date,
  next_payment_date  date,
  payment_day        integer,                       -- day of month for DD
  -- Repayment structure
  repayment_frequency text DEFAULT 'monthly' CHECK (repayment_frequency IN (
    'daily', 'weekly', 'bi_weekly', 'monthly', 'when_paid', 'none'
  )),
  sweep_percentage   numeric(5,2) DEFAULT NULL,     -- for MCAs e.g. 17.00
  sweep_source       text DEFAULT NULL,             -- e.g. 'shopify', 'stripe'
  -- Status
  status             text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'paid_off', 'refinanced', 'defaulted', 'frozen'
  )),
  refinance_eligible boolean DEFAULT false,
  refinance_priority integer DEFAULT NULL,          -- 1 = highest priority
  refinance_notes    text,
  -- Security / collateral
  secured            boolean DEFAULT false,
  collateral_description text,
  has_debenture      boolean DEFAULT false,
  -- Director loan specific
  director_name      text,                          -- for DLA type
  -- Metadata
  notes              text,
  statement_access   text,                          -- e.g. 'james has login'
  portal_url         text,
  last_statement_date date,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_debt_facilities_org ON debt_facilities(org_id);
CREATE INDEX idx_debt_facilities_status ON debt_facilities(org_id, status);

ALTER TABLE debt_facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debt_facilities_select" ON debt_facilities
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "debt_facilities_insert" ON debt_facilities
  FOR INSERT WITH CHECK (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "debt_facilities_update" ON debt_facilities
  FOR UPDATE USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "debt_facilities_delete" ON debt_facilities
  FOR DELETE USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================
-- 2. debt_balance_history — monthly balance snapshots per facility
-- ============================================================
CREATE TABLE IF NOT EXISTS debt_balance_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  facility_id  uuid NOT NULL REFERENCES debt_facilities(id) ON DELETE CASCADE,
  period       text NOT NULL,                    -- e.g. '2026-01', '2026-02'
  balance      numeric(12,2) NOT NULL,
  is_projected boolean DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_debt_balance_unique ON debt_balance_history(facility_id, period);
CREATE INDEX idx_debt_balance_org ON debt_balance_history(org_id);

ALTER TABLE debt_balance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debt_balance_select" ON debt_balance_history
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "debt_balance_insert" ON debt_balance_history
  FOR INSERT WITH CHECK (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "debt_balance_update" ON debt_balance_history
  FOR UPDATE USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================
-- 3. debt_documents — contracts, agreements, statements uploaded
-- ============================================================
CREATE TABLE IF NOT EXISTS debt_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  facility_id  uuid NOT NULL REFERENCES debt_facilities(id) ON DELETE CASCADE,
  file_name    text NOT NULL,
  file_url     text NOT NULL,
  file_type    text DEFAULT 'contract' CHECK (file_type IN (
    'contract', 'statement', 'agreement', 'correspondence', 'other'
  )),
  ai_summary   text,
  ai_key_terms jsonb,                            -- extracted terms, rates, penalties
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  scanned_at   timestamptz
);

CREATE INDEX idx_debt_documents_facility ON debt_documents(facility_id);

ALTER TABLE debt_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debt_documents_select" ON debt_documents
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "debt_documents_insert" ON debt_documents
  FOR INSERT WITH CHECK (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================
-- 4. debt_refinance_scenarios — what-if refinancing plans
-- ============================================================
CREATE TABLE IF NOT EXISTS debt_refinance_scenarios (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  -- Scenario details stored as JSON array of actions
  actions      jsonb NOT NULL DEFAULT '[]',       -- [{facility_id, action, new_amount, new_rate, new_term}]
  -- Calculated outcomes
  total_current_debt     numeric(12,2),
  total_post_refinance   numeric(12,2),
  monthly_saving         numeric(12,2),
  annual_saving          numeric(12,2),
  new_monthly_repayment  numeric(12,2),
  breakeven_months       integer,
  ai_analysis            text,
  status                 text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'applied', 'rejected')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_debt_scenarios_org ON debt_refinance_scenarios(org_id);

ALTER TABLE debt_refinance_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debt_scenarios_select" ON debt_refinance_scenarios
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "debt_scenarios_insert" ON debt_refinance_scenarios
  FOR INSERT WITH CHECK (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "debt_scenarios_update" ON debt_refinance_scenarios
  FOR UPDATE USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================
-- 5. Updated timestamp trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_debt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER debt_facilities_updated
  BEFORE UPDATE ON debt_facilities
  FOR EACH ROW EXECUTE FUNCTION update_debt_updated_at();

CREATE TRIGGER debt_scenarios_updated
  BEFORE UPDATE ON debt_refinance_scenarios
  FOR EACH ROW EXECUTE FUNCTION update_debt_updated_at();
