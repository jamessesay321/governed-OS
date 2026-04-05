-- ============================================================
-- 028: Number Challenges (Challenge Panel + Review Queue)
-- ============================================================
-- Allows any user to flag a financial number for review.
-- Flagged items appear in a Review Queue for accountants/admins.
-- ============================================================

create table public.number_challenges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  created_by uuid not null references auth.users(id),

  -- What was challenged
  page text not null,           -- e.g. 'balance-sheet', 'income-statement', 'kpi', 'variance'
  metric_label text not null,   -- e.g. 'Accounts Receivable', 'Revenue', 'Gross Margin %'
  metric_value text,            -- e.g. '£245,000' — stored as display string
  period text,                  -- e.g. '2025-06-01'
  account_id uuid,              -- optional FK to chart_of_accounts

  -- Challenge details
  reason text not null,         -- user's explanation of what looks wrong
  expected_value text,          -- optional: what the user thinks it should be
  severity text not null default 'question' check (severity in ('question', 'concern', 'error')),

  -- Resolution
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'dismissed')),
  resolved_by uuid references auth.users(id),
  resolution_notes text,
  resolved_at timestamptz,

  -- Metadata
  context_json jsonb,           -- additional context (drill-down breadcrumbs, comparison values, etc.)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_number_challenges_org_id on public.number_challenges(org_id);
create index idx_number_challenges_status on public.number_challenges(org_id, status);
create index idx_number_challenges_created on public.number_challenges(org_id, created_at desc);

-- RLS
alter table public.number_challenges enable row level security;

-- Org members can view all challenges for their org
create policy "Org members can view challenges"
  on public.number_challenges for select
  using (
    org_id in (
      select p.org_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Any org member can create a challenge
create policy "Org members can create challenges"
  on public.number_challenges for insert
  with check (
    org_id in (
      select p.org_id from public.profiles p where p.id = auth.uid()
    )
    and created_by = auth.uid()
  );

-- Only admins/owners can update (resolve/dismiss) challenges
create policy "Admins can update challenges"
  on public.number_challenges for update
  using (
    org_id in (
      select p.org_id from public.org_members om
      where om.user_id = auth.uid()
      and om.role in ('owner', 'admin', 'advisor')
    )
  );

-- Trigger to auto-update updated_at
create or replace function public.update_number_challenges_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_number_challenges_updated_at
  before update on public.number_challenges
  for each row
  execute function public.update_number_challenges_updated_at();
