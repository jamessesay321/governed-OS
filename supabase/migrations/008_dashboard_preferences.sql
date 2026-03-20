-- ============================================================
-- Migration 008: Dashboard Preferences
-- Stores user's dashboard template selection and custom widget layouts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL DEFAULT 'owner-default',
  custom_widgets JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- RLS
ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_preferences_select" ON public.dashboard_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "dashboard_preferences_insert" ON public.dashboard_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "dashboard_preferences_update" ON public.dashboard_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_dashboard_prefs_org_user
  ON public.dashboard_preferences(org_id, user_id);
