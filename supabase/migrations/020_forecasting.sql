-- 020_forecasting.sql
-- Three-way forecasting engine: forecasts + scenarios

create table if not exists forecasts (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  periods jsonb not null,
  pnl jsonb not null,
  balance_sheet jsonb not null,
  cash_flow jsonb not null,
  assumptions jsonb not null default '[]',
  confidence numeric(3,2),
  generated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists forecast_scenarios (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  assumptions jsonb not null default '[]',
  forecast_id uuid references forecasts(id),
  created_at timestamptz default now()
);

create index idx_forecasts_org on forecasts(org_id, generated_at desc);
create index idx_scenarios_org on forecast_scenarios(org_id);
