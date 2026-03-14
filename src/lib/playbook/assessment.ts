import { createClient } from '@/lib/supabase/server';
import { callLLM } from '@/lib/ai/llm';
import { roundCurrency } from '@/lib/financial/normalise';
import { getTemplate, getOverallLabel } from './templates';
import type {
  PlaybookAssessment,
  DimensionScore,
  PlaybookDimension,
  MaturityLevel,
  DimensionLevelDefinition,
} from '@/types/playbook';

// === KPI Extraction ===

type OrgKPIs = Record<string, number | null>;

/**
 * Extract KPIs from organisation financial data.
 * All calculations are deterministic - no AI.
 */
async function extractOrgKPIs(orgId: string): Promise<OrgKPIs> {
  const supabase = await createClient();

  // Fetch normalised financials
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('*, chart_of_accounts!normalised_financials_account_id_fkey(name, type, class)')
    .eq('org_id', orgId)
    .order('period', { ascending: false });

  // Fetch business context profile
  const { data: contextRaw } = await supabase
    .from('business_context_profiles' as any)
    .select('*')
    .eq('org_id', orgId)
    .limit(1)
    .single();
  const context = contextRaw as any;

  // Fetch audit log count to determine governance
  const { count: auditCount } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId);

  // Fetch latest model snapshots for scenario data
  const { data: snapshots } = await supabase
    .from('model_snapshots')
    .select('*')
    .eq('org_id', orgId)
    .order('period', { ascending: false })
    .limit(24);

  const kpis: OrgKPIs = {};

  if (snapshots && snapshots.length > 0) {
    const latest = snapshots[0];
    const latestRevenue = latest.revenue;
    const latestCostOfSales = latest.cost_of_sales;
    const latestOpex = latest.operating_expenses;

    // Financial Health KPIs
    kpis.gross_margin_pct = latest.gross_margin_pct * 100;
    kpis.net_margin_pct = latest.net_margin_pct * 100;
    kpis.cash_runway_months = latest.runway_months;

    // Calculate revenue growth from snapshots
    if (snapshots.length >= 2) {
      const prevRevenue = snapshots[1].revenue;
      kpis.revenue_growth_pct =
        prevRevenue > 0
          ? roundCurrency(((latestRevenue - prevRevenue) / prevRevenue) * 100)
          : 0;
    } else {
      kpis.revenue_growth_pct = 0;
    }

    // Operations KPIs
    kpis.opex_ratio =
      latestRevenue > 0
        ? roundCurrency((latestOpex / latestRevenue) * 100)
        : null;

    // Break-even volume from cost structure
    kpis.break_even_revenue =
      latestCostOfSales + latestOpex > 0
        ? roundCurrency(latestCostOfSales + latestOpex)
        : null;
  } else if (financials && financials.length > 0) {
    // Fallback to normalised financials
    const periods = [...new Set(financials.map((f) => f.period))].sort().reverse();
    const latestPeriod = periods[0];
    const prevPeriod = periods[1] || null;

    const latestFinancials = financials.filter((f) => f.period === latestPeriod);
    const prevFinancials = prevPeriod
      ? financials.filter((f) => f.period === prevPeriod)
      : [];

    let totalRevenue = 0;
    let totalCosts = 0;
    let prevTotalRevenue = 0;

    for (const f of latestFinancials) {
      const acc = f.chart_of_accounts as { name: string; type: string; class: string } | null;
      if (acc?.class === 'REVENUE') totalRevenue += f.amount;
      if (acc?.class === 'EXPENSE') totalCosts += f.amount;
    }

    for (const f of prevFinancials) {
      const acc = f.chart_of_accounts as { name: string; type: string; class: string } | null;
      if (acc?.class === 'REVENUE') prevTotalRevenue += f.amount;
    }

    kpis.gross_margin_pct =
      totalRevenue > 0
        ? roundCurrency(((totalRevenue - totalCosts) / totalRevenue) * 100)
        : null;
    kpis.net_margin_pct = kpis.gross_margin_pct; // Simplified without detailed breakdown
    kpis.revenue_growth_pct =
      prevTotalRevenue > 0
        ? roundCurrency(((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100)
        : 0;
    kpis.opex_ratio =
      totalRevenue > 0
        ? roundCurrency((totalCosts / totalRevenue) * 100)
        : null;

    // Months of data
    kpis.months_of_data = periods.length;
  }

  // Default AR/AP days (would come from transaction analysis)
  kpis.ar_days = kpis.ar_days ?? 35;
  kpis.ap_days = kpis.ap_days ?? 28;

  // Growth KPIs from context profile
  kpis.customer_concentration_pct = null;
  kpis.recurring_revenue_pct = null;
  if (context) {
    kpis.team_size = context.team_size;
    kpis.customer_concentration_pct =
      context.customer_concentration_risk === 'high'
        ? 65
        : context.customer_concentration_risk === 'medium'
          ? 35
          : 15;
  }

  // Revenue per employee
  if (kpis.team_size && snapshots && snapshots.length > 0) {
    const annualRevenue = snapshots[0].revenue * 12;
    kpis.revenue_per_employee = roundCurrency(annualRevenue / (kpis.team_size as number));
  }

  kpis.has_cfo_or_fd = context?.team_structure?.toLowerCase().includes('cfo') ||
    context?.team_structure?.toLowerCase().includes('finance director')
    ? 1
    : 0;

  // Governance KPIs
  const totalFinancialRecords = financials?.length ?? 0;
  const filledRecords = financials?.filter((f) => f.amount !== 0).length ?? 0;
  kpis.data_completeness_pct =
    totalFinancialRecords > 0
      ? roundCurrency((filledRecords / totalFinancialRecords) * 100)
      : 0;
  kpis.audit_trail_active = (auditCount ?? 0) > 0 ? 1 : 0;
  kpis.months_of_data = kpis.months_of_data ?? 0;

  return kpis;
}

// === Scoring Engine ===

/**
 * Score a single dimension based on KPI values.
 * Deterministic: finds the best-matching maturity level.
 */
function scoreDimension(
  dimension: PlaybookDimension,
  kpis: OrgKPIs
): DimensionScore {
  const kpiValues: Record<string, number | null> = {};
  for (const key of dimension.kpiKeys) {
    kpiValues[key] = kpis[key] ?? null;
  }

  // For each level (5 down to 1), check if all KPI values fall within thresholds
  let bestLevel: MaturityLevel = 1;
  let bestLabel = dimension.levels[0].label;
  let bestReasoning = '';

  for (const levelDef of [...dimension.levels].reverse()) {
    const matches = checkLevelMatch(levelDef, kpis, dimension.kpiKeys);
    if (matches.matched) {
      bestLevel = levelDef.level;
      bestLabel = levelDef.label;
      bestReasoning = matches.reasoning;
      break;
    }
  }

  // If no level matched perfectly, find the closest
  if (!bestReasoning) {
    const { level, label, reasoning } = findClosestLevel(dimension, kpis);
    bestLevel = level;
    bestLabel = label;
    bestReasoning = reasoning;
  }

  return {
    dimensionId: dimension.id,
    dimensionName: dimension.name,
    score: bestLevel,
    label: bestLabel,
    weight: dimension.weight,
    kpiValues,
    reasoning: bestReasoning,
  };
}

function checkLevelMatch(
  levelDef: DimensionLevelDefinition,
  kpis: OrgKPIs,
  kpiKeys: string[]
): { matched: boolean; reasoning: string } {
  const reasons: string[] = [];
  let matchedCount = 0;
  let totalApplicable = 0;

  for (const key of kpiKeys) {
    const value = kpis[key];
    const threshold = levelDef.thresholds[key];

    if (value === null || value === undefined || !threshold) continue;
    totalApplicable++;

    if (value >= threshold.min && value <= threshold.max) {
      matchedCount++;
      reasons.push(`${key}: ${value.toFixed(1)} (within ${threshold.min}-${threshold.max})`);
    }
  }

  // Require at least 60% of applicable KPIs to match
  const matched = totalApplicable > 0 && matchedCount / totalApplicable >= 0.6;
  return {
    matched,
    reasoning: reasons.join('; ') || 'Insufficient data for scoring.',
  };
}

function findClosestLevel(
  dimension: PlaybookDimension,
  kpis: OrgKPIs
): { level: MaturityLevel; label: string; reasoning: string } {
  let bestScore = 0;
  let bestLevel: MaturityLevel = 1;
  let bestLabel = dimension.levels[0].label;

  for (const levelDef of dimension.levels) {
    let score = 0;
    let count = 0;

    for (const key of dimension.kpiKeys) {
      const value = kpis[key];
      const threshold = levelDef.thresholds[key];
      if (value === null || value === undefined || !threshold) continue;
      count++;

      const midpoint = (threshold.min + threshold.max) / 2;
      const range = threshold.max - threshold.min;
      if (range === 0) continue;

      const distance = Math.abs(value - midpoint) / range;
      score += Math.max(0, 1 - distance);
    }

    const normalised = count > 0 ? score / count : 0;
    if (normalised > bestScore) {
      bestScore = normalised;
      bestLevel = levelDef.level;
      bestLabel = levelDef.label;
    }
  }

  return {
    level: bestLevel,
    label: bestLabel,
    reasoning: 'Score estimated from closest matching thresholds.',
  };
}

/**
 * Calculate overall maturity score as weighted average of dimension scores.
 */
function calculateOverallScore(scores: DimensionScore[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const score of scores) {
    weightedSum += score.score * score.weight;
    totalWeight += score.weight;
  }

  return totalWeight > 0 ? roundCurrency(weightedSum / totalWeight) : 1;
}

// === AI Narrative ===

async function generateAINarrative(
  scores: DimensionScore[],
  overallScore: number,
  overallLabel: string
): Promise<string> {
  const scoresSummary = scores
    .map(
      (s) =>
        `${s.dimensionName}: Level ${s.score}/5 (${s.label}) - ${s.reasoning}`
    )
    .join('\n');

  try {
    const narrative = await callLLM({
      systemPrompt: `You are a senior business advisor. Generate a concise, professional assessment summary for an SME.
Focus on:
1. Overall position and what the maturity level means
2. Strongest dimensions (celebrate wins)
3. Key areas requiring attention (be specific but constructive)
4. One strategic recommendation

Keep it under 200 words. Use professional but accessible language. No bullet points - use flowing paragraphs.`,
      userMessage: `Organisation maturity assessment results:
Overall Score: ${overallScore.toFixed(1)}/5 (${overallLabel})

Dimension scores:
${scoresSummary}

Generate a professional narrative summary of this assessment.`,
    });

    return narrative;
  } catch {
    // Fallback if AI is unavailable
    const weakest = [...scores].sort((a, b) => a.score - b.score)[0];
    const strongest = [...scores].sort((a, b) => b.score - a.score)[0];

    return `Your organisation has been assessed at an overall maturity level of ${overallScore.toFixed(1)}/5 (${overallLabel}). ` +
      `Your strongest area is ${strongest.dimensionName} at Level ${strongest.score} (${strongest.label}), ` +
      `while ${weakest.dimensionName} at Level ${weakest.score} (${weakest.label}) represents the greatest opportunity for improvement. ` +
      `Focus on strengthening your ${weakest.dimensionName.toLowerCase()} capabilities to advance your overall maturity.`;
  }
}

// === Main Assessment Function ===

/**
 * Run a full playbook assessment for an organisation.
 * Auto-populates scores from KPI data, calculates weighted average,
 * and generates AI-driven priority action list.
 */
export async function runAssessment(
  orgId: string,
  templateId: string
): Promise<PlaybookAssessment> {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Extract KPIs (deterministic)
  const kpis = await extractOrgKPIs(orgId);

  // Score each dimension (deterministic)
  const dimensionScores: DimensionScore[] = template.dimensions.map((dim) =>
    scoreDimension(dim, kpis)
  );

  // Calculate overall score (deterministic)
  const overallScore = calculateOverallScore(dimensionScores);
  const overallLabel = getOverallLabel(overallScore);

  // Generate AI narrative (AI - for narrative only)
  const aiSummary = await generateAINarrative(dimensionScores, overallScore, overallLabel);

  const assessment: PlaybookAssessment = {
    id: `assess-${orgId}-${Date.now()}`,
    orgId,
    templateId: template.id,
    templateName: template.name,
    overallScore,
    overallLabel,
    dimensionScores,
    aiSummary,
    assessedAt: new Date().toISOString(),
    previousScore: null,
  };

  return assessment;
}

/**
 * Get the latest assessment for an organisation.
 * Returns null if no assessment exists.
 */
export async function getLatestAssessment(
  orgId: string
): Promise<PlaybookAssessment | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('playbook_assessments' as any)
    .select('*')
    .eq('org_id', orgId)
    .order('assessed_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  const d = data as any;
  return {
    id: d.id,
    orgId: d.org_id,
    templateId: d.template_id,
    templateName: d.template_name,
    overallScore: d.overall_score,
    overallLabel: d.overall_label,
    dimensionScores: d.dimension_scores as DimensionScore[],
    aiSummary: d.ai_summary,
    assessedAt: d.assessed_at,
    previousScore: d.previous_score,
  };
}
