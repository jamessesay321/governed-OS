-- ============================================================
-- ROADMAP PROGRESS — tracks per-org activation step completion
-- ============================================================

CREATE TABLE IF NOT EXISTS public.roadmap_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('completed', 'in_progress', 'locked', 'available')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, step_id)
);

CREATE INDEX idx_roadmap_progress_org ON public.roadmap_progress(org_id);

-- Enable RLS
ALTER TABLE public.roadmap_progress ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Members can view their org roadmap progress"
  ON public.roadmap_progress FOR SELECT
  USING (org_id = public.user_org_id());

CREATE POLICY "Members can insert roadmap progress"
  ON public.roadmap_progress FOR INSERT
  WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Members can update their org roadmap progress"
  ON public.roadmap_progress FOR UPDATE
  USING (org_id = public.user_org_id());

-- Auto-update updated_at
CREATE TRIGGER update_roadmap_progress_updated_at
  BEFORE UPDATE ON public.roadmap_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
