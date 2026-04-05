-- Migration 036: Client Identity Tracking
--
-- Creates a deduplicated client registry from raw_transactions contact_name.
-- Supports cross-year client tracking for deferred revenue analysis.
-- Critical for fashion/bridal businesses where payment spans multiple FYs.

-- Client registry table
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,

  -- Identity
  display_name text NOT NULL,
  normalised_name text NOT NULL, -- Lowercase, trimmed, for dedup matching
  xero_contact_id text, -- If available from Xero
  email text,
  phone text,

  -- Classification
  client_type text NOT NULL DEFAULT 'customer' CHECK (client_type IN ('customer', 'supplier', 'both')),
  is_active boolean NOT NULL DEFAULT true,

  -- Financial summary (denormalised for performance)
  total_invoiced numeric(15,2) DEFAULT 0,
  total_paid numeric(15,2) DEFAULT 0,
  outstanding_balance numeric(15,2) DEFAULT 0,
  first_transaction_date date,
  last_transaction_date date,
  transaction_count integer DEFAULT 0,

  -- Cross-year tracking
  first_year integer, -- e.g. 2024
  latest_year integer, -- e.g. 2025
  spans_multiple_years boolean DEFAULT false,

  -- Metadata
  tags text[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(org_id);
CREATE INDEX IF NOT EXISTS idx_clients_normalised_name ON public.clients(org_id, normalised_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_unique_name ON public.clients(org_id, normalised_name);
CREATE INDEX IF NOT EXISTS idx_clients_type ON public.clients(org_id, client_type);
CREATE INDEX IF NOT EXISTS idx_clients_spans_years ON public.clients(org_id, spans_multiple_years) WHERE spans_multiple_years = true;

-- Client-to-transaction mapping (many-to-many for merged clients)
CREATE TABLE IF NOT EXISTS public.client_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.raw_transactions(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,

  -- Denormalised for query performance
  transaction_date date NOT NULL,
  transaction_type text NOT NULL, -- 'invoice' | 'bill'
  amount numeric(15,2) NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_tx_client ON public.client_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tx_org ON public.client_transactions(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_tx_unique ON public.client_transactions(client_id, transaction_id);

-- RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY clients_select ON public.clients FOR SELECT
  USING (org_id IN (SELECT id FROM public.organisations WHERE id = org_id));

CREATE POLICY clients_insert ON public.clients FOR INSERT
  WITH CHECK (org_id IN (SELECT id FROM public.organisations WHERE id = org_id));

CREATE POLICY clients_update ON public.clients FOR UPDATE
  USING (org_id IN (SELECT id FROM public.organisations WHERE id = org_id));

CREATE POLICY client_transactions_select ON public.client_transactions FOR SELECT
  USING (org_id IN (SELECT id FROM public.organisations WHERE id = org_id));

CREATE POLICY client_transactions_insert ON public.client_transactions FOR INSERT
  WITH CHECK (org_id IN (SELECT id FROM public.organisations WHERE id = org_id));

-- Updated at trigger
CREATE OR REPLACE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
