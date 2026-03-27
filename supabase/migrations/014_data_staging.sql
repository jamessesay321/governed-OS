-- ============================================================
-- Data Staging Pipeline & Checkpoint System
-- Tables: staged_transactions, source_mappings, checkpoints, account_mappings
-- ============================================================

-- ============================================================
-- STAGED TRANSACTIONS (waiting room for incoming data)
-- ============================================================
create table public.staged_transactions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  source text not null,
  source_id text not null,
  raw_data jsonb not null default '{}',
  status text not null default 'pending',
  confidence_score numeric(3,2) not null default 0,
  matched_with jsonb not null default '[]',
  notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint staged_transactions_status_check
    check (status in ('pending', 'matched', 'conflict', 'approved', 'rejected')),
  constraint staged_transactions_confidence_check
    check (confidence_score >= 0 and confidence_score <= 1)
);

create index idx_staged_tx_org_id on public.staged_transactions(org_id);
create index idx_staged_tx_status on public.staged_transactions(org_id, status);
create index idx_staged_tx_source on public.staged_transactions(org_id, source);
create unique index idx_staged_tx_org_source on public.staged_transactions(org_id, source, source_id);

alter table public.staged_transactions enable row level security;

create trigger update_staged_transactions_updated_at
  before update on public.staged_transactions
  for each row execute function public.update_updated_at();

-- RLS policies
create policy "Members can view staged transactions"
  on public.staged_transactions for select
  using (org_id = public.user_org_id());

create policy "Service can insert staged transactions"
  on public.staged_transactions for insert
  with check (org_id = public.user_org_id());

create policy "Service can update staged transactions"
  on public.staged_transactions for update
  using (org_id = public.user_org_id());

create policy "Admins can delete staged transactions"
  on public.staged_transactions for delete
  using (org_id = public.user_org_id() and public.user_has_role('admin'));

-- ============================================================
-- SOURCE MAPPINGS (cross-source entity matching)
-- ============================================================
create table public.source_mappings (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  source_a text not null,
  source_a_id text not null,
  source_b text not null,
  source_b_id text not null,
  mapping_type text not null,
  confidence numeric(3,2) not null default 0,
  verified boolean not null default false,
  created_at timestamptz not null default now(),

  constraint source_mappings_type_check
    check (mapping_type in ('account', 'customer', 'product', 'transaction')),
  constraint source_mappings_confidence_check
    check (confidence >= 0 and confidence <= 1)
);

create index idx_source_mappings_org_id on public.source_mappings(org_id);
create index idx_source_mappings_type on public.source_mappings(org_id, mapping_type);
create index idx_source_mappings_source_a on public.source_mappings(org_id, source_a, source_a_id);
create index idx_source_mappings_source_b on public.source_mappings(org_id, source_b, source_b_id);

alter table public.source_mappings enable row level security;

create policy "Members can view source mappings"
  on public.source_mappings for select
  using (org_id = public.user_org_id());

create policy "Service can insert source mappings"
  on public.source_mappings for insert
  with check (org_id = public.user_org_id());

create policy "Service can update source mappings"
  on public.source_mappings for update
  using (org_id = public.user_org_id());

-- ============================================================
-- CHECKPOINTS (review gates in the data pipeline)
-- ============================================================
create table public.checkpoints (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  type text not null,
  status text not null default 'pending',
  data jsonb not null default '{}',
  due_date timestamptz,
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),

  constraint checkpoints_type_check
    check (type in ('post_sync', 'monthly_review', 'new_source', 'onboarding')),
  constraint checkpoints_status_check
    check (status in ('pending', 'in_progress', 'completed', 'skipped'))
);

create index idx_checkpoints_org_id on public.checkpoints(org_id);
create index idx_checkpoints_status on public.checkpoints(org_id, status);
create index idx_checkpoints_type on public.checkpoints(org_id, type);

alter table public.checkpoints enable row level security;

create policy "Members can view checkpoints"
  on public.checkpoints for select
  using (org_id = public.user_org_id());

create policy "Service can insert checkpoints"
  on public.checkpoints for insert
  with check (org_id = public.user_org_id());

create policy "Service can update checkpoints"
  on public.checkpoints for update
  using (org_id = public.user_org_id());

-- ============================================================
-- ACCOUNT MAPPINGS (source accounts to management categories)
-- ============================================================
create table public.account_mappings (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  source_account_code text not null,
  source_account_name text not null,
  target_category text not null,
  target_subcategory text,
  mapping_source text not null default 'auto',
  confidence numeric(3,2) not null default 0,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint account_mappings_source_check
    check (mapping_source in ('auto', 'manual', 'blueprint')),
  constraint account_mappings_confidence_check
    check (confidence >= 0 and confidence <= 1)
);

create index idx_account_mappings_org_id on public.account_mappings(org_id);
create index idx_account_mappings_source on public.account_mappings(org_id, mapping_source);
create unique index idx_account_mappings_org_code on public.account_mappings(org_id, source_account_code);

alter table public.account_mappings enable row level security;

create trigger update_account_mappings_updated_at
  before update on public.account_mappings
  for each row execute function public.update_updated_at();

create policy "Members can view account mappings"
  on public.account_mappings for select
  using (org_id = public.user_org_id());

create policy "Service can insert account mappings"
  on public.account_mappings for insert
  with check (org_id = public.user_org_id());

create policy "Service can update account mappings"
  on public.account_mappings for update
  using (org_id = public.user_org_id());

create policy "Admins can delete account mappings"
  on public.account_mappings for delete
  using (org_id = public.user_org_id() and public.user_has_role('admin'));
