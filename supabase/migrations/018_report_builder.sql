-- Report Builder: generated reports and custom templates
-- Migration 018

create table if not exists generated_reports (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  template_id text not null,
  title text not null,
  period text,
  sections jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'final', 'shared')),
  share_url text,
  generated_by text,
  generated_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists report_templates_custom (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  category text,
  sections jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_reports_org on generated_reports(org_id, generated_at desc);
create index if not exists idx_report_templates_custom_org on report_templates_custom(org_id);
