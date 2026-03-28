-- 019_integrations.sql
-- Standard integration connections table for all connectors

create table if not exists integration_connections (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  integration_id text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'error', 'expired')),
  credentials jsonb default '{}',
  last_sync_at timestamptz,
  sync_frequency text default 'manual',
  config jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(org_id, integration_id)
);

create index idx_integrations_org on integration_connections(org_id);
