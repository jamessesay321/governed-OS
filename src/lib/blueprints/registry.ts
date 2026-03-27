/**
 * Blueprint Registry
 * Server-side functions for fetching, applying, and learning industry blueprints.
 * Blueprints live in the `industry_blueprints` table but fall back to
 * hardcoded templates when a DB record is not found.
 */

import { createUntypedServiceClient } from '@/lib/supabase/server';
import { BLUEPRINT_TEMPLATES, type BlueprintTemplate } from './templates';

// ---- Types ----

export type IndustryBlueprint = {
  id: string;
  slug: string;
  name: string;
  industry: string;
  description: string;
  account_mappings: Array<{
    source_pattern: string;
    target_category: string;
    target_subcategory: string;
  }>;
  kpi_definitions: Array<{
    key: string;
    label: string;
    priority: 'high' | 'medium' | 'low';
    suggested_target?: number;
  }>;
  dashboard_template: Record<string, unknown>;
  interview_prompts: Array<{
    question: string;
    context: string;
  }>;
  common_integrations: string[];
  created_from_org_id: string | null;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ApplyBlueprintResult = {
  account_mappings_count: number;
  kpi_definitions_count: number;
  dashboard_template_id: string;
  blueprint_name: string;
};

// ---- Registry functions ----

/**
 * Fetch a single blueprint by slug.
 * Checks the database first, then falls back to hardcoded templates.
 */
export async function getBlueprint(slug: string): Promise<IndustryBlueprint | null> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('industry_blueprints')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!error && data) {
    return data as IndustryBlueprint;
  }

  // Fall back to hardcoded template
  const template = BLUEPRINT_TEMPLATES.find((t) => t.slug === slug);
  if (!template) return null;

  return templateToBlueprint(template);
}

/**
 * Find blueprints matching an industry string (case-insensitive).
 */
export async function getBlueprintsForIndustry(industry: string): Promise<IndustryBlueprint[]> {
  const supabase = await createUntypedServiceClient();
  const lower = industry.toLowerCase();

  const { data, error } = await supabase
    .from('industry_blueprints')
    .select('*')
    .eq('is_active', true)
    .ilike('industry', `%${lower}%`);

  if (!error && data && data.length > 0) {
    return data as IndustryBlueprint[];
  }

  // Fall back to hardcoded templates
  return BLUEPRINT_TEMPLATES
    .filter(
      (t) =>
        t.industry.toLowerCase().includes(lower) ||
        t.name.toLowerCase().includes(lower)
    )
    .map(templateToBlueprint);
}

/**
 * Apply a blueprint to an organisation.
 * Sets up account mappings, KPI definitions, and dashboard template
 * for the given org by writing to the relevant tables.
 */
export async function applyBlueprint(
  orgId: string,
  blueprintSlug: string
): Promise<ApplyBlueprintResult> {
  const blueprint = await getBlueprint(blueprintSlug);
  if (!blueprint) {
    throw new Error(`Blueprint not found: ${blueprintSlug}`);
  }

  const supabase = await createUntypedServiceClient();

  // 1. Upsert account mappings
  const mappingRows = blueprint.account_mappings.map((m) => ({
    org_id: orgId,
    source_pattern: m.source_pattern,
    target_category: m.target_category,
    target_subcategory: m.target_subcategory,
    source: 'blueprint',
    blueprint_slug: blueprintSlug,
  }));

  if (mappingRows.length > 0) {
    await supabase
      .from('account_mappings')
      .upsert(mappingRows, { onConflict: 'org_id,source_pattern' })
      .throwOnError();
  }

  // 2. Store KPI configuration as org preference
  await supabase
    .from('org_preferences')
    .upsert(
      {
        org_id: orgId,
        key: 'blueprint_kpis',
        value: JSON.stringify(blueprint.kpi_definitions),
      },
      { onConflict: 'org_id,key' }
    );

  // 3. Store the dashboard template preference
  const dashboardTemplateId =
    (blueprint.dashboard_template as Record<string, unknown>)?.id ?? 'owner-default';

  await supabase
    .from('org_preferences')
    .upsert(
      {
        org_id: orgId,
        key: 'blueprint_dashboard',
        value: JSON.stringify(blueprint.dashboard_template),
      },
      { onConflict: 'org_id,key' }
    );

  // 4. Store the active blueprint slug
  await supabase
    .from('org_preferences')
    .upsert(
      {
        org_id: orgId,
        key: 'active_blueprint',
        value: JSON.stringify({ slug: blueprintSlug, name: blueprint.name, applied_at: new Date().toISOString() }),
      },
      { onConflict: 'org_id,key' }
    );

  return {
    account_mappings_count: blueprint.account_mappings.length,
    kpi_definitions_count: blueprint.kpi_definitions.length,
    dashboard_template_id: String(dashboardTemplateId),
    blueprint_name: blueprint.name,
  };
}

/**
 * Generate a new blueprint by learning from an org's current configuration.
 * Reads the org's account mappings, KPI preferences, and dashboard layout
 * to produce a reusable blueprint that other orgs can adopt.
 */
export async function learnFromOrg(orgId: string): Promise<IndustryBlueprint> {
  const supabase = await createUntypedServiceClient();

  // 1. Read org details
  const { data: org } = await supabase
    .from('organisations')
    .select('id, name, industry')
    .eq('id', orgId)
    .single();

  const orgName = org?.name ?? 'Unknown';
  const orgIndustry = org?.industry ?? 'General';

  // 2. Read account mappings
  const { data: mappings } = await supabase
    .from('account_mappings')
    .select('source_pattern, target_category, target_subcategory')
    .eq('org_id', orgId);

  const accountMappings = (mappings ?? []).map((m: Record<string, unknown>) => ({
    source_pattern: String(m.source_pattern ?? ''),
    target_category: String(m.target_category ?? ''),
    target_subcategory: String(m.target_subcategory ?? ''),
  }));

  // 3. Read KPI preferences
  const { data: kpiPref } = await supabase
    .from('org_preferences')
    .select('value')
    .eq('org_id', orgId)
    .eq('key', 'blueprint_kpis')
    .single();

  let kpiDefinitions: IndustryBlueprint['kpi_definitions'] = [];
  if (kpiPref?.value) {
    try {
      kpiDefinitions = JSON.parse(String(kpiPref.value));
    } catch {
      // Use empty array if parsing fails
    }
  }

  // 4. Read dashboard template preference
  const { data: dashPref } = await supabase
    .from('org_preferences')
    .select('value')
    .eq('org_id', orgId)
    .eq('key', 'blueprint_dashboard')
    .single();

  let dashboardTemplate: Record<string, unknown> = {};
  if (dashPref?.value) {
    try {
      dashboardTemplate = JSON.parse(String(dashPref.value));
    } catch {
      // Use empty object if parsing fails
    }
  }

  // 5. Build the slug
  const slug = `learned-${orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`;

  const learned: IndustryBlueprint = {
    id: '', // Will be assigned on save
    slug,
    name: `${orgName} Blueprint`,
    industry: orgIndustry,
    description: `Blueprint learned from ${orgName}. Captures their account mapping patterns, KPI configuration, and dashboard layout for reuse by similar businesses.`,
    account_mappings: accountMappings,
    kpi_definitions: kpiDefinitions,
    dashboard_template: dashboardTemplate,
    interview_prompts: [],
    common_integrations: [],
    created_from_org_id: orgId,
    version: 1,
    is_active: false, // Starts inactive until reviewed
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 6. Persist to DB
  const { data: saved, error } = await supabase
    .from('industry_blueprints')
    .insert({
      slug: learned.slug,
      name: learned.name,
      industry: learned.industry,
      description: learned.description,
      account_mappings: learned.account_mappings,
      kpi_definitions: learned.kpi_definitions,
      dashboard_template: learned.dashboard_template,
      interview_prompts: learned.interview_prompts,
      common_integrations: learned.common_integrations,
      created_from_org_id: learned.created_from_org_id,
      version: learned.version,
      is_active: learned.is_active,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save learned blueprint: ${error.message}`);
  }

  return { ...learned, id: saved?.id ?? '' };
}

/**
 * List all active blueprints.
 * Merges DB records with any hardcoded templates not yet in the DB.
 */
export async function listBlueprints(): Promise<IndustryBlueprint[]> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('industry_blueprints')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (!error && data && data.length > 0) {
    const dbSlugs = new Set((data as IndustryBlueprint[]).map((b) => b.slug));

    // Add any hardcoded templates missing from the DB
    const missing = BLUEPRINT_TEMPLATES
      .filter((t) => !dbSlugs.has(t.slug))
      .map(templateToBlueprint);

    return [...(data as IndustryBlueprint[]), ...missing];
  }

  // If DB is empty, return all hardcoded templates
  return BLUEPRINT_TEMPLATES.map(templateToBlueprint);
}

// ---- Helpers ----

/**
 * Convert a hardcoded BlueprintTemplate to the IndustryBlueprint shape.
 */
function templateToBlueprint(template: BlueprintTemplate): IndustryBlueprint {
  return {
    id: `template-${template.slug}`,
    slug: template.slug,
    name: template.name,
    industry: template.industry,
    description: template.description,
    account_mappings: template.account_mappings,
    kpi_definitions: template.kpi_definitions,
    dashboard_template: template.dashboard_template as unknown as Record<string, unknown>,
    interview_prompts: template.interview_prompts,
    common_integrations: template.common_integrations,
    created_from_org_id: null,
    version: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
