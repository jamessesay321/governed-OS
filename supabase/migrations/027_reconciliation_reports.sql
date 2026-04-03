-- Reconciliation reports: automated post-sync verification results
-- Stores results of 5 checks that compare platform data against Xero's authoritative reports

create table if not exists public.reconciliation_reports (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references public.organisations(id) on delete cascade,
  period text not null,
  checks jsonb not null default '[]',
  overall_status text not null default 'pass',
  overall_score integer not null default 100,
  has_critical boolean not null default false,
  recommendations text[] not null default '{}',
  created_at timestamptz default now(),
  unique(org_id, period)
);

alter table public.reconciliation_reports enable row level security;

create index idx_reconciliation_reports_org
  on public.reconciliation_reports(org_id, period desc);

-- RLS: users can read their own org's reconciliation reports
create policy "Users can read own org reconciliation reports"
  on public.reconciliation_reports for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

-- Service role: full access for server-side upserts
create policy "Service role manages reconciliation reports"
  on public.reconciliation_reports for all
  using (true)
  with check (true);
