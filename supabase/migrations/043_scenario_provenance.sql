-- 043_scenario_provenance.sql
-- Adds provenance tracking to scenarios so every forecast shows HOW it was built.
-- Enables the "Forecast Wizard" flow (populate from prior year + %) and Syft-style
-- provenance chips on the scenarios list.

ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS created_via text DEFAULT 'manual'
    CHECK (created_via IN (
      'manual',
      'prior_year',
      'this_year',
      'copy',
      'seed_strategic_plan',
      'ai_chat',
      'driver_template',
      'hubspot_pipeline',
      'multi_source'
    )),
  ADD COLUMN IF NOT EXISTS populate_config jsonb;

COMMENT ON COLUMN public.scenarios.created_via IS
  'How the scenario was created. Drives provenance chip on the scenarios list.';

COMMENT ON COLUMN public.scenarios.populate_config IS
  'Configuration used when populating this scenario. Shape depends on created_via. Examples:
   prior_year: { source_range: {start, end}, target_range: {start, end}, percent_change, category_overrides, rolling, auto_vat }
   copy: { source_scenario_id, percent_change }
   hubspot_pipeline: { pipeline_ids, weighted_by_stage, as_of }
   multi_source: { sources: [xero, hubspot, acuity], weights, blend_method }';

-- Backfill: mark the known strategic plan seed so the chip reads correctly on existing scenarios
UPDATE public.scenarios
SET created_via = 'seed_strategic_plan'
WHERE name ILIKE '%Strategic Plan 2026%'
  AND created_via = 'manual';

-- Helpful index for filtering by source on the scenarios list
CREATE INDEX IF NOT EXISTS idx_scenarios_created_via
  ON public.scenarios(org_id, created_via);
