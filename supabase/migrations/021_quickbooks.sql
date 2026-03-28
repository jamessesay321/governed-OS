-- QuickBooks Online connections table
-- Mirrors the xero_connections pattern: one connection per org, encrypted tokens.

CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  realm_id TEXT NOT NULL,
  company_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  connected_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id)
);

-- RLS: only org members can see their own connection
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org QBO connection"
  ON quickbooks_connections FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- Service role handles inserts/updates (token storage happens server-side)

-- Add source column to chart_of_accounts and raw_transactions if not exists
-- This allows both Xero and QBO data to coexist in the same tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chart_of_accounts' AND column_name = 'source'
  ) THEN
    ALTER TABLE chart_of_accounts ADD COLUMN source TEXT DEFAULT 'xero';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'raw_transactions' AND column_name = 'source'
  ) THEN
    ALTER TABLE raw_transactions ADD COLUMN source TEXT DEFAULT 'xero';
  END IF;
END $$;

-- Index for quick connection lookups
CREATE INDEX IF NOT EXISTS idx_qbo_connections_org_status
  ON quickbooks_connections(org_id, status);

COMMENT ON TABLE quickbooks_connections IS 'QuickBooks Online OAuth connections. One per org. Tokens encrypted at app level (AES-256-GCM).';
