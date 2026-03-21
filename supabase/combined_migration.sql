-- ============================================================
-- Governed OS — Combined Migration (Safe to Re-run)
-- All statements are idempotent: IF NOT EXISTS, DO $$ exception blocks
-- Order: 001_schema -> 002_scenario_engine -> 003_scenario_chat -> 004_remaining_tables
-- ============================================================

-- ############################################################
-- 001_schema.sql — Phase 1 Schema
-- ############################################################

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ORGANISATIONS
-- ============================================================
create table if not exists public.organisations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organisations enable row level security;

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
DO $$ BEGIN
  create type public.user_role as enum ('owner', 'admin', 'advisor', 'viewer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,
  role public.user_role not null default 'viewer',
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_org_id on public.profiles(org_id);

alter table public.profiles enable row level security;

-- ============================================================
-- ORG INVITATIONS
-- ============================================================
DO $$ BEGIN
  create type public.invitation_status as enum ('pending', 'accepted', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

create table if not exists public.org_invitations (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'viewer',
  invited_by uuid not null references auth.users(id),
  status public.invitation_status not null default 'pending',
  token uuid not null default uuid_generate_v4(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_invitations_token on public.org_invitations(token);
create index if not exists idx_invitations_org_id on public.org_invitations(org_id);
create index if not exists idx_invitations_email on public.org_invitations(email);

alter table public.org_invitations enable row level security;

-- ============================================================
-- XERO CONNECTIONS
-- ============================================================
DO $$ BEGIN
  create type public.xero_connection_status as enum ('active', 'disconnected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

create table if not exists public.xero_connections (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  xero_tenant_id text not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  connected_by uuid not null references auth.users(id),
  status public.xero_connection_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_xero_connections_org on public.xero_connections(org_id);

alter table public.xero_connections enable row level security;

-- ============================================================
-- CHART OF ACCOUNTS
-- ============================================================
create table if not exists public.chart_of_accounts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  xero_account_id text not null,
  code text not null default '',
  name text not null,
  type text not null,
  class text not null default '',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coa_org_id on public.chart_of_accounts(org_id);
create unique index if not exists idx_coa_org_xero on public.chart_of_accounts(org_id, xero_account_id);

alter table public.chart_of_accounts enable row level security;

-- ============================================================
-- RAW TRANSACTIONS (source of truth from Xero)
-- ============================================================
DO $$ BEGIN
  create type public.transaction_type as enum (
    'invoice', 'bill', 'payment', 'bank_transaction', 'credit_note', 'manual_journal'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

create table if not exists public.raw_transactions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  xero_id text not null,
  date date not null,
  type public.transaction_type not null,
  contact_name text,
  line_items jsonb not null default '[]',
  total numeric(15,2) not null default 0,
  currency text not null default 'AUD',
  raw_payload jsonb not null default '{}',
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_raw_tx_org_id on public.raw_transactions(org_id);
create index if not exists idx_raw_tx_date on public.raw_transactions(org_id, date);
create unique index if not exists idx_raw_tx_org_xero on public.raw_transactions(org_id, xero_id);

alter table public.raw_transactions enable row level security;

-- ============================================================
-- NORMALISED FINANCIALS
-- ============================================================
create table if not exists public.normalised_financials (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  period date not null, -- always first of month
  account_id uuid not null references public.chart_of_accounts(id),
  amount numeric(15,2) not null default 0,
  transaction_count integer not null default 0,
  source text not null default 'xero',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_norm_fin_org_id on public.normalised_financials(org_id);
create unique index if not exists idx_norm_fin_org_period_account on public.normalised_financials(org_id, period, account_id);

alter table public.normalised_financials enable row level security;

-- ============================================================
-- SYNC LOG
-- ============================================================
DO $$ BEGIN
  create type public.sync_status as enum ('running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

create table if not exists public.sync_log (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  sync_type text not null,
  status public.sync_status not null default 'running',
  records_synced integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_sync_log_org_id on public.sync_log(org_id);

alter table public.sync_log enable row level security;

-- ============================================================
-- AUDIT LOGS (IMMUTABLE)
-- ============================================================
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  changes jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_org_id on public.audit_logs(org_id);
create index if not exists idx_audit_logs_action on public.audit_logs(org_id, action);
create index if not exists idx_audit_logs_entity on public.audit_logs(org_id, entity_type, entity_id);
create index if not exists idx_audit_logs_created on public.audit_logs(org_id, created_at desc);

alter table public.audit_logs enable row level security;

-- ============================================================
-- HELPER FUNCTION: Check if user belongs to org
-- ============================================================
create or replace function public.user_org_id()
returns uuid
language sql
stable
security definer
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

-- Helper: check user role level
create or replace function public.user_has_role(required_role public.user_role)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and (
      case role
        when 'owner' then 4
        when 'admin' then 3
        when 'advisor' then 2
        when 'viewer' then 1
      end
    ) >= (
      case required_role
        when 'owner' then 4
        when 'admin' then 3
        when 'advisor' then 2
        when 'viewer' then 1
      end
    )
  )
$$;

-- ============================================================
-- RLS POLICIES (001)
-- ============================================================

-- ORGANISATIONS
DO $$ BEGIN
  create policy "Users can view their own org"
    on public.organisations for select
    using (id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Owners can update their org"
    on public.organisations for update
    using (id = public.user_org_id() and public.user_has_role('owner'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- PROFILES
DO $$ BEGIN
  create policy "Users can view profiles in their org"
    on public.profiles for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Users can update their own profile"
    on public.profiles for update
    using (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Admins can update profiles in their org"
    on public.profiles for update
    using (org_id = public.user_org_id() and public.user_has_role('admin'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ORG INVITATIONS
DO $$ BEGIN
  create policy "Members can view invitations in their org"
    on public.org_invitations for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Admins can create invitations"
    on public.org_invitations for insert
    with check (org_id = public.user_org_id() and public.user_has_role('admin'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Admins can update invitations"
    on public.org_invitations for update
    using (org_id = public.user_org_id() and public.user_has_role('admin'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- XERO CONNECTIONS
DO $$ BEGIN
  create policy "Members can view xero connections"
    on public.xero_connections for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Admins can manage xero connections"
    on public.xero_connections for insert
    with check (org_id = public.user_org_id() and public.user_has_role('admin'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Admins can update xero connections"
    on public.xero_connections for update
    using (org_id = public.user_org_id() and public.user_has_role('admin'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Admins can delete xero connections"
    on public.xero_connections for delete
    using (org_id = public.user_org_id() and public.user_has_role('admin'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CHART OF ACCOUNTS
DO $$ BEGIN
  create policy "Members can view chart of accounts"
    on public.chart_of_accounts for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can manage chart of accounts"
    on public.chart_of_accounts for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can update chart of accounts"
    on public.chart_of_accounts for update
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- RAW TRANSACTIONS
DO $$ BEGIN
  create policy "Members can view raw transactions"
    on public.raw_transactions for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert raw transactions"
    on public.raw_transactions for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can update raw transactions"
    on public.raw_transactions for update
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- NORMALISED FINANCIALS
DO $$ BEGIN
  create policy "Members can view normalised financials"
    on public.normalised_financials for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert normalised financials"
    on public.normalised_financials for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can update normalised financials"
    on public.normalised_financials for update
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- SYNC LOG
DO $$ BEGIN
  create policy "Members can view sync log"
    on public.sync_log for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert sync log"
    on public.sync_log for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can update sync log"
    on public.sync_log for update
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AUDIT LOGS (SELECT + INSERT only)
DO $$ BEGIN
  create policy "Admins can view audit logs"
    on public.audit_logs for select
    using (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert audit logs"
    on public.audit_logs for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DO $$ BEGIN
  create trigger update_organisations_updated_at
    before update on public.organisations
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_profiles_updated_at
    before update on public.profiles
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_xero_connections_updated_at
    before update on public.xero_connections
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_coa_updated_at
    before update on public.chart_of_accounts
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_norm_fin_updated_at
    before update on public.normalised_financials
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- ############################################################
-- 002_scenario_engine.sql — Phase 2 Schema: Scenario Engine
-- ############################################################

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  create type public.assumption_type as enum ('percentage', 'currency', 'integer', 'boolean', 'decimal');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.assumption_category as enum (
    'revenue_drivers', 'pricing', 'costs', 'growth_rates',
    'headcount', 'marketing', 'capital', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.scenario_status as enum ('draft', 'active', 'locked', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.ai_commentary_type as enum ('anomaly', 'risk', 'opportunity', 'insight');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- ASSUMPTION SETS
-- ============================================================
create table if not exists public.assumption_sets (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  description text not null default '',
  version integer not null default 1,
  base_period_start date not null,
  base_period_end date not null,
  forecast_horizon_months integer not null default 12,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assumption_sets_org_id on public.assumption_sets(org_id);

alter table public.assumption_sets enable row level security;

-- ============================================================
-- ASSUMPTION VALUES
-- ============================================================
create table if not exists public.assumption_values (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  assumption_set_id uuid not null references public.assumption_sets(id) on delete cascade,
  category public.assumption_category not null,
  key text not null,
  label text not null,
  type public.assumption_type not null,
  value numeric(15,4) not null,
  effective_from date not null,
  effective_to date,
  version integer not null default 1,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assumption_values_set on public.assumption_values(assumption_set_id);
create index if not exists idx_assumption_values_org on public.assumption_values(org_id);
create index if not exists idx_assumption_values_category on public.assumption_values(assumption_set_id, category);
create unique index if not exists idx_assumption_values_unique_key_period
  on public.assumption_values(assumption_set_id, key, effective_from);

alter table public.assumption_values enable row level security;

-- ============================================================
-- SCENARIOS
-- ============================================================
create table if not exists public.scenarios (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  assumption_set_id uuid not null references public.assumption_sets(id),
  name text not null,
  description text not null default '',
  status public.scenario_status not null default 'draft',
  is_base boolean not null default false,
  created_by uuid not null references auth.users(id),
  locked_at timestamptz,
  locked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scenarios_org_id on public.scenarios(org_id);
create index if not exists idx_scenarios_assumption_set on public.scenarios(assumption_set_id);

alter table public.scenarios enable row level security;

-- ============================================================
-- SCENARIO VERSIONS (IMMUTABLE)
-- ============================================================
create table if not exists public.scenario_versions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  version integer not null,
  change_summary text not null,
  assumption_set_snapshot jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_scenario_versions_scenario on public.scenario_versions(scenario_id);
create unique index if not exists idx_scenario_versions_unique on public.scenario_versions(scenario_id, version);

alter table public.scenario_versions enable row level security;

-- ============================================================
-- MODEL VERSIONS (IMMUTABLE)
-- ============================================================
create table if not exists public.model_versions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  version integer not null,
  assumption_set_id uuid not null references public.assumption_sets(id),
  assumption_hash text not null,
  engine_version text not null default '1.0.0',
  triggered_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_model_versions_scenario on public.model_versions(scenario_id);
create unique index if not exists idx_model_versions_unique on public.model_versions(scenario_id, version);

alter table public.model_versions enable row level security;

-- ============================================================
-- MODEL SNAPSHOTS (IMMUTABLE)
-- ============================================================
create table if not exists public.model_snapshots (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  model_version_id uuid not null references public.model_versions(id),
  scenario_id uuid not null references public.scenarios(id),
  period date not null,
  revenue numeric(15,2) not null default 0,
  cost_of_sales numeric(15,2) not null default 0,
  gross_profit numeric(15,2) not null default 0,
  gross_margin_pct numeric(8,4) not null default 0,
  operating_expenses numeric(15,2) not null default 0,
  net_profit numeric(15,2) not null default 0,
  net_margin_pct numeric(8,4) not null default 0,
  cash_in numeric(15,2) not null default 0,
  cash_out numeric(15,2) not null default 0,
  net_cash_flow numeric(15,2) not null default 0,
  closing_cash numeric(15,2) not null default 0,
  burn_rate numeric(15,2) not null default 0,
  runway_months numeric(8,2) not null default 0,
  is_break_even boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_model_snapshots_model on public.model_snapshots(model_version_id);
create index if not exists idx_model_snapshots_scenario_period on public.model_snapshots(scenario_id, period);

alter table public.model_snapshots enable row level security;

-- ============================================================
-- UNIT ECONOMICS SNAPSHOTS (IMMUTABLE)
-- ============================================================
create table if not exists public.unit_economics_snapshots (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  model_version_id uuid not null references public.model_versions(id),
  scenario_id uuid not null references public.scenarios(id),
  period date not null,
  segment_key text not null,
  segment_label text not null,
  units_sold numeric(15,2) not null default 0,
  revenue_per_unit numeric(15,4) not null default 0,
  variable_cost_per_unit numeric(15,4) not null default 0,
  contribution_per_unit numeric(15,4) not null default 0,
  contribution_margin_pct numeric(8,4) not null default 0,
  total_revenue numeric(15,2) not null default 0,
  total_variable_cost numeric(15,2) not null default 0,
  total_contribution numeric(15,2) not null default 0,
  cac numeric(15,2) not null default 0,
  ltv numeric(15,2) not null default 0,
  ltv_cac_ratio numeric(8,4) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_unit_econ_model on public.unit_economics_snapshots(model_version_id);
create index if not exists idx_unit_econ_scenario_period on public.unit_economics_snapshots(scenario_id, period);

alter table public.unit_economics_snapshots enable row level security;

-- ============================================================
-- FORECAST SNAPSHOTS (IMMUTABLE)
-- ============================================================
create table if not exists public.forecast_snapshots (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  model_version_id uuid not null references public.model_versions(id),
  scenario_id uuid not null references public.scenarios(id),
  period date not null,
  metric_key text not null,
  metric_label text not null,
  actual_value numeric(15,2),
  forecast_value numeric(15,2) not null,
  variance numeric(15,2),
  variance_pct numeric(8,4),
  created_at timestamptz not null default now()
);

create index if not exists idx_forecast_model on public.forecast_snapshots(model_version_id);
create index if not exists idx_forecast_scenario_period on public.forecast_snapshots(scenario_id, period, metric_key);

alter table public.forecast_snapshots enable row level security;

-- ============================================================
-- AI COMMENTARY (IMMUTABLE)
-- ============================================================
create table if not exists public.ai_commentary (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  model_version_id uuid not null references public.model_versions(id),
  scenario_id uuid not null references public.scenarios(id),
  commentary_type public.ai_commentary_type not null,
  title text not null,
  body text not null,
  confidence_score numeric(5,4) not null,
  source_data_ids jsonb not null default '[]',
  ai_model_name text not null,
  ai_model_version text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_commentary_model on public.ai_commentary(model_version_id);
create index if not exists idx_ai_commentary_scenario on public.ai_commentary(scenario_id);

alter table public.ai_commentary enable row level security;

-- ============================================================
-- AUTO-INCREMENT VERSION TRIGGERS
-- ============================================================

-- Scenario versions: auto-increment per scenario_id
create or replace function public.next_scenario_version()
returns trigger
language plpgsql
as $$
begin
  new.version := coalesce(
    (select max(version) from public.scenario_versions where scenario_id = new.scenario_id),
    0
  ) + 1;
  return new;
end;
$$;

DO $$ BEGIN
  create trigger trg_scenario_version_auto
    before insert on public.scenario_versions
    for each row execute function public.next_scenario_version();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Model versions: auto-increment per scenario_id
create or replace function public.next_model_version()
returns trigger
language plpgsql
as $$
begin
  new.version := coalesce(
    (select max(version) from public.model_versions where scenario_id = new.scenario_id),
    0
  ) + 1;
  return new;
end;
$$;

DO $$ BEGIN
  create trigger trg_model_version_auto
    before insert on public.model_versions
    for each row execute function public.next_model_version();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- UPDATED_AT TRIGGERS (002)
-- ============================================================
DO $$ BEGIN
  create trigger update_assumption_sets_updated_at
    before update on public.assumption_sets
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_assumption_values_updated_at
    before update on public.assumption_values
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_scenarios_updated_at
    before update on public.scenarios
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- RLS POLICIES (002)
-- ============================================================

-- ASSUMPTION SETS
DO $$ BEGIN
  create policy "Members can view assumption sets"
    on public.assumption_sets for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can create assumption sets"
    on public.assumption_sets for insert
    with check (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can update assumption sets"
    on public.assumption_sets for update
    using (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ASSUMPTION VALUES
DO $$ BEGIN
  create policy "Members can view assumption values"
    on public.assumption_values for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can create assumption values"
    on public.assumption_values for insert
    with check (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can update assumption values"
    on public.assumption_values for update
    using (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- SCENARIOS
DO $$ BEGIN
  create policy "Members can view scenarios"
    on public.scenarios for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can create scenarios"
    on public.scenarios for insert
    with check (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can update scenarios"
    on public.scenarios for update
    using (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- SCENARIO VERSIONS (immutable)
DO $$ BEGIN
  create policy "Members can view scenario versions"
    on public.scenario_versions for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert scenario versions"
    on public.scenario_versions for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- MODEL VERSIONS (immutable)
DO $$ BEGIN
  create policy "Members can view model versions"
    on public.model_versions for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert model versions"
    on public.model_versions for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- MODEL SNAPSHOTS (immutable)
DO $$ BEGIN
  create policy "Members can view model snapshots"
    on public.model_snapshots for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert model snapshots"
    on public.model_snapshots for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- UNIT ECONOMICS SNAPSHOTS (immutable)
DO $$ BEGIN
  create policy "Members can view unit economics snapshots"
    on public.unit_economics_snapshots for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert unit economics snapshots"
    on public.unit_economics_snapshots for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- FORECAST SNAPSHOTS (immutable)
DO $$ BEGIN
  create policy "Members can view forecast snapshots"
    on public.forecast_snapshots for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert forecast snapshots"
    on public.forecast_snapshots for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AI COMMENTARY (immutable)
DO $$ BEGIN
  create policy "Members can view ai commentary"
    on public.ai_commentary for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert ai commentary"
    on public.ai_commentary for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- ############################################################
-- 003_scenario_chat.sql — Scenario Chat Builder
-- ############################################################

-- Enum for change types
DO $$ BEGIN
  create type public.scenario_change_type as enum ('proposed', 'confirmed', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- SCENARIO CHANGE LOG (immutable)
-- ============================================================
create table if not exists public.scenario_change_log (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  change_type public.scenario_change_type not null,
  natural_language_input text not null,
  ai_interpretation jsonb not null default '{}',
  proposed_changes jsonb not null default '[]',
  confirmation_token text,
  user_confirmed boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_scenario_change_log_scenario on public.scenario_change_log(scenario_id);
create index if not exists idx_scenario_change_log_org on public.scenario_change_log(org_id);
create index if not exists idx_scenario_change_log_created on public.scenario_change_log(scenario_id, created_at desc);

alter table public.scenario_change_log enable row level security;

-- RLS: SELECT for members, INSERT for advisors
DO $$ BEGIN
  create policy "Members can view scenario change log"
    on public.scenario_change_log for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can insert scenario change log"
    on public.scenario_change_log for insert
    with check (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- ############################################################
-- 004_remaining_tables.sql — Remaining Platform Tables
-- ############################################################

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  create type public.interview_status as enum ('in_progress', 'completed', 'abandoned');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.playbook_maturity_level as enum ('startup', 'early', 'growth', 'scale', 'mature');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.playbook_action_status as enum ('pending', 'in_progress', 'completed', 'skipped');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.playbook_action_priority as enum ('critical', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.intelligence_event_type as enum ('rate_change', 'regulation', 'market_news', 'economic_indicator', 'sector_update');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.intelligence_impact_severity as enum ('critical', 'high', 'medium', 'low', 'informational');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.report_type as enum ('board_pack', 'monthly_review', 'investor_update', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.report_status as enum ('draft', 'generating', 'ready', 'sent', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.notification_channel as enum ('in_app', 'email', 'both');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.notification_priority as enum ('urgent', 'high', 'normal', 'low');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.financial_record_source as enum ('xero', 'manual', 'csv_import', 'api');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.statement_type as enum ('profit_and_loss', 'balance_sheet', 'cash_flow');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.workflow_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create type public.module_status as enum ('active', 'paused', 'deactivated');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 1. BUSINESS CONTEXT PROFILES
-- ============================================================
create table if not exists public.business_context_profiles (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  interview_status public.interview_status not null default 'in_progress',
  business_model text,
  industry text,
  sector text,
  stage public.playbook_maturity_level,
  employee_count integer,
  revenue_range text,
  key_challenges jsonb not null default '[]',
  growth_goals jsonb not null default '[]',
  competitive_landscape text,
  target_market text,
  funding_status text,
  raw_interview_data jsonb not null default '{}',
  completed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bcp_org_id on public.business_context_profiles(org_id);
create unique index if not exists idx_bcp_org_unique on public.business_context_profiles(org_id)
  where interview_status = 'completed';

alter table public.business_context_profiles enable row level security;

-- ============================================================
-- 2. INTERVIEW MESSAGES
-- ============================================================
create table if not exists public.interview_messages (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  profile_id uuid not null references public.business_context_profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_interview_msgs_profile on public.interview_messages(profile_id);
create index if not exists idx_interview_msgs_org on public.interview_messages(org_id);
create index if not exists idx_interview_msgs_created on public.interview_messages(profile_id, created_at);

alter table public.interview_messages enable row level security;

-- ============================================================
-- 3. PLAYBOOK TEMPLATES
-- ============================================================
create table if not exists public.playbook_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null default '',
  maturity_level public.playbook_maturity_level not null,
  industry text,
  category text not null,
  actions_template jsonb not null default '[]',
  scoring_criteria jsonb not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_playbook_templates_maturity on public.playbook_templates(maturity_level);
create index if not exists idx_playbook_templates_industry on public.playbook_templates(industry);

alter table public.playbook_templates enable row level security;

-- ============================================================
-- 4. PLAYBOOK ASSESSMENTS
-- ============================================================
create table if not exists public.playbook_assessments (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  template_id uuid not null references public.playbook_templates(id),
  current_maturity_level public.playbook_maturity_level not null,
  target_maturity_level public.playbook_maturity_level not null,
  overall_score numeric(5,2) not null default 0,
  category_scores jsonb not null default '{}',
  ai_recommendations jsonb not null default '[]',
  assessed_by uuid not null references auth.users(id),
  assessed_at timestamptz not null default now(),
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_playbook_assessments_org on public.playbook_assessments(org_id);
create index if not exists idx_playbook_assessments_template on public.playbook_assessments(template_id);

alter table public.playbook_assessments enable row level security;

-- ============================================================
-- 5. PLAYBOOK ACTIONS
-- ============================================================
create table if not exists public.playbook_actions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  assessment_id uuid not null references public.playbook_assessments(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null,
  priority public.playbook_action_priority not null default 'medium',
  status public.playbook_action_status not null default 'pending',
  due_date date,
  assigned_to uuid references auth.users(id),
  completed_at timestamptz,
  evidence jsonb not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_playbook_actions_org on public.playbook_actions(org_id);
create index if not exists idx_playbook_actions_assessment on public.playbook_actions(assessment_id);
create index if not exists idx_playbook_actions_status on public.playbook_actions(org_id, status);

alter table public.playbook_actions enable row level security;

-- ============================================================
-- 6. INTELLIGENCE EVENTS
-- ============================================================
create table if not exists public.intelligence_events (
  id uuid primary key default uuid_generate_v4(),
  event_type public.intelligence_event_type not null,
  title text not null,
  summary text not null,
  source_url text,
  source_name text not null,
  event_date date not null,
  raw_data jsonb not null default '{}',
  sectors_affected text[] not null default '{}',
  regions_affected text[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_intel_events_type on public.intelligence_events(event_type);
create index if not exists idx_intel_events_date on public.intelligence_events(event_date desc);
create index if not exists idx_intel_events_sectors on public.intelligence_events using gin(sectors_affected);

alter table public.intelligence_events enable row level security;

-- ============================================================
-- 7. INTELLIGENCE IMPACTS
-- ============================================================
create table if not exists public.intelligence_impacts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  event_id uuid not null references public.intelligence_events(id) on delete cascade,
  severity public.intelligence_impact_severity not null,
  impact_summary text not null,
  affected_metrics jsonb not null default '[]',
  recommended_actions jsonb not null default '[]',
  ai_confidence numeric(5,4) not null default 0,
  acknowledged boolean not null default false,
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_intel_impacts_org on public.intelligence_impacts(org_id);
create index if not exists idx_intel_impacts_event on public.intelligence_impacts(event_id);
create index if not exists idx_intel_impacts_severity on public.intelligence_impacts(org_id, severity);

alter table public.intelligence_impacts enable row level security;

-- ============================================================
-- 8. BENCHMARKS
-- ============================================================
create table if not exists public.benchmarks (
  id uuid primary key default uuid_generate_v4(),
  sector text not null,
  sub_sector text,
  region text not null default 'UK',
  metric_key text not null,
  metric_label text not null,
  period date not null,
  p10 numeric(15,4),
  p25 numeric(15,4),
  p50 numeric(15,4),
  p75 numeric(15,4),
  p90 numeric(15,4),
  sample_size integer,
  source text not null,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_benchmarks_sector on public.benchmarks(sector);
create index if not exists idx_benchmarks_metric on public.benchmarks(metric_key);
create unique index if not exists idx_benchmarks_unique
  on public.benchmarks(sector, region, metric_key, period);

alter table public.benchmarks enable row level security;

-- ============================================================
-- 9. MODULE TEMPLATES
-- ============================================================
create table if not exists public.module_templates (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null,
  icon text,
  is_core boolean not null default false,
  requires_modules text[] not null default '{}',
  config_schema jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_module_templates_category on public.module_templates(category);
create index if not exists idx_module_templates_slug on public.module_templates(slug);

alter table public.module_templates enable row level security;

-- ============================================================
-- 10. MODULE INSTANCES
-- ============================================================
create table if not exists public.module_instances (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  template_id uuid not null references public.module_templates(id),
  status public.module_status not null default 'active',
  config jsonb not null default '{}',
  activated_by uuid not null references auth.users(id),
  activated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_module_instances_org on public.module_instances(org_id);
create unique index if not exists idx_module_instances_org_template
  on public.module_instances(org_id, template_id)
  where status = 'active';

alter table public.module_instances enable row level security;

-- ============================================================
-- 11. REPORTS
-- ============================================================
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  report_type public.report_type not null,
  title text not null,
  period_start date not null,
  period_end date not null,
  status public.report_status not null default 'draft',
  content jsonb not null default '{}',
  sections jsonb not null default '[]',
  generated_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  sent_at timestamptz,
  recipients jsonb not null default '[]',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reports_org on public.reports(org_id);
create index if not exists idx_reports_type on public.reports(org_id, report_type);
create index if not exists idx_reports_period on public.reports(org_id, period_start, period_end);
create index if not exists idx_reports_status on public.reports(org_id, status);

alter table public.reports enable row level security;

-- ============================================================
-- 12. NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  title text not null,
  body text not null default '',
  channel public.notification_channel not null default 'in_app',
  priority public.notification_priority not null default 'normal',
  entity_type text,
  entity_id uuid,
  action_url text,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_org on public.notifications(org_id);
create index if not exists idx_notifications_unread on public.notifications(user_id, read_at)
  where read_at is null;

alter table public.notifications enable row level security;

-- ============================================================
-- 13. FINANCIAL RECORDS
-- ============================================================
create table if not exists public.financial_records (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  source public.financial_record_source not null,
  source_id text,
  date date not null,
  account_code text not null,
  account_name text not null,
  account_type text not null,
  amount numeric(15,2) not null default 0,
  currency text not null default 'GBP',
  description text,
  contact_name text,
  category text,
  tags text[] not null default '{}',
  raw_data jsonb not null default '{}',
  reconciled boolean not null default false,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fin_records_org on public.financial_records(org_id);
create index if not exists idx_fin_records_date on public.financial_records(org_id, date);
create index if not exists idx_fin_records_source on public.financial_records(org_id, source);
create index if not exists idx_fin_records_account on public.financial_records(org_id, account_code);
create index if not exists idx_fin_records_tags on public.financial_records using gin(tags);

alter table public.financial_records enable row level security;

-- ============================================================
-- 14. FINANCIAL STATEMENTS
-- ============================================================
create table if not exists public.financial_statements (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  statement_type public.statement_type not null,
  period date not null,
  period_type text not null default 'monthly' check (period_type in ('monthly', 'quarterly', 'annual')),
  line_items jsonb not null default '[]',
  totals jsonb not null default '{}',
  comparative_period date,
  comparative_totals jsonb,
  currency text not null default 'GBP',
  is_draft boolean not null default true,
  generated_at timestamptz not null default now(),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fin_statements_org on public.financial_statements(org_id);
create unique index if not exists idx_fin_statements_unique
  on public.financial_statements(org_id, statement_type, period, period_type);

alter table public.financial_statements enable row level security;

-- ============================================================
-- 15. KPI SNAPSHOTS
-- ============================================================
create table if not exists public.kpi_snapshots (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  period date not null,
  metric_key text not null,
  metric_label text not null,
  value numeric(15,4) not null,
  unit text not null default 'number',
  category text not null default 'financial',
  source text not null default 'calculated',
  previous_value numeric(15,4),
  target_value numeric(15,4),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_kpi_org on public.kpi_snapshots(org_id);
create index if not exists idx_kpi_metric on public.kpi_snapshots(org_id, metric_key);
create unique index if not exists idx_kpi_unique
  on public.kpi_snapshots(org_id, period, metric_key);
create index if not exists idx_kpi_period on public.kpi_snapshots(org_id, period desc);

alter table public.kpi_snapshots enable row level security;

-- ============================================================
-- 16. BUDGET LINES
-- ============================================================
create table if not exists public.budget_lines (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  period date not null,
  account_code text not null,
  account_name text not null,
  category text not null,
  budgeted_amount numeric(15,2) not null default 0,
  currency text not null default 'GBP',
  notes text,
  version integer not null default 1,
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_budget_lines_org on public.budget_lines(org_id);
create unique index if not exists idx_budget_lines_unique
  on public.budget_lines(org_id, period, account_code, version);
create index if not exists idx_budget_lines_period on public.budget_lines(org_id, period);

alter table public.budget_lines enable row level security;

-- ============================================================
-- 17. WORKFLOW EXECUTIONS
-- ============================================================
create table if not exists public.workflow_executions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  workflow_type text not null,
  status public.workflow_status not null default 'queued',
  input_params jsonb not null default '{}',
  result jsonb,
  error_message text,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  triggered_by uuid not null references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workflow_org on public.workflow_executions(org_id);
create index if not exists idx_workflow_status on public.workflow_executions(org_id, status);
create index if not exists idx_workflow_type on public.workflow_executions(org_id, workflow_type);

alter table public.workflow_executions enable row level security;

-- ============================================================
-- UPDATED_AT TRIGGERS (004)
-- ============================================================
DO $$ BEGIN
  create trigger update_bcp_updated_at
    before update on public.business_context_profiles
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_playbook_templates_updated_at
    before update on public.playbook_templates
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_playbook_assessments_updated_at
    before update on public.playbook_assessments
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_playbook_actions_updated_at
    before update on public.playbook_actions
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_benchmarks_updated_at
    before update on public.benchmarks
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_module_templates_updated_at
    before update on public.module_templates
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_module_instances_updated_at
    before update on public.module_instances
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_reports_updated_at
    before update on public.reports
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_fin_records_updated_at
    before update on public.financial_records
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_fin_statements_updated_at
    before update on public.financial_statements
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_budget_lines_updated_at
    before update on public.budget_lines
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create trigger update_workflow_executions_updated_at
    before update on public.workflow_executions
    for each row execute function public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- RLS POLICIES (004)
-- ============================================================

-- BUSINESS CONTEXT PROFILES
DO $$ BEGIN
  create policy "Members can view business context profiles"
    on public.business_context_profiles for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can create business context profiles"
    on public.business_context_profiles for insert
    with check (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can update business context profiles"
    on public.business_context_profiles for update
    using (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- INTERVIEW MESSAGES (immutable)
DO $$ BEGIN
  create policy "Members can view interview messages"
    on public.interview_messages for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can insert interview messages"
    on public.interview_messages for insert
    with check (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- PLAYBOOK TEMPLATES (global)
DO $$ BEGIN
  create policy "Authenticated users can view playbook templates"
    on public.playbook_templates for select
    using (auth.uid() is not null);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Only service role can manage playbook templates"
    on public.playbook_templates for insert
    with check (false);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Only service role can update playbook templates"
    on public.playbook_templates for update
    using (false);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- PLAYBOOK ASSESSMENTS
DO $$ BEGIN
  create policy "Members can view playbook assessments"
    on public.playbook_assessments for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can create playbook assessments"
    on public.playbook_assessments for insert
    with check (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can update playbook assessments"
    on public.playbook_assessments for update
    using (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- PLAYBOOK ACTIONS
DO $$ BEGIN
  create policy "Members can view playbook actions"
    on public.playbook_actions for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can create playbook actions"
    on public.playbook_actions for insert
    with check (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can update playbook actions"
    on public.playbook_actions for update
    using (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- INTELLIGENCE EVENTS (global)
DO $$ BEGIN
  create policy "Authenticated users can view intelligence events"
    on public.intelligence_events for select
    using (auth.uid() is not null);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Only service role can insert intelligence events"
    on public.intelligence_events for insert
    with check (false);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- INTELLIGENCE IMPACTS
DO $$ BEGIN
  create policy "Members can view intelligence impacts"
    on public.intelligence_impacts for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert intelligence impacts"
    on public.intelligence_impacts for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Members can update intelligence impacts"
    on public.intelligence_impacts for update
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- BENCHMARKS (global)
DO $$ BEGIN
  create policy "Authenticated users can view benchmarks"
    on public.benchmarks for select
    using (auth.uid() is not null);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Only service role can manage benchmarks"
    on public.benchmarks for insert
    with check (false);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Only service role can update benchmarks"
    on public.benchmarks for update
    using (false);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- MODULE TEMPLATES (global)
DO $$ BEGIN
  create policy "Authenticated users can view module templates"
    on public.module_templates for select
    using (auth.uid() is not null);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Only service role can manage module templates"
    on public.module_templates for insert
    with check (false);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Only service role can update module templates"
    on public.module_templates for update
    using (false);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- MODULE INSTANCES
DO $$ BEGIN
  create policy "Members can view module instances"
    on public.module_instances for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Admins can create module instances"
    on public.module_instances for insert
    with check (org_id = public.user_org_id() and public.user_has_role('admin'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Admins can update module instances"
    on public.module_instances for update
    using (org_id = public.user_org_id() and public.user_has_role('admin'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- REPORTS
DO $$ BEGIN
  create policy "Members can view reports"
    on public.reports for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can create reports"
    on public.reports for insert
    with check (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can update reports"
    on public.reports for update
    using (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- NOTIFICATIONS
DO $$ BEGIN
  create policy "Users can view their own notifications"
    on public.notifications for select
    using (org_id = public.user_org_id() and user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert notifications"
    on public.notifications for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Users can update their own notifications"
    on public.notifications for update
    using (org_id = public.user_org_id() and user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- FINANCIAL RECORDS
DO $$ BEGIN
  create policy "Members can view financial records"
    on public.financial_records for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert financial records"
    on public.financial_records for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can update financial records"
    on public.financial_records for update
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- FINANCIAL STATEMENTS
DO $$ BEGIN
  create policy "Members can view financial statements"
    on public.financial_statements for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert financial statements"
    on public.financial_statements for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can update financial statements"
    on public.financial_statements for update
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- KPI SNAPSHOTS (immutable)
DO $$ BEGIN
  create policy "Members can view kpi snapshots"
    on public.kpi_snapshots for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert kpi snapshots"
    on public.kpi_snapshots for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- BUDGET LINES
DO $$ BEGIN
  create policy "Members can view budget lines"
    on public.budget_lines for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can create budget lines"
    on public.budget_lines for insert
    with check (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Advisors can update budget lines"
    on public.budget_lines for update
    using (org_id = public.user_org_id() and public.user_has_role('advisor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- WORKFLOW EXECUTIONS
DO $$ BEGIN
  create policy "Members can view workflow executions"
    on public.workflow_executions for select
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can insert workflow executions"
    on public.workflow_executions for insert
    with check (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  create policy "Service can update workflow executions"
    on public.workflow_executions for update
    using (org_id = public.user_org_id());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- END OF COMBINED MIGRATION
-- ============================================================
