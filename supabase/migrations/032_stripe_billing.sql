-- ============================================================
-- Migration 032: Stripe Billing — Subscriptions table
-- Links organisations to Stripe customers/subscriptions and
-- stores the canonical plan + billing period.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan          TEXT NOT NULL DEFAULT 'free',
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_org_id_unique UNIQUE (org_id)
);

-- Index for quick lookup by stripe customer
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON public.subscriptions (stripe_customer_id);

-- RLS --
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Members can view their own org's subscription
CREATE POLICY "Members can view own org subscription"
  ON public.subscriptions FOR SELECT
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Only service role can insert/update (via webhook)
-- No INSERT/UPDATE policies for authenticated users — service role bypasses RLS.

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.subscriptions_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.subscriptions_set_updated_at();
