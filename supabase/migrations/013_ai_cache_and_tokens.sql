-- ============================================================================
-- 013: AI Cache & Token Usage Tables
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ai_cache – stores cached LLM responses keyed by (org_id, cache_key)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_cache (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cache_key   text NOT NULL,
  prompt_hash text NOT NULL,
  response    text NOT NULL,
  tokens_used integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,

  UNIQUE (org_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_org_id    ON ai_cache (org_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_cache_key ON ai_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires   ON ai_cache (expires_at);

ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ai_cache"
  ON ai_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- ai_token_usage – per-call token tracking for budget enforcement
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_token_usage (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  tokens_used integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_token_usage_org_id     ON ai_token_usage (org_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_created_at ON ai_token_usage (created_at);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_org_month  ON ai_token_usage (org_id, created_at);

ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ai_token_usage"
  ON ai_token_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);
