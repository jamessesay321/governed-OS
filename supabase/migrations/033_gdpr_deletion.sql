-- ============================================================
-- Migration 033: GDPR Data Deletion Requests
-- Tracks organisation-level data deletion requests with a
-- mandatory 72-hour cooling-off period.
-- audit_logs are NEVER deleted (immutable by design).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES public.organisations(id),
  requested_by        UUID NOT NULL REFERENCES auth.users(id),
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled')),
  reason              TEXT,
  confirmation_token  UUID UNIQUE DEFAULT gen_random_uuid(),
  confirmed_at        TIMESTAMPTZ,
  cooling_off_until   TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  deleted_tables      JSONB,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deletion_requests_org
  ON public.data_deletion_requests (org_id);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_status
  ON public.data_deletion_requests (status);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_token
  ON public.data_deletion_requests (confirmation_token);

-- RLS --
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Only org owner can view deletion requests for their org
CREATE POLICY "Owner can view own org deletion requests"
  ON public.data_deletion_requests FOR SELECT
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'owner'
    )
  );

-- Only org owner can create deletion requests
CREATE POLICY "Owner can create deletion request"
  ON public.data_deletion_requests FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'owner'
    )
  );

-- Only service role can update (status transitions via API)
-- No UPDATE policy for authenticated users.
