-- Migration 035: Daily Briefing Cache
-- Caches AI-generated daily briefings to avoid regeneration within 24 hours.
-- Used by the Key Actions page (F-077) and daily briefing endpoint.

CREATE TABLE IF NOT EXISTS daily_briefing_cache (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  briefing_date date NOT NULL,
  content     jsonb NOT NULL,
  source_refs jsonb,
  generated_at timestamptz DEFAULT now(),
  expires_at  timestamptz DEFAULT now() + interval '24 hours',
  created_at  timestamptz DEFAULT now(),
  UNIQUE(org_id, briefing_date)
);

-- Index for fast lookups by org + date
CREATE INDEX IF NOT EXISTS idx_daily_briefing_cache_org_date
  ON daily_briefing_cache(org_id, briefing_date DESC);

-- RLS: org members only
ALTER TABLE daily_briefing_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read their briefing cache"
  ON daily_briefing_cache FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Service role can insert/update (API route uses service client)
CREATE POLICY "Service role can manage briefing cache"
  ON daily_briefing_cache FOR ALL
  USING (true)
  WITH CHECK (true);
