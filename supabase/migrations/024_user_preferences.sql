-- ============================================================
-- USER PREFERENCES
-- Per-user settings persisted server-side (language, date format, etc.)
-- ============================================================

create table if not exists public.user_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,
  language text not null default 'en',
  date_format text not null default 'DD/MM/YYYY',
  number_format text not null default 'comma-period',
  timezone text not null default 'Europe/London',
  email_weekly_summary boolean not null default true,
  email_agent_reports boolean not null default true,
  email_kpi_alerts boolean not null default true,
  email_billing_reminders boolean not null default false,
  email_product_updates boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_user_org_prefs unique (user_id, org_id)
);

create index if not exists idx_user_preferences_user on public.user_preferences(user_id);
create index if not exists idx_user_preferences_org on public.user_preferences(org_id);

alter table public.user_preferences enable row level security;

-- Users can read their own preferences
create policy "Users can view own preferences"
  on public.user_preferences for select
  using (user_id = auth.uid());

-- Users can create their own preferences
create policy "Users can create own preferences"
  on public.user_preferences for insert
  with check (user_id = auth.uid());

-- Users can update their own preferences
create policy "Users can update own preferences"
  on public.user_preferences for update
  using (user_id = auth.uid());
