-- Bridal Order Management: orders and payment tracking for Alonuko
-- All tables enforce org_id multi-tenancy with RLS

-- ============================================================
-- 1. bridal_orders — master list of bridal/event orders
-- ============================================================
CREATE TABLE IF NOT EXISTS bridal_orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id           uuid REFERENCES clients(id),
  client_name         text NOT NULL,
  email               text,
  phone               text,
  status              text NOT NULL DEFAULT 'enquiry' CHECK (status IN (
    'confirmed', 'on_hold', 'cancelled', 'completed', 'enquiry'
  )),
  dress_style         text,
  dress_name          text,
  dress_price         numeric(12,2),
  actual_dress_choice text,
  wedding_date        date,
  event_type          text DEFAULT 'wedding',
  order_date          date,
  fitting_date        date,
  completion_date     date,
  notes               text,
  tags                text[] DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bridal_orders_org ON bridal_orders(org_id);
CREATE INDEX idx_bridal_orders_client ON bridal_orders(client_id);
CREATE INDEX idx_bridal_orders_status ON bridal_orders(org_id, status);
CREATE INDEX idx_bridal_orders_wedding ON bridal_orders(org_id, wedding_date);

ALTER TABLE bridal_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bridal_orders_select" ON bridal_orders
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "bridal_orders_insert" ON bridal_orders
  FOR INSERT WITH CHECK (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "bridal_orders_update" ON bridal_orders
  FOR UPDATE USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "bridal_orders_delete" ON bridal_orders
  FOR DELETE USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================
-- 2. bridal_order_payments — deposit, interim, balance payments
-- ============================================================
CREATE TABLE IF NOT EXISTS bridal_order_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES bridal_orders(id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  payment_type    text NOT NULL CHECK (payment_type IN (
    'deposit', 'interim', 'balance', 'refund'
  )),
  amount          numeric(12,2) NOT NULL,
  due_date        date,
  paid_date       date,
  payment_method  text,
  xero_invoice_id text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'paid', 'overdue', 'waived'
  )),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bridal_payments_order ON bridal_order_payments(order_id);
CREATE INDEX idx_bridal_payments_org ON bridal_order_payments(org_id);
CREATE INDEX idx_bridal_payments_status ON bridal_order_payments(org_id, status);

ALTER TABLE bridal_order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bridal_payments_select" ON bridal_order_payments
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "bridal_payments_insert" ON bridal_order_payments
  FOR INSERT WITH CHECK (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "bridal_payments_update" ON bridal_order_payments
  FOR UPDATE USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "bridal_payments_delete" ON bridal_order_payments
  FOR DELETE USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================
-- 3. Updated timestamp trigger for bridal_orders
-- ============================================================
CREATE OR REPLACE FUNCTION update_bridal_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bridal_orders_updated
  BEFORE UPDATE ON bridal_orders
  FOR EACH ROW EXECUTE FUNCTION update_bridal_orders_updated_at();
