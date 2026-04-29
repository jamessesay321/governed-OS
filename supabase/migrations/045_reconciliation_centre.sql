-- ============================================================
-- 045_reconciliation_centre.sql
-- Reconciliation Centre (R5)
--
-- Cross-checks each financial KPI against multiple integrations and
-- surfaces drift. Three tables:
--   - reconciliation_kpis      registry of which KPIs reconcile against
--                              which sources (per org).
--   - reconciliation_runs      history of every reconciliation run with
--                              the per-source values captured at the time.
--   - drift_log                individual drifts opened from a run, with
--                              status / root cause / resolution tracking.
-- ============================================================

-- ============================================================
-- 1. reconciliation_kpis
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reconciliation_kpis (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  kpi_key           TEXT NOT NULL,
  label             TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'revenue',
  period_grain      TEXT NOT NULL DEFAULT 'monthly'
                    CHECK (period_grain IN ('monthly', 'quarterly', 'annual')),
  -- [{ integration: 'xero', query_hint: 'sum of REVENUE class' }, ...]
  sources           JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- { green_pct: 1, amber_pct: 5 }
  drift_thresholds  JSONB NOT NULL DEFAULT '{"green_pct":1,"amber_pct":5}'::jsonb,
  -- The integration whose value is treated as the authoritative number for
  -- drift calculations. Other sources are compared against this.
  primary_source    TEXT NOT NULL DEFAULT 'xero',
  -- When true, drift is informational only (no green/amber/red status)
  informational     BOOLEAN NOT NULL DEFAULT false,
  enabled           BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, kpi_key)
);

CREATE INDEX idx_recon_kpis_org ON public.reconciliation_kpis(org_id);
CREATE INDEX idx_recon_kpis_enabled ON public.reconciliation_kpis(org_id, enabled);

ALTER TABLE public.reconciliation_kpis ENABLE ROW LEVEL SECURITY;

-- Org-level select for any member
CREATE POLICY "recon_kpis_select" ON public.reconciliation_kpis
  FOR SELECT USING (org_id = public.user_org_id());

-- Advisor+ writes
CREATE POLICY "recon_kpis_insert" ON public.reconciliation_kpis
  FOR INSERT WITH CHECK (
    org_id = public.user_org_id()
    AND public.user_has_role('advisor')
  );

CREATE POLICY "recon_kpis_update" ON public.reconciliation_kpis
  FOR UPDATE USING (
    org_id = public.user_org_id()
    AND public.user_has_role('advisor')
  );

CREATE POLICY "recon_kpis_delete" ON public.reconciliation_kpis
  FOR DELETE USING (
    org_id = public.user_org_id()
    AND public.user_has_role('admin')
  );

-- ============================================================
-- 2. reconciliation_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reconciliation_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  kpi_id            UUID NOT NULL REFERENCES public.reconciliation_kpis(id) ON DELETE CASCADE,
  period            DATE NOT NULL,
  triggered_by      TEXT NOT NULL DEFAULT 'manual'
                    CHECK (triggered_by IN ('cron', 'webhook', 'manual')),
  -- [{ integration: 'xero', value: 12345.67, queried_at: '...', skipped: false, error: null }, ...]
  source_values     JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_value     NUMERIC(15, 2),
  max_drift_pct     NUMERIC(8, 2),
  status            TEXT NOT NULL DEFAULT 'green'
                    CHECK (status IN ('green', 'amber', 'red', 'informational', 'error')),
  completed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  error             TEXT
);

CREATE INDEX idx_recon_runs_org_kpi_period ON public.reconciliation_runs(org_id, kpi_id, period DESC);
CREATE INDEX idx_recon_runs_org_period ON public.reconciliation_runs(org_id, period DESC);
CREATE INDEX idx_recon_runs_status ON public.reconciliation_runs(org_id, status);

ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recon_runs_select" ON public.reconciliation_runs
  FOR SELECT USING (org_id = public.user_org_id());

CREATE POLICY "recon_runs_insert" ON public.reconciliation_runs
  FOR INSERT WITH CHECK (
    org_id = public.user_org_id()
    AND public.user_has_role('advisor')
  );

-- Runs are immutable history — no UPDATE / DELETE policies exposed to clients.
-- Service role bypasses RLS for cron-triggered writes.

-- ============================================================
-- 3. drift_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.drift_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  run_id            UUID NOT NULL REFERENCES public.reconciliation_runs(id) ON DELETE CASCADE,
  kpi_id            UUID NOT NULL REFERENCES public.reconciliation_kpis(id) ON DELETE CASCADE,
  period            DATE NOT NULL,
  drift_pct         NUMERIC(8, 2) NOT NULL DEFAULT 0,
  drift_amount      NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'investigating', 'resolved', 'wont_fix')),
  -- Severity at time of opening (red / amber). Kept separate from status so we
  -- can filter "all amber drifts" independent of investigation state.
  severity          TEXT NOT NULL DEFAULT 'amber'
                    CHECK (severity IN ('amber', 'red')),
  root_cause        TEXT,
  resolution        TEXT,
  opened_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at         TIMESTAMPTZ,
  closed_by         UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_drift_log_org_kpi_period ON public.drift_log(org_id, kpi_id, period DESC);
CREATE INDEX idx_drift_log_org_status ON public.drift_log(org_id, status);
CREATE INDEX idx_drift_log_run ON public.drift_log(run_id);

ALTER TABLE public.drift_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drift_log_select" ON public.drift_log
  FOR SELECT USING (org_id = public.user_org_id());

CREATE POLICY "drift_log_insert" ON public.drift_log
  FOR INSERT WITH CHECK (
    org_id = public.user_org_id()
    AND public.user_has_role('advisor')
  );

CREATE POLICY "drift_log_update" ON public.drift_log
  FOR UPDATE USING (
    org_id = public.user_org_id()
    AND public.user_has_role('advisor')
  );

-- Drift log entries are not deleted from the UI; service role can clean up
-- if required.

-- ============================================================
-- 4. slack_outbox (lightweight queue for v1 — actual Slack posting is
--    handled by a later worker)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.slack_outbox (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  channel      TEXT,
  message      TEXT NOT NULL,
  context      JSONB NOT NULL DEFAULT '{}'::jsonb,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'sent', 'failed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at      TIMESTAMPTZ
);

CREATE INDEX idx_slack_outbox_org_status ON public.slack_outbox(org_id, status, created_at DESC);

ALTER TABLE public.slack_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slack_outbox_select" ON public.slack_outbox
  FOR SELECT USING (org_id = public.user_org_id());

CREATE POLICY "slack_outbox_insert" ON public.slack_outbox
  FOR INSERT WITH CHECK (
    org_id = public.user_org_id()
    AND public.user_has_role('advisor')
  );

-- ============================================================
-- 5. updated_at trigger for reconciliation_kpis
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_recon_kpis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recon_kpis_updated_at ON public.reconciliation_kpis;
CREATE TRIGGER recon_kpis_updated_at
  BEFORE UPDATE ON public.reconciliation_kpis
  FOR EACH ROW EXECUTE FUNCTION public.update_recon_kpis_updated_at();

-- ============================================================
-- 6. pg_cron scheduling (optional — only runs if pg_cron + pg_net are
--    available on the Supabase project). Wrapped in DO block so the
--    migration succeeds locally without these extensions.
--
--    NOTE: replace <APP_URL> and <CRON_SECRET> after deploy. The endpoint
--    /api/reconciliation/run requires the X-Cron-Secret header to match
--    process.env.CRON_SECRET.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM cron.schedule(
      'reconciliation-15min',
      '*/15 * * * *',
      $cron$
        SELECT net.http_post(
          url := current_setting('app.settings.app_url', true) || '/api/reconciliation/run',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'X-Cron-Secret', current_setting('app.settings.cron_secret', true)
          ),
          body := '{}'::jsonb
        );
      $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron schedule for reconciliation-15min skipped: %', SQLERRM;
END $$;
