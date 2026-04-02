-- ============================================================
-- KPI ALERT RULES
-- Per-org KPI threshold alert configuration
-- ============================================================

create table if not exists public.kpi_alert_rules (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  metric_key text not null,
  metric_label text not null,
  condition text not null check (condition in ('above', 'below', 'change_above', 'change_below')),
  threshold numeric(15,4) not null,
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  enabled boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_alert_rule unique (org_id, metric_key, condition)
);

create index if not exists idx_kpi_alert_rules_org on public.kpi_alert_rules(org_id);

alter table public.kpi_alert_rules enable row level security;

-- Members can view alert rules in their org
create policy "Members can view alert rules"
  on public.kpi_alert_rules for select
  using (org_id = public.user_org_id());

-- Admins and advisors can manage alert rules
create policy "Admins can create alert rules"
  on public.kpi_alert_rules for insert
  with check (org_id = public.user_org_id() and public.user_has_role('advisor'));

create policy "Admins can update alert rules"
  on public.kpi_alert_rules for update
  using (org_id = public.user_org_id() and public.user_has_role('advisor'));

create policy "Admins can delete alert rules"
  on public.kpi_alert_rules for delete
  using (org_id = public.user_org_id() and public.user_has_role('admin'));
