-- ============================================================
-- Advisory OS — Migration 010: Knowledge Vault
-- Unified provenance-tracked storage for all generated outputs:
-- reports, scenarios, board packs, AI analyses, KPI snapshots.
-- Immutable by default — edit creates new version, never overwrites.
-- Governance patterns: Vena (cell-level audit trail), DataRails (governed data layer).
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
create type public.vault_item_type as enum (
  'board_pack',
  'scenario_output',
  'kpi_snapshot',
  'variance_analysis',
  'narrative',
  'anomaly_report',
  'interview_transcript',
  'playbook_assessment',
  'custom_report',
  'ai_analysis'
);

create type public.vault_item_status as enum (
  'draft',
  'final',
  'superseded',
  'archived'
);

-- ============================================================
-- 1. VAULT ITEMS
-- Master record for every Knowledge Vault entry.
-- One row per logical document (latest version pointer).
-- ============================================================
create table if not exists public.vault_items (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,

  -- Classification
  item_type public.vault_item_type not null,
  title text not null,
  description text not null default '',
  tags text[] not null default '{}',

  -- Status & versioning
  status public.vault_item_status not null default 'final',
  current_version integer not null default 1,

  -- Source references (what generated this item)
  source_entity_type text,           -- e.g. 'report', 'scenario', 'kpi_snapshot'
  source_entity_id uuid,             -- FK to the source table row
  period_start date,
  period_end date,

  -- Provenance: data lineage
  data_version text,                 -- Xero sync log ID or data hash
  data_freshness_at timestamptz,     -- When source data was last synced

  -- Provenance: AI lineage
  model_id text,                     -- e.g. 'claude-sonnet-4-20250514'
  prompt_hash text,                  -- SHA-256 of the prompt used

  -- Access control
  visibility text not null default 'org' check (visibility in ('org', 'owner_only', 'advisor_only')),
  created_by uuid not null references auth.users(id),

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vault_items_org on public.vault_items(org_id);
create index if not exists idx_vault_items_type on public.vault_items(org_id, item_type);
create index if not exists idx_vault_items_status on public.vault_items(org_id, status);
create index if not exists idx_vault_items_source on public.vault_items(source_entity_type, source_entity_id);
create index if not exists idx_vault_items_tags on public.vault_items using gin(tags);
create index if not exists idx_vault_items_created on public.vault_items(org_id, created_at desc);
create index if not exists idx_vault_items_search on public.vault_items using gin(to_tsvector('english', title || ' ' || description));

alter table public.vault_items enable row level security;

-- ============================================================
-- 2. VAULT VERSIONS
-- Immutable version history. Every save creates a new version.
-- No UPDATE/DELETE policies — append-only.
-- ============================================================
create table if not exists public.vault_versions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  vault_item_id uuid not null references public.vault_items(id) on delete cascade,

  -- Version tracking
  version_number integer not null,
  change_summary text not null default 'Initial version',

  -- Content (stored as JSONB for flexibility across item types)
  content jsonb not null default '{}',

  -- Full provenance snapshot at time of creation
  provenance jsonb not null default '{}',
  -- Expected shape:
  -- {
  --   "data_version": "sync_log_id or hash",
  --   "data_freshness_at": "ISO timestamp",
  --   "model_id": "claude-sonnet-4-20250514",
  --   "prompt_hash": "sha256...",
  --   "source_entity_type": "report",
  --   "source_entity_id": "uuid",
  --   "xero_sync_id": "uuid",
  --   "kpi_snapshot_ids": ["uuid1", "uuid2"],
  --   "assumption_set_id": "uuid"
  -- }

  -- Who created this version
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Ensure unique version numbers per item
create unique index if not exists idx_vault_versions_unique
  on public.vault_versions(vault_item_id, version_number);
create index if not exists idx_vault_versions_item on public.vault_versions(vault_item_id);
create index if not exists idx_vault_versions_org on public.vault_versions(org_id);

alter table public.vault_versions enable row level security;

-- ============================================================
-- 3. VAULT ACCESS LOG
-- Tracks every time a vault item is viewed/downloaded/shared.
-- Immutable — INSERT only.
-- ============================================================
create table if not exists public.vault_access_log (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  vault_item_id uuid not null references public.vault_items(id) on delete cascade,
  version_number integer,
  action text not null check (action in ('viewed', 'downloaded', 'exported', 'shared')),
  user_id uuid not null references auth.users(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_vault_access_item on public.vault_access_log(vault_item_id);
create index if not exists idx_vault_access_org on public.vault_access_log(org_id);
create index if not exists idx_vault_access_user on public.vault_access_log(user_id);

alter table public.vault_access_log enable row level security;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create trigger update_vault_items_updated_at
  before update on public.vault_items
  for each row execute function public.update_updated_at();

-- No update trigger for vault_versions — they are immutable
-- No update trigger for vault_access_log — it is immutable

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- VAULT ITEMS
create policy "Members can view vault items"
  on public.vault_items for select
  using (org_id = public.user_org_id());

create policy "Advisors can create vault items"
  on public.vault_items for insert
  with check (org_id = public.user_org_id() and public.user_has_role('advisor'));

create policy "Advisors can update vault item metadata"
  on public.vault_items for update
  using (org_id = public.user_org_id() and public.user_has_role('advisor'));

-- No DELETE policy — vault items are never deleted, only archived

-- VAULT VERSIONS (immutable — SELECT + INSERT only)
create policy "Members can view vault versions"
  on public.vault_versions for select
  using (org_id = public.user_org_id());

create policy "Advisors can create vault versions"
  on public.vault_versions for insert
  with check (org_id = public.user_org_id() and public.user_has_role('advisor'));

-- NO UPDATE POLICY for vault_versions — immutable
-- NO DELETE POLICY for vault_versions — immutable

-- VAULT ACCESS LOG (immutable — SELECT + INSERT only)
create policy "Members can view vault access log"
  on public.vault_access_log for select
  using (org_id = public.user_org_id());

create policy "Members can insert vault access log"
  on public.vault_access_log for insert
  with check (org_id = public.user_org_id());

-- NO UPDATE POLICY for vault_access_log — immutable
-- NO DELETE POLICY for vault_access_log — immutable
