-- ============================================================
-- Advisory OS — Migration 011: Demo Mode
-- Adds columns to track onboarding path (demo vs full setup)
-- and store demo-specific metadata on the organisation.
-- ============================================================

-- Onboarding mode: 'demo' | 'full' | null
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS onboarding_mode text;

-- Demo metadata
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS demo_company_name text;

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS demo_industry text;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_organisations_onboarding_mode
  ON organisations (onboarding_mode)
  WHERE onboarding_mode IS NOT NULL;

COMMENT ON COLUMN organisations.onboarding_mode IS 'Onboarding path chosen: demo (sample data) or full (real data setup). NULL means not yet chosen.';
COMMENT ON COLUMN organisations.demo_company_name IS 'Company name entered during demo setup, used for personalised sample data.';
COMMENT ON COLUMN organisations.demo_industry IS 'Industry selected during demo setup, used for industry-specific sample data.';
