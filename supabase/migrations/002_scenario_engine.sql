-- ============================================================
-- Governed OS — Phase 2 Schema: Scenario Engine
-- Assumption-driven, deterministic, versioned, auditable
-- All tables enforce multi-tenancy via org_id + RLS
-- Snapshot tables are immutable (no UPDATE/DELETE)
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
create type public.assumption_type as enum ('percentage', 'currency', 'integer', 'boolean', 'decimal');

create type public.assumption_category as enum (
  'revenue_drivers', 'pricing', 'costs', 'growth_rates',
  'headcount', 'marketing', 'capital', 'custom'
);

create type public.scenario_status as enum ('draft', 'active', 'locked', 'archived');

create type public.ai_commentary_type as enum ('anomaly', 'risk', 'opportunity', 'insight');

-- ============================================================
-- ASSUMPTION SETS
-- ============================================================
create table public.assumption_sets (
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

create index idx_assumption_sets_org_id on public.assumption_sets(org_id);

alter table public.assumption_sets enable row level security;

-- ============================================================
-- ASSUMPTION VALUES
-- ============================================================
create table public.assumption_values (
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

create index idx_assumption_values_set on public.assumption_values(assumption_set_id);
create index idx_assumption_values_org on public.assumption_values(org_id);
create index idx_assumption_values_category on public.assumption_values(assumption_set_id, category);
create unique index idx_assumption_values_unique_key_period
  on public.assumption_values(assumption_set_id, key, effective_from);

alter table public.assumption_values enable row level security;

-- ============================================================
-- SCENARIOS
-- ============================================================
create table public.scenarios (
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

create index idx_scenarios_org_id on public.scenarios(org_id);
create index idx_scenarios_assumption_set on public.scenarios(assumption_set_id);

alter table public.scenarios enable row level security;

-- ============================================================
-- SCENARIO VERSIONS (IMMUTABLE)
-- ============================================================
create table public.scenario_versions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  version integer not null,
  change_summary text not null,
  assumption_set_snapshot jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_scenario_versions_scenario on public.scenario_versions(scenario_id);
create unique index idx_scenario_versions_unique on public.scenario_versions(scenario_id, version);

alter table public.scenario_versions enable row level security;

-- ============================================================
-- MODEL VERSIONS (IMMUTABLE)
-- ============================================================
create table public.model_versions (
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

create index idx_model_versions_scenario on public.model_versions(scenario_id);
create unique index idx_model_versions_unique on public.model_versions(scenario_id, version);

alter table public.model_versions enable row level security;

-- ============================================================
-- MODEL SNAPSHOTS (IMMUTABLE)
-- ============================================================
create table public.model_snapshots (
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

create index idx_model_snapshots_model on public.model_snapshots(model_version_id);
create index idx_model_snapshots_scenario_period on public.model_snapshots(scenario_id, period);

alter table public.model_snapshots enable row level security;

-- ============================================================
-- UNIT ECONOMICS SNAPSHOTS (IMMUTABLE)
-- ============================================================
create table public.unit_economics_snapshots (
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

create index idx_unit_econ_model on public.unit_economics_snapshots(model_version_id);
create index idx_unit_econ_scenario_period on public.unit_economics_snapshots(scenario_id, period);

alter table public.unit_economics_snapshots enable row level security;

-- ============================================================
-- FORECAST SNAPSHOTS (IMMUTABLE)
-- ============================================================
create table public.forecast_snapshots (
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

create index idx_forecast_model on public.forecast_snapshots(model_version_id);
create index idx_forecast_scenario_period on public.forecast_snapshots(scenario_id, period, metric_key);

alter table public.forecast_snapshots enable row level security;

-- ============================================================
-- AI COMMENTARY (IMMUTABLE)
-- ============================================================
create table public.ai_commentary (
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

create index idx_ai_commentary_model on public.ai_commentary(model_version_id);
create index idx_ai_commentary_scenario on public.ai_commentary(scenario_id);

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

create trigger trg_scenario_version_auto
  before insert on public.scenario_versions
  for each row execute function public.next_scenario_version();

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

create trigger trg_model_version_auto
  before insert on public.model_versions
  for each row execute function public.next_model_version();

-- ============================================================
-- UPDATED_AT TRIGGERS (mutable tables only)
-- ============================================================
create trigger update_assumption_sets_updated_at
  before update on public.assumption_sets
  for each row execute function public.update_updated_at();

create trigger update_assumption_values_updated_at
  before update on public.assumption_values
  for each row execute function public.update_updated_at();

create trigger update_scenarios_updated_at
  before update on public.scenarios
  for each row execute function public.update_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ASSUMPTION SETS
create policy "Members can view assumption sets"
  on public.assumption_sets for select
  using (org_id = public.user_org_id());

create policy "Advisors can create assumption sets"
  on public.assumption_sets for insert
  with check (org_id = public.user_org_id() and public.user_has_role('advisor'));

create policy "Advisors can update assumption sets"
  on public.assumption_sets for update
  using (org_id = public.user_org_id() and public.user_has_role('advisor'));

-- ASSUMPTION VALUES
create policy "Members can view assumption values"
  on public.assumption_values for select
  using (org_id = public.user_org_id());

create policy "Advisors can create assumption values"
  on public.assumption_values for insert
  with check (org_id = public.user_org_id() and public.user_has_role('advisor'));

create policy "Advisors can update assumption values"
  on public.assumption_values for update
  using (org_id = public.user_org_id() and public.user_has_role('advisor'));

-- SCENARIOS
create policy "Members can view scenarios"
  on public.scenarios for select
  using (org_id = public.user_org_id());

create policy "Advisors can create scenarios"
  on public.scenarios for insert
  with check (org_id = public.user_org_id() and public.user_has_role('advisor'));

create policy "Advisors can update scenarios"
  on public.scenarios for update
  using (org_id = public.user_org_id() and public.user_has_role('advisor'));

-- SCENARIO VERSIONS (immutable — SELECT + INSERT only)
create policy "Members can view scenario versions"
  on public.scenario_versions for select
  using (org_id = public.user_org_id());

create policy "Service can insert scenario versions"
  on public.scenario_versions for insert
  with check (org_id = public.user_org_id());

-- NO UPDATE POLICY for scenario_versions
-- NO DELETE POLICY for scenario_versions

-- MODEL VERSIONS (immutable — SELECT + INSERT only)
create policy "Members can view model versions"
  on public.model_versions for select
  using (org_id = public.user_org_id());

create policy "Service can insert model versions"
  on public.model_versions for insert
  with check (org_id = public.user_org_id());

-- NO UPDATE POLICY for model_versions
-- NO DELETE POLICY for model_versions

-- MODEL SNAPSHOTS (immutable — SELECT + INSERT only)
create policy "Members can view model snapshots"
  on public.model_snapshots for select
  using (org_id = public.user_org_id());

create policy "Service can insert model snapshots"
  on public.model_snapshots for insert
  with check (org_id = public.user_org_id());

-- NO UPDATE POLICY for model_snapshots
-- NO DELETE POLICY for model_snapshots

-- UNIT ECONOMICS SNAPSHOTS (immutable — SELECT + INSERT only)
create policy "Members can view unit economics snapshots"
  on public.unit_economics_snapshots for select
  using (org_id = public.user_org_id());

create policy "Service can insert unit economics snapshots"
  on public.unit_economics_snapshots for insert
  with check (org_id = public.user_org_id());

-- NO UPDATE POLICY for unit_economics_snapshots
-- NO DELETE POLICY for unit_economics_snapshots

-- FORECAST SNAPSHOTS (immutable — SELECT + INSERT only)
create policy "Members can view forecast snapshots"
  on public.forecast_snapshots for select
  using (org_id = public.user_org_id());

create policy "Service can insert forecast snapshots"
  on public.forecast_snapshots for insert
  with check (org_id = public.user_org_id());

-- NO UPDATE POLICY for forecast_snapshots
-- NO DELETE POLICY for forecast_snapshots

-- AI COMMENTARY (immutable — SELECT + INSERT only)
create policy "Members can view ai commentary"
  on public.ai_commentary for select
  using (org_id = public.user_org_id());

create policy "Service can insert ai commentary"
  on public.ai_commentary for insert
  with check (org_id = public.user_org_id());

-- NO UPDATE POLICY for ai_commentary
-- NO DELETE POLICY for ai_commentary
