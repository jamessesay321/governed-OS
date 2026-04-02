/**
 * Pull Xero Tracking Categories and map to semantic types.
 *
 * Xero Tracking Categories are custom dimensions (e.g. Department, Location,
 * Project) that businesses use to slice their financials. We pull them and
 * assign a semantic type so the intelligence layer can understand what each
 * dimension represents.
 */

import { xeroGet } from './api';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMWithUsage } from '@/lib/ai/llm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface XeroTrackingCategory {
  TrackingCategoryID: string;
  Name: string;
  Status: string;
  Options: Array<{
    TrackingOptionID: string;
    Name: string;
    Status: string;
  }>;
}

type SemanticType = 'location' | 'department' | 'project' | 'product_line' | 'cost_centre' | 'custom';

interface TrackingCategoryMapping {
  xero_category_id: string;
  xero_category_name: string;
  semantic_type: SemanticType;
  options: Array<{ id: string; name: string }>;
}

// ---------------------------------------------------------------------------
// Heuristic classifier (no LLM needed for obvious names)
// ---------------------------------------------------------------------------

const HEURISTIC_MAP: Record<string, SemanticType> = {
  location: 'location',
  locations: 'location',
  office: 'location',
  region: 'location',
  branch: 'location',
  site: 'location',
  department: 'department',
  departments: 'department',
  dept: 'department',
  team: 'department',
  division: 'department',
  project: 'project',
  projects: 'project',
  job: 'project',
  engagement: 'project',
  product: 'product_line',
  products: 'product_line',
  'product line': 'product_line',
  service: 'product_line',
  'service line': 'product_line',
  'cost centre': 'cost_centre',
  'cost center': 'cost_centre',
  'cost code': 'cost_centre',
};

function classifyByHeuristic(name: string): SemanticType | null {
  const normalised = name.toLowerCase().trim();
  return HEURISTIC_MAP[normalised] ?? null;
}

// ---------------------------------------------------------------------------
// LLM classifier (for ambiguous names)
// ---------------------------------------------------------------------------

async function classifyWithLLM(
  categories: Array<{ name: string; options: string[] }>
): Promise<Record<string, SemanticType>> {
  const systemPrompt = `You classify Xero tracking categories into semantic types. The possible types are:
- location: geographical grouping (offices, regions, branches)
- department: organisational unit (teams, divisions)
- project: project or engagement tracking
- product_line: product or service line segmentation
- cost_centre: cost allocation codes
- custom: doesn't clearly fit any of the above

Return ONLY valid JSON object mapping category name to semantic type.
Example: {"Region": "location", "Department": "department"}`;

  const userMessage = categories
    .map((c) => `"${c.name}" with options: ${c.options.slice(0, 5).join(', ')}${c.options.length > 5 ? '...' : ''}`)
    .join('\n');

  try {
    const llmResult = await callLLMWithUsage({
      systemPrompt,
      userMessage: `Classify these Xero tracking categories:\n\n${userMessage}`,
      temperature: 0.1,
      model: 'haiku',
      maxTokens: 512,
    });

    const jsonMatch = llmResult.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
    const validTypes: SemanticType[] = ['location', 'department', 'project', 'product_line', 'cost_centre', 'custom'];

    const result: Record<string, SemanticType> = {};
    for (const [name, type] of Object.entries(parsed)) {
      result[name] = validTypes.includes(type as SemanticType) ? (type as SemanticType) : 'custom';
    }
    return result;
  } catch (err) {
    console.warn('[TRACKING-CATEGORIES] LLM classification failed:', err);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Main: Pull and map tracking categories
// ---------------------------------------------------------------------------

export async function pullTrackingCategories(
  orgId: string,
  accessToken: string,
  tenantId: string
): Promise<number> {
  // 1. Fetch from Xero API
  const data = await xeroGet('TrackingCategories', accessToken, tenantId);
  const categories: XeroTrackingCategory[] = data?.TrackingCategories ?? [];

  if (categories.length === 0) {
    console.log('[TRACKING-CATEGORIES] No tracking categories found in Xero');
    return 0;
  }

  // 2. Classify each category
  const needsLLM: Array<{ name: string; options: string[] }> = [];
  const mappings: TrackingCategoryMapping[] = [];

  for (const cat of categories) {
    if (cat.Status !== 'ACTIVE') continue;

    const options = (cat.Options ?? [])
      .filter((o) => o.Status === 'ACTIVE')
      .map((o) => ({ id: o.TrackingOptionID, name: o.Name }));

    const heuristicType = classifyByHeuristic(cat.Name);

    if (heuristicType) {
      mappings.push({
        xero_category_id: cat.TrackingCategoryID,
        xero_category_name: cat.Name,
        semantic_type: heuristicType,
        options,
      });
    } else {
      needsLLM.push({ name: cat.Name, options: options.map((o) => o.name) });
      // Placeholder — will be updated after LLM call
      mappings.push({
        xero_category_id: cat.TrackingCategoryID,
        xero_category_name: cat.Name,
        semantic_type: 'custom',
        options,
      });
    }
  }

  // 3. Classify ambiguous names with LLM
  if (needsLLM.length > 0) {
    const llmResults = await classifyWithLLM(needsLLM);
    for (const mapping of mappings) {
      if (llmResults[mapping.xero_category_name]) {
        mapping.semantic_type = llmResults[mapping.xero_category_name];
      }
    }
  }

  // 4. Upsert to DB
  const supabase = await createUntypedServiceClient();
  let saved = 0;

  for (const mapping of mappings) {
    const { error } = await supabase.from('tracking_category_mappings').upsert(
      {
        org_id: orgId,
        xero_category_id: mapping.xero_category_id,
        xero_category_name: mapping.xero_category_name,
        semantic_type: mapping.semantic_type,
        options: JSON.stringify(mapping.options),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,xero_category_id' }
    );

    if (error) {
      console.warn(`[TRACKING-CATEGORIES] Upsert failed for "${mapping.xero_category_name}": ${error.message}`);
      continue;
    }
    saved++;
  }

  console.log(`[TRACKING-CATEGORIES] Mapped ${saved}/${categories.length} tracking categories for org ${orgId}`);
  return saved;
}

// ---------------------------------------------------------------------------
// Get stored tracking category mappings
// ---------------------------------------------------------------------------

export async function getTrackingCategories(orgId: string): Promise<TrackingCategoryMapping[]> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('tracking_category_mappings')
    .select('*')
    .eq('org_id', orgId);

  if (error) {
    console.error('[TRACKING-CATEGORIES] Fetch failed:', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    xero_category_id: row.xero_category_id as string,
    xero_category_name: row.xero_category_name as string,
    semantic_type: row.semantic_type as SemanticType,
    options: (typeof row.options === 'string' ? JSON.parse(row.options) : row.options) as Array<{ id: string; name: string }>,
  }));
}
