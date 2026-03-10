-- ============================================================
-- Governed OS — Phase 1 Schema
-- All tables enforce multi-tenancy via org_id + RLS
-- Audit logs are immutable (no UPDATE/DELETE)
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ORGANISATIONS
-- ============================================================
create table public.organisations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organisations enable row level security;

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create type public.user_role as enum ('owner', 'admin', 'advisor', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,
  role public.user_role not null default 'viewer',
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_org_id on public.profiles(org_id);

alter table public.profiles enable row level security;

-- ============================================================
-- ORG INVITATIONS
-- ============================================================
create type public.invitation_status as enum ('pending', 'accepted', 'expired');

create table public.org_invitations (
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

create unique index idx_invitations_token on public.org_invitations(token);
create index idx_invitations_org_id on public.org_invitations(org_id);
create index idx_invitations_email on public.org_invitations(email);

alter table public.org_invitations enable row level security;

-- ============================================================
-- XERO CONNECTIONS
-- ============================================================
create type public.xero_connection_status as enum ('active', 'disconnected');

create table public.xero_connections (
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

create unique index idx_xero_connections_org on public.xero_connections(org_id);

alter table public.xero_connections enable row level security;

-- ============================================================
-- CHART OF ACCOUNTS
-- ============================================================
create table public.chart_of_accounts (
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

create index idx_coa_org_id on public.chart_of_accounts(org_id);
create unique index idx_coa_org_xero on public.chart_of_accounts(org_id, xero_account_id);

alter table public.chart_of_accounts enable row level security;

-- ============================================================
-- RAW TRANSACTIONS (source of truth from Xero)
-- ============================================================
create type public.transaction_type as enum (
  'invoice', 'bill', 'payment', 'bank_transaction', 'credit_note', 'manual_journal'
);

create table public.raw_transactions (
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

create index idx_raw_tx_org_id on public.raw_transactions(org_id);
create index idx_raw_tx_date on public.raw_transactions(org_id, date);
create unique index idx_raw_tx_org_xero on public.raw_transactions(org_id, xero_id);

alter table public.raw_transactions enable row level security;

-- ============================================================
-- NORMALISED FINANCIALS
-- ============================================================
create table public.normalised_financials (
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

create index idx_norm_fin_org_id on public.normalised_financials(org_id);
create unique index idx_norm_fin_org_period_account on public.normalised_financials(org_id, period, account_id);

alter table public.normalised_financials enable row level security;

-- ============================================================
-- SYNC LOG
-- ============================================================
create type public.sync_status as enum ('running', 'completed', 'failed');

create table public.sync_log (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  sync_type text not null,
  status public.sync_status not null default 'running',
  records_synced integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_sync_log_org_id on public.sync_log(org_id);

alter table public.sync_log enable row level security;

-- ============================================================
-- AUDIT LOGS (IMMUTABLE)
-- ============================================================
create table public.audit_logs (
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

create index idx_audit_logs_org_id on public.audit_logs(org_id);
create index idx_audit_logs_action on public.audit_logs(org_id, action);
create index idx_audit_logs_entity on public.audit_logs(org_id, entity_type, entity_id);
create index idx_audit_logs_created on public.audit_logs(org_id, created_at desc);

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
-- RLS POLICIES
-- ============================================================

-- ORGANISATIONS
create policy "Users can view their own org"
  on public.organisations for select
  using (id = public.user_org_id());

create policy "Owners can update their org"
  on public.organisations for update
  using (id = public.user_org_id() and public.user_has_role('owner'));

-- PROFILES
create policy "Users can view profiles in their org"
  on public.profiles for select
  using (org_id = public.user_org_id());

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "Admins can update profiles in their org"
  on public.profiles for update
  using (org_id = public.user_org_id() and public.user_has_role('admin'));

-- ORG INVITATIONS
create policy "Members can view invitations in their org"
  on public.org_invitations for select
  using (org_id = public.user_org_id());

create policy "Admins can create invitations"
  on public.org_invitations for insert
  with check (org_id = public.user_org_id() and public.user_has_role('admin'));

create policy "Admins can update invitations"
  on public.org_invitations for update
  using (org_id = public.user_org_id() and public.user_has_role('admin'));

-- XERO CONNECTIONS
create policy "Members can view xero connections"
  on public.xero_connections for select
  using (org_id = public.user_org_id());

create policy "Admins can manage xero connections"
  on public.xero_connections for insert
  with check (org_id = public.user_org_id() and public.user_has_role('admin'));

create policy "Admins can update xero connections"
  on public.xero_connections for update
  using (org_id = public.user_org_id() and public.user_has_role('admin'));

create policy "Admins can delete xero connections"
  on public.xero_connections for delete
  using (org_id = public.user_org_id() and public.user_has_role('admin'));

-- CHART OF ACCOUNTS
create policy "Members can view chart of accounts"
  on public.chart_of_accounts for select
  using (org_id = public.user_org_id());

create policy "Service can manage chart of accounts"
  on public.chart_of_accounts for insert
  with check (org_id = public.user_org_id());

create policy "Service can update chart of accounts"
  on public.chart_of_accounts for update
  using (org_id = public.user_org_id());

-- RAW TRANSACTIONS
create policy "Members can view raw transactions"
  on public.raw_transactions for select
  using (org_id = public.user_org_id());

create policy "Service can insert raw transactions"
  on public.raw_transactions for insert
  with check (org_id = public.user_org_id());

create policy "Service can update raw transactions"
  on public.raw_transactions for update
  using (org_id = public.user_org_id());

-- NORMALISED FINANCIALS
create policy "Members can view normalised financials"
  on public.normalised_financials for select
  using (org_id = public.user_org_id());

create policy "Service can insert normalised financials"
  on public.normalised_financials for insert
  with check (org_id = public.user_org_id());

create policy "Service can update normalised financials"
  on public.normalised_financials for update
  using (org_id = public.user_org_id());

-- SYNC LOG
create policy "Members can view sync log"
  on public.sync_log for select
  using (org_id = public.user_org_id());

create policy "Service can insert sync log"
  on public.sync_log for insert
  with check (org_id = public.user_org_id());

create policy "Service can update sync log"
  on public.sync_log for update
  using (org_id = public.user_org_id());

-- AUDIT LOGS (SELECT + INSERT only — NEVER update or delete)
create policy "Admins can view audit logs"
  on public.audit_logs for select
  using (org_id = public.user_org_id() and public.user_has_role('advisor'));

create policy "Service can insert audit logs"
  on public.audit_logs for insert
  with check (org_id = public.user_org_id());

-- NO UPDATE POLICY for audit_logs
-- NO DELETE POLICY for audit_logs

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

create trigger update_organisations_updated_at
  before update on public.organisations
  for each row execute function public.update_updated_at();

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger update_xero_connections_updated_at
  before update on public.xero_connections
  for each row execute function public.update_updated_at();

create trigger update_coa_updated_at
  before update on public.chart_of_accounts
  for each row execute function public.update_updated_at();

create trigger update_norm_fin_updated_at
  before update on public.normalised_financials
  for each row execute function public.update_updated_at();
