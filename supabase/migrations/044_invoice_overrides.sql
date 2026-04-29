-- Cash In / Invoices: per-invoice user overrides + cached customer payment profiles
-- Supports the /cash/cash-in horizon view and expected-late prediction algorithm.
-- All tables enforce org_id multi-tenancy with RLS.

-- ============================================================
-- 1. invoice_forecast_overrides — user-set per-invoice include/date overrides
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_forecast_overrides (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  invoice_xero_id         text NOT NULL,
  override_date           date,                       -- when user expects payment (overrides predicted)
  excluded_from_forecast  boolean NOT NULL DEFAULT false,
  note                    text,
  created_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_invoice_overrides_unique
  ON invoice_forecast_overrides(org_id, invoice_xero_id);
CREATE INDEX idx_invoice_overrides_org
  ON invoice_forecast_overrides(org_id);

ALTER TABLE invoice_forecast_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_overrides_select" ON invoice_forecast_overrides
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "invoice_overrides_insert" ON invoice_forecast_overrides
  FOR INSERT WITH CHECK (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "invoice_overrides_update" ON invoice_forecast_overrides
  FOR UPDATE USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "invoice_overrides_delete" ON invoice_forecast_overrides
  FOR DELETE USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================
-- 2. customer_payment_profiles — cached per-customer payment behaviour
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_payment_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  contact_xero_id     text NOT NULL,
  contact_name        text,
  avg_days_late       numeric(8,2) NOT NULL DEFAULT 0,
  weighted_days_late  numeric(8,2) NOT NULL DEFAULT 0,
  variance_days       numeric(10,2) NOT NULL DEFAULT 0,
  sample_size         integer NOT NULL DEFAULT 0,
  confidence          text NOT NULL DEFAULT 'low' CHECK (confidence IN ('high', 'medium', 'low')),
  last_computed_at    timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_customer_payment_profiles_unique
  ON customer_payment_profiles(org_id, contact_xero_id);
CREATE INDEX idx_customer_payment_profiles_org
  ON customer_payment_profiles(org_id);

ALTER TABLE customer_payment_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_payment_profiles_select" ON customer_payment_profiles
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "customer_payment_profiles_insert" ON customer_payment_profiles
  FOR INSERT WITH CHECK (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "customer_payment_profiles_update" ON customer_payment_profiles
  FOR UPDATE USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "customer_payment_profiles_delete" ON customer_payment_profiles
  FOR DELETE USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================
-- 3. updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_invoice_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_forecast_overrides_updated
  BEFORE UPDATE ON invoice_forecast_overrides
  FOR EACH ROW EXECUTE FUNCTION update_invoice_overrides_updated_at();

CREATE TRIGGER customer_payment_profiles_updated
  BEFORE UPDATE ON customer_payment_profiles
  FOR EACH ROW EXECUTE FUNCTION update_invoice_overrides_updated_at();
