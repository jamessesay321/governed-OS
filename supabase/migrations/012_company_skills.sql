-- Company Skills: Auto-generated AI knowledge profiles per company
-- These are loaded into every AI prompt to provide business-specific context

CREATE TABLE IF NOT EXISTS company_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  skill_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

ALTER TABLE company_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org skills"
  ON company_skills FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Service role can manage skills"
  ON company_skills FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE company_skills IS 'Auto-generated AI knowledge profiles per company. Loaded into every AI prompt for business-specific context.';
