-- ============================================================
-- 003: Scenario Chat Builder
-- Adds scenario_change_log for immutable audit trail of
-- AI-interpreted scenario changes (proposed/confirmed/rejected).
-- ============================================================

-- Enum for change types
create type public.scenario_change_type as enum ('proposed', 'confirmed', 'rejected');

-- ============================================================
-- SCENARIO CHANGE LOG (immutable — INSERT/SELECT only)
-- ============================================================
create table public.scenario_change_log (
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

create index idx_scenario_change_log_scenario on public.scenario_change_log(scenario_id);
create index idx_scenario_change_log_org on public.scenario_change_log(org_id);
create index idx_scenario_change_log_created on public.scenario_change_log(scenario_id, created_at desc);

alter table public.scenario_change_log enable row level security;

-- RLS: SELECT for members, INSERT for advisors, NO UPDATE, NO DELETE
create policy "Members can view scenario change log"
  on public.scenario_change_log for select
  using (org_id = public.user_org_id());

create policy "Advisors can insert scenario change log"
  on public.scenario_change_log for insert
  with check (org_id = public.user_org_id() and public.user_has_role('advisor'));

-- No UPDATE or DELETE policies — this table is immutable
