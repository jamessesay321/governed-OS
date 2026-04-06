-- Enhance debt_facilities with missing info, credit impact, and category columns
-- Add VAT quarterly tracking table for statutory obligations

-- ============================================================
-- 1. Enhance debt_facilities
-- ============================================================

-- Category column to separate lenders vs creditors vs DLAs vs tax
ALTER TABLE debt_facilities ADD COLUMN IF NOT EXISTS category text DEFAULT 'lender'
  CHECK (category IN ('lender', 'creditor', 'director_loan', 'tax_statutory'));

-- Missing info / action items per facility
ALTER TABLE debt_facilities ADD COLUMN IF NOT EXISTS missing_info text[];
ALTER TABLE debt_facilities ADD COLUMN IF NOT EXISTS action_required text;

-- Credit impact for DLAs (affects refinance eligibility)
ALTER TABLE debt_facilities ADD COLUMN IF NOT EXISTS credit_impacting boolean DEFAULT false;
ALTER TABLE debt_facilities ADD COLUMN IF NOT EXISTS credit_impact_notes text;

-- Expand facility_type CHECK to include statutory obligations
ALTER TABLE debt_facilities DROP CONSTRAINT IF EXISTS debt_facilities_facility_type_check;
ALTER TABLE debt_facilities ADD CONSTRAINT debt_facilities_facility_type_check
  CHECK (facility_type IN (
    'term_loan', 'unsecured_loan', 'secured_loan', 'mca',
    'credit_card', 'overdraft', 'government_loan', 'director_loan',
    'creditor_plan', 'personal_loan',
    'paye_plan', 'vat_liability', 'corp_tax',
    'other'
  ));

-- ============================================================
-- 2. VAT quarterly tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS vat_quarters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  quarter_label text NOT NULL,        -- e.g. 'Q1 2026'
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  output_vat    numeric(12,2) DEFAULT 0,    -- VAT collected on sales
  input_vat     numeric(12,2) DEFAULT 0,    -- VAT paid on purchases
  net_vat       numeric(12,2) DEFAULT 0,    -- positive = owe HMRC, negative = refund expected
  status        text DEFAULT 'pending' CHECK (status IN (
    'pending', 'filed', 'paid', 'refund_received', 'refund_pending', 'overdue', 'payment_plan'
  )),
  filed_date    date,
  payment_date  date,
  hmrc_ref      text,
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- RLS for vat_quarters
ALTER TABLE vat_quarters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vat_quarters_org_read" ON vat_quarters;
CREATE POLICY "vat_quarters_org_read" ON vat_quarters FOR SELECT
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "vat_quarters_org_write" ON vat_quarters;
CREATE POLICY "vat_quarters_org_write" ON vat_quarters FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_vat_quarters_org ON vat_quarters(org_id);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER set_vat_quarters_updated_at
  BEFORE UPDATE ON vat_quarters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. Update existing Alonuko facilities with categories & missing info
-- ============================================================

-- Set categories for existing facilities
UPDATE debt_facilities SET category = 'lender'
  WHERE facility_type IN ('term_loan', 'unsecured_loan', 'secured_loan', 'mca', 'credit_card', 'overdraft', 'government_loan', 'personal_loan');

UPDATE debt_facilities SET category = 'creditor'
  WHERE facility_type = 'creditor_plan';

UPDATE debt_facilities SET category = 'director_loan'
  WHERE facility_type = 'director_loan';

-- Flag Gbemi DLAs as credit-impacting (she's CEO/majority, affects refinance)
UPDATE debt_facilities
  SET credit_impacting = true,
      credit_impact_notes = 'Gbemi is CEO and majority shareholder. Personal credit score directly affects company refinance eligibility (Creative UK, Sigma, Capify all assess director credit). These loans impact her credit utilisation ratio.'
  WHERE director_name = 'Gbemi' AND facility_type = 'director_loan';

-- Set missing info flags where we need statements or data
UPDATE debt_facilities SET missing_info = ARRAY['Latest statement needed', 'Confirm current balance']
  WHERE facility_name = 'BizCap (FinCap)';

UPDATE debt_facilities SET missing_info = ARRAY['Latest statement needed', 'Confirm sweep rate vs balance']
  WHERE facility_name LIKE 'YouLend%';

UPDATE debt_facilities SET missing_info = ARRAY['Confirm repayment plan terms']
  WHERE facility_name = 'Yousuf - Creditor';

UPDATE debt_facilities SET missing_info = ARRAY['Confirm DD amount and start date']
  WHERE facility_name = 'Gbemi - Virgin CC';

UPDATE debt_facilities SET missing_info = ARRAY['Confirm current balance vs original']
  WHERE facility_name = 'Gbemi - Lloyds CC';

UPDATE debt_facilities SET missing_info = ARRAY['Confirm if fully paid off']
  WHERE facility_name = 'Got Capital';

UPDATE debt_facilities SET action_required = 'Agree payment plan with Create — currently overdue'
  WHERE facility_name = 'Create Staff - Payment Plan';

UPDATE debt_facilities SET action_required = 'No repayment plan agreed. Need to negotiate terms.'
  WHERE facility_name = 'Yousuf - Creditor';
