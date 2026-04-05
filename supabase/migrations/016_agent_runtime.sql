-- Agent trust levels per org
create table if not exists agent_trust_levels (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organisations(id) on delete cascade,
  agent_id text not null,
  trust_level text not null default 'guided' check (trust_level in ('guided', 'confident', 'autonomous')),
  auto_approve_threshold numeric(3,2) default 1.0,
  escalate_threshold numeric(3,2) default 0.0,
  runs_analysed integer default 0,
  accuracy_rate numeric(5,4) default 0,
  last_evaluated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(org_id, agent_id)
);

-- Agent run history
create table if not exists agent_runs (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organisations(id) on delete cascade,
  agent_id text not null,
  run_id text not null unique,
  status text not null check (status in ('completed', 'failed', 'needs_review')),
  steps jsonb not null default '[]',
  summary text,
  confidence numeric(5,4) default 0,
  items_processed integer default 0,
  items_flagged integer default 0,
  trust_level text,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz default now()
);

-- Agent memory (per-client learned patterns)
create table if not exists agent_memory (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organisations(id) on delete cascade,
  agent_id text not null,
  key text not null,
  value text not null,
  source text not null check (source in ('user_correction', 'confirmed', 'learned')),
  confidence numeric(3,2) default 0.5,
  times_applied integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(org_id, agent_id, key)
);

-- Agent audit trail
create table if not exists agent_audit (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organisations(id) on delete cascade,
  agent_id text not null,
  run_id text,
  action text not null,
  detail text,
  source_citations jsonb default '[]',
  confidence numeric(5,4),
  decision text check (decision in ('auto_approved', 'flagged', 'escalated', 'user_approved', 'user_rejected')),
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_agent_runs_org on agent_runs(org_id, agent_id);
create index if not exists idx_agent_memory_org on agent_memory(org_id, agent_id);
create index if not exists idx_agent_audit_org on agent_audit(org_id, agent_id);
create index if not exists idx_agent_audit_run on agent_audit(run_id);
