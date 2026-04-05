-- ============================================================
-- 031_investor_portal.sql
-- Investor Portal: organisations access + shared metric controls
-- ============================================================

-- Investor access to organisations (magic-link based)
CREATE TABLE IF NOT EXISTS investor_organisations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  access_level  text NOT NULL DEFAULT 'read',
  invited_by    uuid REFERENCES auth.users(id),
  magic_link_token uuid UNIQUE DEFAULT gen_random_uuid(),
  magic_link_expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at    timestamptz NOT NULL DEFAULT now(),
  accepted_at   timestamptz
);

-- Controls which KPI metric keys are visible to investors for a given org
CREATE TABLE IF NOT EXISTS investor_shared_metrics (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  is_shared  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, metric_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investor_orgs_user
  ON investor_organisations(investor_user_id);
CREATE INDEX IF NOT EXISTS idx_investor_orgs_org
  ON investor_organisations(org_id);
CREATE INDEX IF NOT EXISTS idx_investor_orgs_token
  ON investor_organisations(magic_link_token);
CREATE INDEX IF NOT EXISTS idx_investor_shared_metrics_org
  ON investor_shared_metrics(org_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE investor_organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_shared_metrics ENABLE ROW LEVEL SECURITY;

-- investor_organisations: investors see only their own rows
CREATE POLICY investor_orgs_select_own
  ON investor_organisations FOR SELECT
  USING (investor_user_id = auth.uid());

-- investor_organisations: org owners/admins can see all rows for their org
CREATE POLICY investor_orgs_select_org_members
  ON investor_organisations FOR SELECT
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    )
  );

-- investor_organisations: org owners/admins can insert (invite)
CREATE POLICY investor_orgs_insert_org_members
  ON investor_organisations FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    )
  );

-- investor_organisations: org owners/admins can update (revoke, accept)
CREATE POLICY investor_orgs_update_org_members
  ON investor_organisations FOR UPDATE
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    )
  );

-- investor_organisations: org owners/admins can delete (remove investor)
CREATE POLICY investor_orgs_delete_org_members
  ON investor_organisations FOR DELETE
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    )
  );

-- investor_shared_metrics: org owners/admins can manage
CREATE POLICY investor_metrics_select_org
  ON investor_shared_metrics FOR SELECT
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    )
  );

-- investor_shared_metrics: investors can see shared metrics for orgs they have access to
CREATE POLICY investor_metrics_select_investor
  ON investor_shared_metrics FOR SELECT
  USING (
    org_id IN (
      SELECT io.org_id FROM investor_organisations io
      WHERE io.investor_user_id = auth.uid() AND io.accepted_at IS NOT NULL
    )
  );

CREATE POLICY investor_metrics_insert_org
  ON investor_shared_metrics FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    )
  );

CREATE POLICY investor_metrics_update_org
  ON investor_shared_metrics FOR UPDATE
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    )
  );

CREATE POLICY investor_metrics_delete_org
  ON investor_shared_metrics FOR DELETE
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'admin')
    )
  );
