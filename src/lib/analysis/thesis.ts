/**
 * Business Thesis Generator
 *
 * The core analytical IP: a senior research analyst brain that forms
 * a thesis about a business BEFORE looking at the numbers.
 * Takes interview data + first financials, forms expectations.
 */

import { callLLMCached, CACHE_TTL } from '@/lib/ai/cache';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { governedOutput } from '@/lib/governance/checkpoint';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BusinessThesis {
  orgId: string;
  companyName: string;
  industry: string;
  businessModel: string;

  /** Revenue expectations */
  revenueStructure: {
    type: 'recurring' | 'transactional' | 'project' | 'mixed';
    concentration: 'diversified' | 'moderate' | 'concentrated';
    seasonality: 'none' | 'mild' | 'strong';
    expectedGrowthRange: string;
  };

  /** Cost structure expectations */
  costStructure: {
    type: 'fixed_heavy' | 'variable_heavy' | 'balanced';
    expectedGrossMargin: string;
    biggestCostLines: string[];
    labourIntensity: 'low' | 'medium' | 'high';
  };

  /** Health indicators to watch */
  keyMetrics: {
    metric: string;
    expectedRange: string;
    whyItMatters: string;
    warningThreshold: string;
  }[];

  /** Questions the data should answer */
  hypotheses: {
    hypothesis: string;
    dataNeeded: string;
    sourcesRequired: string[];
  }[];

  /** What "good" looks like for this type of business */
  benchmarks: {
    metric: string;
    industryMedian: string;
    topQuartile: string;
    source: string;
  }[];

  generatedAt: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const THESIS_SYSTEM_PROMPT = `You are a senior research analyst forming an initial thesis on a company.

Your job is to think deeply about this business and form EXPECTATIONS about what the numbers should look like BEFORE you see full financials. Think about:
- Revenue quality: Is revenue recurring, transactional, or project-based? How concentrated is it?
- Margin sustainability: What gross margin should this type of business achieve? What drives it?
- Cost discipline: What are the biggest cost lines? Is this a people-heavy or asset-heavy business?
- Cash conversion: How quickly should this business convert revenue to cash?
- Growth trajectory: What growth rate is realistic for this stage and industry?

Be SPECIFIC, not generic. Use your knowledge of industry benchmarks and business models to form precise expectations.

You MUST respond with ONLY valid JSON matching this exact schema:
{
  "companyName": "string",
  "industry": "string",
  "businessModel": "string — 1-2 sentence description of how they make money",
  "revenueStructure": {
    "type": "recurring | transactional | project | mixed",
    "concentration": "diversified | moderate | concentrated",
    "seasonality": "none | mild | strong",
    "expectedGrowthRange": "string e.g. '10-20%'"
  },
  "costStructure": {
    "type": "fixed_heavy | variable_heavy | balanced",
    "expectedGrossMargin": "string e.g. '55-65%'",
    "biggestCostLines": ["string"],
    "labourIntensity": "low | medium | high"
  },
  "keyMetrics": [
    {
      "metric": "string — name of the metric",
      "expectedRange": "string — what range is healthy",
      "whyItMatters": "string — why this matters for this business",
      "warningThreshold": "string — when to worry"
    }
  ],
  "hypotheses": [
    {
      "hypothesis": "string — a testable hypothesis about the business",
      "dataNeeded": "string — what data would confirm or deny this",
      "sourcesRequired": ["string — which data sources are needed"]
    }
  ],
  "benchmarks": [
    {
      "metric": "string",
      "industryMedian": "string",
      "topQuartile": "string",
      "source": "string — where this benchmark comes from"
    }
  ],
  "confidence": 0.0 to 1.0
}

Provide 5-8 key metrics, 3-5 hypotheses, and 4-6 benchmarks. Be precise with numbers.`;

/**
 * Generate a business thesis for an organisation.
 * Fetches interview data and early financials, then uses Claude to
 * form expectations about the business.
 */
export async function generateThesis(orgId: string): Promise<BusinessThesis> {
  const supabase = await createUntypedServiceClient();

  // 1. Fetch org profile
  const { data: org } = await supabase
    .from('organisations')
    .select('name, website_url, business_scan')
    .eq('id', orgId)
    .single();

  // 2. Fetch completed business context profile (interview results)
  const { data: profile } = await supabase
    .from('business_context_profiles')
    .select('*')
    .eq('org_id', orgId)
    .eq('interview_status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Fetch interview messages for richer context
  const interviewMessages: { role: string; content: string }[] = [];
  if (profile) {
    const { data: messages } = await supabase
      .from('interview_messages')
      .select('role, content')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (messages) {
      interviewMessages.push(
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        }))
      );
    }
  }

  // 4. Fetch first 3 months of normalised financials (earliest data)
  const { data: allFinancials } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .order('period', { ascending: true });

  let earlyFinancialSummary = 'No financial data available yet.';
  if (allFinancials && allFinancials.length > 0) {
    const periods = [...new Set(allFinancials.map((f: { period: string }) => f.period))].slice(0, 3);
    const earlyData = allFinancials.filter((f: { period: string }) => periods.includes(f.period));
    const totalByPeriod = new Map<string, number>();
    for (const row of earlyData) {
      const current = totalByPeriod.get(row.period as string) || 0;
      totalByPeriod.set(row.period as string, current + Number(row.amount));
    }
    const lines = Array.from(totalByPeriod.entries())
      .map(([period, total]) => `  ${period}: £${Math.abs(total).toLocaleString('en-GB', { minimumFractionDigits: 2 })} net`);
    earlyFinancialSummary = `First ${periods.length} month(s) of financial data:\n${lines.join('\n')}`;
  }

  // 5. Build the user message with all available context
  const businessScan = org?.business_scan as Record<string, unknown> | null;
  const companyName = businessScan?.company_name || org?.name || 'Unknown';

  const contextParts: string[] = [
    `Company: ${companyName}`,
  ];

  if (org?.website_url) {
    contextParts.push(`Website: ${org.website_url}`);
  }

  if (businessScan) {
    contextParts.push(`Industry: ${businessScan.industry || 'Unknown'}`);
    contextParts.push(`Stage: ${businessScan.estimated_stage || 'Unknown'}`);
    if (businessScan.description) {
      contextParts.push(`Description: ${businessScan.description}`);
    }
  }

  if (profile) {
    contextParts.push('');
    contextParts.push('--- Interview Profile Data ---');
    if (profile.industry) contextParts.push(`Industry: ${profile.industry}`);
    if (profile.sector) contextParts.push(`Sector: ${profile.sector}`);
    if (profile.business_model) contextParts.push(`Business Model: ${profile.business_model}`);
    if (profile.stage) contextParts.push(`Stage: ${profile.stage}`);
    if (profile.employee_count) contextParts.push(`Employees: ${profile.employee_count}`);
    if (profile.revenue_range) contextParts.push(`Revenue Range: ${profile.revenue_range}`);
    if (profile.competitive_landscape) contextParts.push(`Competitive Landscape: ${profile.competitive_landscape}`);
    if (profile.target_market) contextParts.push(`Target Market: ${profile.target_market}`);
    if (profile.funding_status) contextParts.push(`Funding: ${profile.funding_status}`);

    const challenges = profile.key_challenges as string[] | null;
    if (challenges && challenges.length > 0) {
      contextParts.push(`Key Challenges: ${challenges.join(', ')}`);
    }

    const goals = profile.growth_goals as string[] | null;
    if (goals && goals.length > 0) {
      contextParts.push(`Growth Goals: ${goals.join(', ')}`);
    }
  }

  if (interviewMessages.length > 0) {
    contextParts.push('');
    contextParts.push('--- Interview Transcript (key excerpts) ---');
    // Include up to 20 messages to keep context manageable
    const excerpts = interviewMessages.slice(0, 20);
    for (const msg of excerpts) {
      contextParts.push(`[${msg.role}]: ${msg.content.slice(0, 500)}`);
    }
  }

  contextParts.push('');
  contextParts.push('--- Early Financial Data ---');
  contextParts.push(earlyFinancialSummary);

  const userMessage = contextParts.join('\n');

  // 6. Call Claude to generate the thesis
  const llmResult = await callLLMCached({
    systemPrompt: THESIS_SYSTEM_PROMPT,
    userMessage,
    orgId,
    temperature: 0.3,
    cacheTTLMinutes: CACHE_TTL.COMPANY_SKILLS, // 24 hours
  });

  // 7. Parse the response
  let parsed: Omit<BusinessThesis, 'orgId' | 'generatedAt'>;
  try {
    const jsonMatch = llmResult.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in LLM response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse thesis from LLM response');
  }

  const thesis: BusinessThesis = {
    orgId,
    companyName: parsed.companyName || String(companyName),
    industry: parsed.industry || (profile?.industry as string) || 'Unknown',
    businessModel: parsed.businessModel || 'Unknown',
    revenueStructure: parsed.revenueStructure || {
      type: 'mixed',
      concentration: 'moderate',
      seasonality: 'none',
      expectedGrowthRange: 'Unknown',
    },
    costStructure: parsed.costStructure || {
      type: 'balanced',
      expectedGrossMargin: 'Unknown',
      biggestCostLines: [],
      labourIntensity: 'medium',
    },
    keyMetrics: parsed.keyMetrics || [],
    hypotheses: parsed.hypotheses || [],
    benchmarks: parsed.benchmarks || [],
    generatedAt: new Date().toISOString(),
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
  };

  // 7b. Governance checkpoint — audit trail for thesis generation
  await governedOutput({
    orgId,
    outputType: 'business_thesis',
    content: JSON.stringify(thesis),
    modelTier: 'sonnet',
    modelId: 'claude-sonnet-4-20250514',
    dataSources: [
      { type: 'interview_profile', reference: profile ? `profile ${profile.id}` : 'none' },
      { type: 'early_financials', reference: earlyFinancialSummary.slice(0, 100) },
    ],
    tokensUsed: llmResult.tokensUsed,
    cached: false,
  });

  // 8. Save to business_theses table (upsert — one active thesis per org)
  const { error: upsertError } = await supabase
    .from('business_theses')
    .upsert(
      {
        org_id: orgId,
        thesis: thesis as unknown as Record<string, unknown>,
        confidence: thesis.confidence,
        generated_at: thesis.generatedAt,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'org_id' }
    );

  if (upsertError) {
    console.error('[analysis/thesis] Failed to save thesis:', upsertError.message);
  }

  return thesis;
}

/**
 * Retrieve the latest thesis for an organisation.
 * Returns null if no thesis exists or if the thesis has expired.
 */
export async function getThesis(orgId: string): Promise<BusinessThesis | null> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('business_theses')
    .select('thesis, generated_at, confidence')
    .eq('org_id', orgId)
    .gt('expires_at', new Date().toISOString())
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[analysis/thesis] Failed to fetch thesis:', error.message);
    return null;
  }

  if (!data) return null;

  const thesis = data.thesis as unknown as BusinessThesis;
  return {
    ...thesis,
    orgId,
    generatedAt: data.generated_at as string,
    confidence: Number(data.confidence) || 0.5,
  };
}
