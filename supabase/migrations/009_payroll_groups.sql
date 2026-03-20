-- 009: Payroll Groups
-- Group salary nominals by team for fully loaded staff cost analysis.
-- From Kevin Steel / Inflectiv Intelligence pattern.

CREATE TABLE IF NOT EXISTS payroll_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  employer_ni_rate NUMERIC(5,4) DEFAULT 0.1380,
  employer_ni_threshold NUMERIC(10,2) DEFAULT 9100.00,
  employer_pension_rate NUMERIC(5,4) DEFAULT 0.0300,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  payroll_group_id UUID NOT NULL REFERENCES payroll_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_title TEXT,
  annual_gross_salary NUMERIC(12,2) NOT NULL,
  start_date DATE,
  end_date DATE,
  is_forecast BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE payroll_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_groups_select" ON payroll_groups
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "payroll_groups_insert" ON payroll_groups
  FOR INSERT WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "payroll_groups_update" ON payroll_groups
  FOR UPDATE USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "payroll_groups_delete" ON payroll_groups
  FOR DELETE USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "payroll_group_members_select" ON payroll_group_members
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "payroll_group_members_insert" ON payroll_group_members
  FOR INSERT WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "payroll_group_members_update" ON payroll_group_members
  FOR UPDATE USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "payroll_group_members_delete" ON payroll_group_members
  FOR DELETE USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_payroll_groups_org ON payroll_groups(org_id);
CREATE INDEX idx_payroll_members_group ON payroll_group_members(payroll_group_id);
CREATE INDEX idx_payroll_members_org ON payroll_group_members(org_id);
