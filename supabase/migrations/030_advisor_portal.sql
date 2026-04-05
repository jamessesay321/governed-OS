-- Migration 030: Advisor Portal
-- Enables advisors to manage multiple client organisations

-- ── Table ──
CREATE TABLE IF NOT EXISTS advisor_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'advisor',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- An advisor can only have one relationship with a given org
  UNIQUE (advisor_user_id, client_org_id)
);

-- ── Indexes ──
CREATE INDEX idx_advisor_clients_advisor ON advisor_clients(advisor_user_id);
CREATE INDEX idx_advisor_clients_org ON advisor_clients(client_org_id);

-- ── RLS ──
ALTER TABLE advisor_clients ENABLE ROW LEVEL SECURITY;

-- Advisors can read only their own rows
CREATE POLICY "advisor_clients_select_own"
  ON advisor_clients
  FOR SELECT
  USING (advisor_user_id = auth.uid());

-- Service role can insert (admin operations)
CREATE POLICY "advisor_clients_insert_service"
  ON advisor_clients
  FOR INSERT
  WITH CHECK (true);

-- Service role can update status
CREATE POLICY "advisor_clients_update_service"
  ON advisor_clients
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_advisor_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_advisor_clients_updated_at
  BEFORE UPDATE ON advisor_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_advisor_clients_updated_at();
