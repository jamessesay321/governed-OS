-- ============================================================
-- Governed OS — Migration 004: Remaining Platform Tables
-- Business context, playbooks, intelligence, benchmarks,
-- modules, reports, notifications, unified financials,
-- statements, KPIs, budgets, and workflow tracking.
-- All tables enforce multi-tenancy via org_id + RLS
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
create type public.interview_status as enum ('in_progress', 'completed', 'abandoned');
create type public.playbook_maturity_level as enum ('startup', 'early', 'growth', 'scale', 'mature');
create type public.playbook_action_status as enum ('pending', 'in_progress', 'completed', 'skipped');
create type public.playbook_action_priority as enum ('critical', 'high', 'medium', 'low');
create type public.intelligence_event_type as enum ('rate_change', 'regulation', 'market_news', 'economic_indicator', 'sector_update');
create type public.intelligence_impact_severity as enum ('critical', 'high', 'medium', 'low', 'informational');
create type public.report_type as enum ('board_pack', 'monthly_review', 'investor_update', 'custom');
create type public.report_status as enum ('draft', 'generating', 'ready', 'sent', 'archived');
create type public.notification_channel as enum ('in_app', 'email', 'both');
create type public.notification_priority as enum ('urgent', 'high', 'normal', 'low');
create type public.financial_record_source as enum ('xero', 'manual', 'csv_import', 'api');
create type public.statement_type as enum ('profit_and_loss', 'balance_sheet', 'cash_flow');
create type public.workflow_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');
create type public.module_status as enum ('active', 'paused', 'deactivated');

-- ============================================================
-- 1. BUSINESS CONTEXT PROFILES
-- AI interview results capturing org context
-- ============================================================
create table if not exists public.business_context_profiles (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  interview_status public.interview_status not null default 'in_progress',
  business_model text,
  industry text,
  sector text,
  stage public.playbook_maturity_level,
  employee_count integer,
  revenue_range text,
  key_challenges jsonb not null default '[]',
  growth_goals jsonb not null default '[]',
  competitive_landscape text,
  target_market text,
  funding_status text,
  raw_interview_data jsonb not null default '{}',
  completed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bcp_org_id on public.business_context_profiles(org_id);
create unique index if not exists idx_bcp_org_unique on public.business_context_profiles(org_id)
  where interview_status = 'completed';

alter table public.business_context_profiles enable row level security;

-- ============================================================
-- 2. INTERVIEW MESSAGES
-- Conversation history for AI interviews
-- ============================================================
create table if not exists public.interview_messages (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  profile_id uuid not null references public.business_context_profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_interview_msgs_profile on public.interview_messages(profile_id);
create index if not exists idx_interview_msgs_org on public.interview_messages(org_id);
create index if not exists idx_interview_msgs_created on public.interview_messages(profile_id, created_at);

alter table public.interview_messages enable row level security;

-- ============================================================
-- 3. PLAYBOOK TEMPLATES
-- Maturity frameworks (no org_id — global templates)
-- ============================================================
create table if not exists public.playbook_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null default '',
  maturity_level public.playbook_maturity_level not null,
  industry text,
  category text not null,
  actions_template jsonb not null default '[]',
  scoring_criteria jsonb not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_playbook_templates_maturity on public.playbook_templates(maturity_level);
create index if not exists idx_playbook_templates_industry on public.playbook_templates(industry);

alter table public.playbook_templates enable row level security;

-- ============================================================
-- 4. PLAYBOOK ASSESSMENTS
-- Per-org maturity assessments
-- ============================================================
create table if not exists public.playbook_assessments (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  template_id uuid not null references public.playbook_templates(id),
  current_maturity_level public.playbook_maturity_level not null,
  target_maturity_level public.playbook_maturity_level not null,
  overall_score numeric(5,2) not null default 0,
  category_scores jsonb not null default '{}',
  ai_recommendations jsonb not null default '[]',
  assessed_by uuid not null references auth.users(id),
  assessed_at timestamptz not null default now(),
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_playbook_assessments_org on public.playbook_assessments(org_id);
create index if not exists idx_playbook_assessments_template on public.playbook_assessments(template_id);

alter table public.playbook_assessments enable row level security;

-- ============================================================
-- 5. PLAYBOOK ACTIONS
-- Recommended actions per assessment
-- ============================================================
create table if not exists public.playbook_actions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  assessment_id uuid not null references public.playbook_assessments(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null,
  priority public.playbook_action_priority not null default 'medium',
  status public.playbook_action_status not null default 'pending',
  due_date date,
  assigned_to uuid references auth.users(id),
  completed_at timestamptz,
  evidence jsonb not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_playbook_actions_org on public.playbook_actions(org_id);
create index if not exists idx_playbook_actions_assessment on public.playbook_actions(assessment_id);
create index if not exists idx_playbook_actions_status on public.playbook_actions(org_id, status);

alter table public.playbook_actions enable row level security;

-- ============================================================
-- 6. INTELLIGENCE EVENTS
-- Macro events: BoE rates, regulatory changes, news
-- No org_id — these are global events
-- ============================================================
create table if not exists public.intelligence_events (
  id uuid primary key default uuid_generate_v4(),
  event_type public.intelligence_event_type not null,
  title text not null,
  summary text not null,
  source_url text,
  source_name text not null,
  event_date date not null,
  raw_data jsonb not null default '{}',
  sectors_affected text[] not null default '{}',
  regions_affected text[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_intel_events_type on public.intelligence_events(event_type);
create index if not exists idx_intel_events_date on public.intelligence_events(event_date desc);
create index if not exists idx_intel_events_sectors on public.intelligence_events using gin(sectors_affected);

alter table public.intelligence_events enable row level security;

-- ============================================================
-- 7. INTELLIGENCE IMPACTS
-- Per-org impact analysis of global events
-- ============================================================
create table if not exists public.intelligence_impacts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  event_id uuid not null references public.intelligence_events(id) on delete cascade,
  severity public.intelligence_impact_severity not null,
  impact_summary text not null,
  affected_metrics jsonb not null default '[]',
  recommended_actions jsonb not null default '[]',
  ai_confidence numeric(5,4) not null default 0,
  acknowledged boolean not null default false,
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_intel_impacts_org on public.intelligence_impacts(org_id);
create index if not exists idx_intel_impacts_event on public.intelligence_impacts(event_id);
create index if not exists idx_intel_impacts_severity on public.intelligence_impacts(org_id, severity);

alter table public.intelligence_impacts enable row level security;

-- ============================================================
-- 8. BENCHMARKS
-- Sector benchmark data (no org_id — global reference)
-- ============================================================
create table if not exists public.benchmarks (
  id uuid primary key default uuid_generate_v4(),
  sector text not null,
  sub_sector text,
  region text not null default 'UK',
  metric_key text not null,
  metric_label text not null,
  period date not null,
  p10 numeric(15,4),
  p25 numeric(15,4),
  p50 numeric(15,4),
  p75 numeric(15,4),
  p90 numeric(15,4),
  sample_size integer,
  source text not null,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_benchmarks_sector on public.benchmarks(sector);
create index if not exists idx_benchmarks_metric on public.benchmarks(metric_key);
create unique index if not exists idx_benchmarks_unique
  on public.benchmarks(sector, region, metric_key, period);

alter table public.benchmarks enable row level security;

-- ============================================================
-- 9. MODULE TEMPLATES
-- Available modules (no org_id — global catalogue)
-- ============================================================
create table if not exists public.module_templates (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null,
  icon text,
  is_core boolean not null default false,
  requires_modules text[] not null default '{}',
  config_schema jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_module_templates_category on public.module_templates(category);
create index if not exists idx_module_templates_slug on public.module_templates(slug);

alter table public.module_templates enable row level security;

-- ============================================================
-- 10. MODULE INSTANCES
-- Activated modules per org
-- ============================================================
create table if not exists public.module_instances (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  template_id uuid not null references public.module_templates(id),
  status public.module_status not null default 'active',
  config jsonb not null default '{}',
  activated_by uuid not null references auth.users(id),
  activated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_module_instances_org on public.module_instances(org_id);
create unique index if not exists idx_module_instances_org_template
  on public.module_instances(org_id, template_id)
  where status = 'active';

alter table public.module_instances enable row level security;

-- ============================================================
-- 11. REPORTS
-- Board packs, monthly reviews, investor updates
-- ============================================================
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  report_type public.report_type not null,
  title text not null,
  period_start date not null,
  period_end date not null,
  status public.report_status not null default 'draft',
  content jsonb not null default '{}',
  sections jsonb not null default '[]',
  generated_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  sent_at timestamptz,
  recipients jsonb not null default '[]',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reports_org on public.reports(org_id);
create index if not exists idx_reports_type on public.reports(org_id, report_type);
create index if not exists idx_reports_period on public.reports(org_id, period_start, period_end);
create index if not exists idx_reports_status on public.reports(org_id, status);

alter table public.reports enable row level security;

-- ============================================================
-- 12. NOTIFICATIONS
-- User notifications
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  title text not null,
  body text not null default '',
  channel public.notification_channel not null default 'in_app',
  priority public.notification_priority not null default 'normal',
  entity_type text,
  entity_id uuid,
  action_url text,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_org on public.notifications(org_id);
create index if not exists idx_notifications_unread on public.notifications(user_id, read_at)
  where read_at is null;

alter table public.notifications enable row level security;

-- ============================================================
-- 13. FINANCIAL RECORDS
-- Unified financial data from all sources
-- ============================================================
create table if not exists public.financial_records (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  source public.financial_record_source not null,
  source_id text,
  date date not null,
  account_code text not null,
  account_name text not null,
  account_type text not null,
  amount numeric(15,2) not null default 0,
  currency text not null default 'GBP',
  description text,
  contact_name text,
  category text,
  tags text[] not null default '{}',
  raw_data jsonb not null default '{}',
  reconciled boolean not null default false,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fin_records_org on public.financial_records(org_id);
create index if not exists idx_fin_records_date on public.financial_records(org_id, date);
create index if not exists idx_fin_records_source on public.financial_records(org_id, source);
create index if not exists idx_fin_records_account on public.financial_records(org_id, account_code);
create index if not exists idx_fin_records_tags on public.financial_records using gin(tags);

alter table public.financial_records enable row level security;

-- ============================================================
-- 14. FINANCIAL STATEMENTS
-- Computed P&L, Balance Sheet, Cash Flow
-- ============================================================
create table if not exists public.financial_statements (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  statement_type public.statement_type not null,
  period date not null,
  period_type text not null default 'monthly' check (period_type in ('monthly', 'quarterly', 'annual')),
  line_items jsonb not null default '[]',
  totals jsonb not null default '{}',
  comparative_period date,
  comparative_totals jsonb,
  currency text not null default 'GBP',
  is_draft boolean not null default true,
  generated_at timestamptz not null default now(),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fin_statements_org on public.financial_statements(org_id);
create unique index if not exists idx_fin_statements_unique
  on public.financial_statements(org_id, statement_type, period, period_type);

alter table public.financial_statements enable row level security;

-- ============================================================
-- 15. KPI SNAPSHOTS
-- KPI time series data
-- ============================================================
create table if not exists public.kpi_snapshots (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  period date not null,
  metric_key text not null,
  metric_label text not null,
  value numeric(15,4) not null,
  unit text not null default 'number',
  category text not null default 'financial',
  source text not null default 'calculated',
  previous_value numeric(15,4),
  target_value numeric(15,4),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_kpi_org on public.kpi_snapshots(org_id);
create index if not exists idx_kpi_metric on public.kpi_snapshots(org_id, metric_key);
create unique index if not exists idx_kpi_unique
  on public.kpi_snapshots(org_id, period, metric_key);
create index if not exists idx_kpi_period on public.kpi_snapshots(org_id, period desc);

alter table public.kpi_snapshots enable row level security;

-- ============================================================
-- 16. BUDGET LINES
-- Budget input for variance analysis
-- ============================================================
create table if not exists public.budget_lines (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  period date not null,
  account_code text not null,
  account_name text not null,
  category text not null,
  budgeted_amount numeric(15,2) not null default 0,
  currency text not null default 'GBP',
  notes text,
  version integer not null default 1,
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_budget_lines_org on public.budget_lines(org_id);
create unique index if not exists idx_budget_lines_unique
  on public.budget_lines(org_id, period, account_code, version);
create index if not exists idx_budget_lines_period on public.budget_lines(org_id, period);

alter table public.budget_lines enable row level security;

-- ============================================================
-- 17. WORKFLOW EXECUTIONS
-- Background job tracking
-- ============================================================
create table if not exists public.workflow_executions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  workflow_type text not null,
  status public.workflow_status not null default 'queued',
  input_params jsonb not null default '{}',
  result jsonb,
  error_message text,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  triggered_by uuid not null references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workflow_org on public.workflow_executions(org_id);
create index if not exists idx_workflow_status on public.workflow_executions(org_id, status);
create index if not exists idx_workflow_type on public.workflow_executions(org_id, workflow_type);

alter table public.workflow_executions enable row level security;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create trigger update_bcp_updated_at
  before update on public.business_context_profiles
  for each row execute function public.update_updated_at();

create trigger update_playbook_templates_updated_at
  before update on public.playbook_templates
  for each row execute function public.update_updated_at();

create trigger update_playbook_assessments_updated_at
  before update on public.playbook_assessments
  for each row execute function public.update_updated_at();

create trigger update_playbook_actions_updated_at
  before update on public.playbook_actions
  for each row execute function public.update_updated_at();

create trigger update_benchmarks_updated_at
  before update on public.benchmarks
  for each row execute function public.update_updated_at();

create trigger update_module_templates_updated_at
  before update on public.module_templates
  for each row execute function public.update_updated_at();

create trigger update_module_instances_updated_at
  before update on public.module_instances
  for each row execute function public.update_updated_at();

create trigger update_reports_updated_at
  before update on public.reports
  for each row execute function public.update_updated_at();

create trigger update_fin_records_updated_at
  before update on public.financial_records
  for each row execute function public.update_updated_at();

create trigger update_fin_statements_updated_at
  before update on public.financial_statements
  for each row execute function public.update_updated_at();

create trigger update_budget_lines_updated_at
  before update on public.budget_lines
  for each row execute function public.update_updated_at();

create trigger update_workflow_executions_updated_at
  before update on public.workflow_executions
  for each row execute function public.update_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- BUSINESS CONTEXT PROFILES
create policy "Members can view business context profiles"
  on public.business_context_profiles for select
  using (org_id = public.user_org_id());

create policy "Advisors can create business context profiles"
  on public.business_context_profiles for insert
  with check (org_id = public.user_org_id() and public.user_has_role('advisor'));

create policy "Advisors can update business context profiles"
  on public.business_context_profiles for update
  using (org_id = public.user_org_id() and public.user_has_role('advisor'));

-- INTERVIEW MESSAGES (immutable — SELECT + INSERT only)
create policy "Members can view interview messages"
  on public.interview_messages for select
  using (org_id = public.user_org_id());

create policy "Advisors can insert interview messages"
  on public.interview_messages for insert
  with check (org_id = public.user_org_id() and public.user_has_role('advisor'));

-- NO UPDATE POLICY for interview_messages
-- NO DELETE POLICY for interview_messages

-- PLAYBOOK TEMPLATES (global — anyone authenticated can read)
create policy "Authenticated users can view playbook templates"
  on public.playbook_templates for select
  using (auth.uid() is not null);

create policy "Only service role can manage playbook templates"
  on public.playbook_templates for insert
  with check (false);

create policy "Only service role can update playbook templates"
  on public.playbook_templates for update
  using (false);

-- PLAYBOOK ASSESSMENTS
create policy "Members can view playbook assessments"
  on public.playbook_assessments for select
  using (org_id = public.user_org_id());

create policy "Advisors can create playbook assessments"
  on public.playbook_assessments for insert
  with check (org_id = public.user_org_id() and public.user_has_role('advisor'));

create policy "Advisors can update playbook assessments"
  on public.playbook_assessments for update
  using (org_id = public.user_org_id() and public.user_has_role('advisor'));

-- PLAYBOOK ACTIONS
create policy "Members can view playbook actions"
  on public.playbook_actions for select
  using (org_id = public.user_org_id());

create policy "Advisors can create playbook actions"
  on public.playbook_actions for insert
  with check (org_id = public.user_org_id() and public.user_has_role('advisor'));

create policy "Advisors can update playbook actions"
  on public.playbook_actions for update
  using (org_id = public.user_org_id() and public.user_has_role('advisor'));

-- INTELLIGENCE EVENTS (global — anyone authenticated can read)
create policy "Authenticated users can view intelligence events"
  on public.intelligence_events for select
  using (auth.uid() is not null);

create policy "Only service role can insert intelligence events"
  on public.intelligence_events for insert
  with check (false);

-- NO UPDATE POLICY for intelligence_events
-- NO DELETE POLICY for intelligence_events

-- INTELLIGENCE IMPACTS
create policy "Members can view intelligence impacts"
  on public.intelligence_impacts for select
  using (org_id = public.user_org_id());

create policy "Service can insert intelligence impacts"
  on public.intelligence_impacts for insert
  with check (org_id = public.user_org_id());

create policy "Members can update intelligence impacts"
  on public.intelligence_impacts for update
  using (org_id = public.user_org_id());

-- BENCHMARKS (global — anyone authenticated can read)
create policy "Authenticated users can view benchmarks"
  on public.benchmarks for select
  using (auth.uid() is not null);

create policy "Only service role can manage benchmarks"
  on public.benchmarks for insert
  with check (false);

create policy "Only service role can update benchmarks"
  on public.benchmarks for update
  using (false);

-- MODULE TEMPLATES (global — anyone authenticated can read)
create policy "Authenticated users can view module templates"
  on public.module_templates for select
  using (auth.uid() is not null);

create policy "Only service role can manage module templates"
  on public.module_templates for insert
  with check (false);

create policy "Only service role can update module templates"
  on public.module_templates for update
  using (false);

-- MODULE INSTANCES
create policy "Members can view module instances"
  on public.module_instances for select
  using (org_id = public.user_org_id());

create policy "Admins can create module instances"
  on public.module_instances for insert
  with check (org_id = public.user_org_id() and public.user_has_role('admin'));

create policy "Admins can update module instances"
  on public.module_instances for update
  using (org_id = public.user_org_id() and public.user_has_role('admin'));

-- REPORTS
create policy "Members can view reports"
  on public.reports for select
  using (org_id = public.user_org_id());

create policy "Advisors can create reports"
  on public.reports for insert
  with check (org_id = public.user_org_id() and public.user_has_role('advisor'));

create policy "Advisors can update reports"
  on public.reports for update
  using (org_id = public.user_org_id() and public.user_has_role('advisor'));

-- NOTIFICATIONS
create policy "Users can view their own notifications"
  on public.notifications for select
  using (org_id = public.user_org_id() and user_id = auth.uid());

create policy "Service can insert notifications"
  on public.notifications for insert
  with check (org_id = public.user_org_id());

create policy "Users can update their own notifications"
  on public.notifications for update
  using (org_id = public.user_org_id() and user_id = auth.uid());

-- FINANCIAL RECORDS
create policy "Members can view financial records"
  on public.financial_records for select
  using (org_id = public.user_org_id());

create policy "Service can insert financial records"
  on public.financial_records for insert
  with check (org_id = public.user_org_id());

create policy "Service can update financial records"
  on public.financial_records for update
  using (org_id = public.user_org_id());

-- FINANCIAL STATEMENTS
create policy "Members can view financial statements"
  on public.financial_statements for select
  using (org_id = public.user_org_id());

create policy "Service can insert financial statements"
  on public.financial_statements for insert
  with check (org_id = public.user_org_id());

create policy "Service can update financial statements"
  on public.financial_statements for update
  using (org_id = public.user_org_id());

-- KPI SNAPSHOTS (immutable — SELECT + INSERT only)
create policy "Members can view kpi snapshots"
  on public.kpi_snapshots for select
  using (org_id = public.user_org_id());

create policy "Service can insert kpi snapshots"
  on public.kpi_snapshots for insert
  with check (org_id = public.user_org_id());

-- NO UPDATE POLICY for kpi_snapshots
-- NO DELETE POLICY for kpi_snapshots

-- BUDGET LINES
create policy "Members can view budget lines"
  on public.budget_lines for select
  using (org_id = public.user_org_id());

create policy "Advisors can create budget lines"
  on public.budget_lines for insert
  with check (org_id = public.user_org_id() and public.user_has_role('advisor'));

create policy "Advisors can update budget lines"
  on public.budget_lines for update
  using (org_id = public.user_org_id() and public.user_has_role('advisor'));

-- WORKFLOW EXECUTIONS
create policy "Members can view workflow executions"
  on public.workflow_executions for select
  using (org_id = public.user_org_id());

create policy "Service can insert workflow executions"
  on public.workflow_executions for insert
  with check (org_id = public.user_org_id());

create policy "Service can update workflow executions"
  on public.workflow_executions for update
  using (org_id = public.user_org_id());
