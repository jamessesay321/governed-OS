-- ============================================================
-- F-069: Dashboard Widget Configs
-- Stores per-user dashboard widget configuration and template selection
-- ============================================================

CREATE TABLE IF NOT EXISTS dashboard_widget_configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  template_name text,
  widgets     jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Each user has one config per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_widget_configs_user_org
  ON dashboard_widget_configs(user_id, org_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_widget_configs_org
  ON dashboard_widget_configs(org_id);

-- RLS: user sees own configs only
ALTER TABLE dashboard_widget_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own widget configs"
  ON dashboard_widget_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own widget configs"
  ON dashboard_widget_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own widget configs"
  ON dashboard_widget_configs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_widget_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_widget_configs_updated_at
  BEFORE UPDATE ON dashboard_widget_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_widget_configs_updated_at();
