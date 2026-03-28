-- ============================================================
-- Migration 017: Analysis Engine Tables
-- Business theses, health checks, and AI commentaries.
-- Core analytical IP: research analyst brain that forms
-- a thesis about a business before looking at numbers.
-- ============================================================

create table if not exists public.business_theses (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references public.organisations(id) on delete cascade,
  thesis jsonb not null,
  confidence numeric(3,2) default 0.5,
  generated_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now(),
  unique(org_id)  -- one active thesis per org, upsert to update
);

alter table public.business_theses enable row level security;

create policy "Users can read own org theses"
  on public.business_theses for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "Service role can manage theses"
  on public.business_theses for all
  using (true)
  with check (true);

-- ============================================================

create table if not exists public.health_checks (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references public.organisations(id) on delete cascade,
  overall_score integer,
  metrics jsonb not null default '[]',
  alerts jsonb not null default '[]',
  summary text,
  checked_at timestamptz default now()
);

alter table public.health_checks enable row level security;

create index idx_health_checks_org on public.health_checks(org_id, checked_at desc);

create policy "Users can read own org health checks"
  on public.health_checks for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "Service role can manage health checks"
  on public.health_checks for all
  using (true)
  with check (true);

-- ============================================================

create table if not exists public.commentaries (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references public.organisations(id) on delete cascade,
  period text not null,
  sections jsonb not null default '[]',
  sources jsonb not null default '[]',
  generated_at timestamptz default now(),
  unique(org_id, period)
);

alter table public.commentaries enable row level security;

create index idx_commentaries_org on public.commentaries(org_id, period);

create policy "Users can read own org commentaries"
  on public.commentaries for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "Service role can manage commentaries"
  on public.commentaries for all
  using (true)
  with check (true);
