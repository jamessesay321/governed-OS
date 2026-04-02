import { createServiceClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMWithUsage } from '@/lib/ai/llm';
import { governedOutput } from '@/lib/governance/checkpoint';
import { getOrgAccountingConfig } from '@/lib/xero/org-config';
import { getTrackingCategories } from '@/lib/xero/tracking-categories';
import { getAccountMappings } from '@/lib/staging/account-mapper';
import {
  CATEGORY_META,
  getCategoriesBySection,
  getStaffCosts,
  getDiscretionaryCosts,
  type StandardCategory,
} from '@/lib/financial/taxonomy';
import { buildFinancialContext } from '@/lib/ai/financial-context';
import type { AccountMapping, OrgAccountingConfig } from '@/types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CompanySkill {
  orgId: string;
  version: number;
  lastUpdated: string;
  businessContext: {
    companyName: string;
    industry: string;
    stage: string;
    businessModel: string;
    teamSize: string;
    seasonality?: string;
  };
  financialStructure: {
    annualRevenue?: string;
    typicalGrossMargin?: string;
    keyCostCenters: string[];
    paymentTerms?: string;
    yearEndMonth: number;
    yearEndDay: number;
    baseCurrency: string;
    vatScheme?: string;
  };
  semanticMappings: {
    mappedAccountCount: number;
    confirmedCount: number;
    topCategories: Array<{ category: string; label: string; count: number }>;
    staffCostCategories: string[];
    discretionaryCategories: string[];
  };
  trackingDimensions: Array<{
    name: string;
    semanticType: string;
    optionCount: number;
  }>;
  kpiDefinitions: {
    name: string;
    formula?: string;
    target?: string;
  }[];
  dataPatterns: {
    seasonalTrends?: string;
    knownAnomalies: string[];
    dataHealthScore?: number;
    forecastReady?: boolean;
  };
  communicationPreferences: {
    ownerFinancialLiteracy: string;
    preferredStyle: string;
    reportFormat: string;
  };
  investorFaq: string[];
  contextFreshness: {
    lastSyncAt?: string;
    lastInterviewAt?: string;
    lastMappingChangeAt?: string;
    isStale: boolean;
    staleReasons: string[];
  };
}

/* ------------------------------------------------------------------ */
/*  Generate a company skill from all semantic intelligence layers     */
/* ------------------------------------------------------------------ */

export async function generateCompanySkill(orgId: string): Promise<CompanySkill> {
  const supabase = await createServiceClient();
  const untypedDb = await createUntypedServiceClient();

  // Fetch all data sources in parallel
  const [orgResult, profileResult, interviewResult, accountingConfig, mappings, trackingCategories, healthResult, syncResult] =
    await Promise.all([
      supabase.from('organisations').select('*').eq('id', orgId).single(),
      supabase.from('business_context_profiles' as any).select('*').eq('org_id', orgId).single(),
      supabase.from('raw_interview_data' as any).select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(1).single(),
      getOrgAccountingConfig(orgId).catch(() => null),
      getAccountMappings(orgId).catch(() => [] as AccountMapping[]),
      getTrackingCategories(orgId).catch(() => []),
      untypedDb.from('data_health_reports').select('overall_score, forecast_ready, created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('sync_log').select('completed_at').eq('org_id', orgId).eq('status', 'completed').order('completed_at', { ascending: false }).limit(1).single(),
    ]);

  const org = orgResult.data as Record<string, unknown> | null;
  const profile = profileResult.data as Record<string, unknown> | null;
  const interview = interviewResult.data as Record<string, unknown> | null;
  const interviewData = (interview?.data ?? {}) as Record<string, unknown>;
  const healthData = healthResult.data as Record<string, unknown> | null;
  const lastSync = syncResult.data as Record<string, unknown> | null;

  // Extract business basics
  const companyName = (org?.name as string) || (org?.demo_company_name as string) || 'Unknown Company';
  const industry = (profile?.industry as string) || (org?.demo_industry as string) || 'General';
  const teamSize = (profile?.team_size as string) || 'Unknown';
  const businessModel = (profile?.business_model as string) || '';
  const revenueRange = (profile?.revenue_range as string) || '';
  const goals = (profile?.goals as string) || '';

  // Accounting config
  const acConfig = accountingConfig as OrgAccountingConfig | null;
  const yearEndMonth = acConfig?.financial_year_end_month ?? 12;
  const yearEndDay = acConfig?.financial_year_end_day ?? 31;
  const baseCurrency = acConfig?.base_currency ?? 'GBP';
  const vatScheme = acConfig?.vat_scheme ?? undefined;

  // Semantic mapping stats
  const confirmedMappings = mappings.filter((m) => m.user_confirmed);
  const categoryCounts = new Map<string, number>();
  for (const m of mappings) {
    categoryCounts.set(m.standard_category, (categoryCounts.get(m.standard_category) ?? 0) + 1);
  }
  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cat, count]) => ({
      category: cat,
      label: CATEGORY_META[cat as StandardCategory]?.label ?? cat,
      count,
    }));

  const staffCatKeys = getStaffCosts().map((c) => CATEGORY_META[c].label);
  const discretionaryCatKeys = getDiscretionaryCosts().map((c) => CATEGORY_META[c].label);

  // Tracking dimensions
  const trackingDimensions = trackingCategories.map((tc) => ({
    name: tc.xero_category_name,
    semanticType: tc.semantic_type,
    optionCount: tc.options.length,
  }));

  // Data health
  const dataHealthScore = (healthData?.overall_score as number) ?? undefined;
  const forecastReady = (healthData?.forecast_ready as boolean) ?? undefined;

  // Context freshness
  const staleReasons: string[] = [];
  const lastSyncAt = lastSync?.completed_at as string | undefined;
  const lastInterviewAt = interview?.created_at as string | undefined;
  const lastMappingChangeAt = mappings.length > 0
    ? mappings.reduce((latest, m) => m.updated_at > latest ? m.updated_at : latest, mappings[0].updated_at)
    : undefined;

  if (lastSyncAt) {
    const daysSinceSync = (Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSync > 7) staleReasons.push(`Last sync was ${Math.round(daysSinceSync)} days ago`);
  } else {
    staleReasons.push('No Xero sync completed');
  }
  if (!lastInterviewAt) staleReasons.push('Onboarding interview not completed');
  if (mappings.length === 0) staleReasons.push('No account mappings configured');
  if (confirmedMappings.length === 0 && mappings.length > 0) staleReasons.push('Account mappings not confirmed by user');

  // Generate communication preferences and investor FAQ via LLM
  let investorFaq: string[] = [];
  let communicationPreferences = {
    ownerFinancialLiteracy: 'intermediate',
    preferredStyle: 'plain English, no jargon, use examples',
    reportFormat: 'visual-heavy, executive summary first',
  };

  try {
    const llmResult = await callLLMWithUsage({
      systemPrompt: `You are an AI business analyst. Given a company profile, generate:
1. A list of 5 likely investor questions specific to this business
2. An assessment of the owner's financial literacy level (basic/intermediate/advanced)
3. A preferred communication style recommendation

Return JSON only (no markdown fences):
{
  "investorFaq": ["question1", "question2", ...],
  "financialLiteracy": "basic|intermediate|advanced",
  "communicationStyle": "brief description",
  "reportFormat": "brief description"
}`,
      userMessage: `Company: ${companyName}
Industry: ${industry}
Team size: ${teamSize}
Business model: ${businessModel}
Revenue range: ${revenueRange}
Goals: ${goals}`,
      temperature: 0.3,
      model: 'haiku',
    });

    let jsonStr = llmResult.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(jsonStr);
    investorFaq = parsed.investorFaq || [];
    communicationPreferences = {
      ownerFinancialLiteracy: parsed.financialLiteracy || 'intermediate',
      preferredStyle: parsed.communicationStyle || 'plain English, no jargon',
      reportFormat: parsed.reportFormat || 'visual-heavy, executive summary first',
    };

    // Governance checkpoint — audit trail for company skill generation
    await governedOutput({
      orgId,
      outputType: 'company_skill',
      content: JSON.stringify({ investorFaq, communicationPreferences }),
      modelTier: 'haiku',
      modelId: 'claude-haiku-4-20250414',
      dataSources: [
        { type: 'organisation_profile', reference: companyName },
        { type: 'business_context_profile', reference: industry },
      ],
      tokensUsed: llmResult.inputTokens + llmResult.outputTokens,
      cached: false,
    });
  } catch {
    investorFaq = [
      'What is your path to profitability?',
      'How do you acquire customers and what does it cost?',
      'What is your competitive advantage?',
      'How do you plan to use the funding?',
      'What are your unit economics?',
    ];
  }

  const skill: CompanySkill = {
    orgId,
    version: 2,
    lastUpdated: new Date().toISOString(),
    businessContext: {
      companyName,
      industry,
      stage: revenueRange || 'Early stage',
      businessModel: businessModel || 'Not specified',
      teamSize: String(teamSize),
      seasonality: interviewData?.seasonality as string | undefined,
    },
    financialStructure: {
      annualRevenue: revenueRange || undefined,
      typicalGrossMargin: interviewData?.gross_margin as string | undefined,
      keyCostCenters: (interviewData?.cost_centers as string[]) || staffCatKeys.slice(0, 5),
      paymentTerms: interviewData?.payment_terms as string | undefined,
      yearEndMonth,
      yearEndDay,
      baseCurrency,
      vatScheme,
    },
    semanticMappings: {
      mappedAccountCount: mappings.length,
      confirmedCount: confirmedMappings.length,
      topCategories,
      staffCostCategories: staffCatKeys,
      discretionaryCategories: discretionaryCatKeys,
    },
    trackingDimensions,
    kpiDefinitions: (interviewData?.custom_kpis as CompanySkill['kpiDefinitions']) || [],
    dataPatterns: {
      seasonalTrends: interviewData?.seasonal_trends as string | undefined,
      knownAnomalies: [],
      dataHealthScore,
      forecastReady,
    },
    communicationPreferences,
    investorFaq,
    contextFreshness: {
      lastSyncAt,
      lastInterviewAt,
      lastMappingChangeAt,
      isStale: staleReasons.length > 0,
      staleReasons,
    },
  };

  // Cache the skill in the database
  await untypedDb.from('company_skills').upsert({
    org_id: orgId,
    version: skill.version,
    skill_data: skill,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'org_id' });

  return skill;
}

/* ------------------------------------------------------------------ */
/*  Get cached skill or generate new one                               */
/* ------------------------------------------------------------------ */

export async function getCompanySkill(orgId: string): Promise<CompanySkill> {
  const untypedDb = await createUntypedServiceClient();

  const { data: cached } = await untypedDb
    .from('company_skills')
    .select('skill_data, updated_at')
    .eq('org_id', orgId)
    .single();

  if (cached) {
    const skillData = cached.skill_data as CompanySkill;
    // Refresh if older than 7 days or version is outdated
    const updatedAt = new Date(cached.updated_at as string);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (updatedAt > weekAgo && (skillData.version ?? 0) >= 2) {
      return skillData;
    }
  }

  return generateCompanySkill(orgId);
}

/* ------------------------------------------------------------------ */
/*  Format skill as rich system prompt for AI calls                    */
/* ------------------------------------------------------------------ */

export async function getSkillAsSystemPrompt(orgId: string): Promise<string> {
  try {
    const skill = await getCompanySkill(orgId);

    const lines: string[] = [];

    // Company identity
    lines.push(`You are an AI financial assistant for ${skill.businessContext.companyName}, a ${skill.businessContext.industry} business in the UK.`);
    lines.push('');

    // Business context
    lines.push('## Company Context');
    lines.push(`- Stage: ${skill.businessContext.stage}`);
    lines.push(`- Business model: ${skill.businessContext.businessModel}`);
    lines.push(`- Team size: ${skill.businessContext.teamSize}`);
    if (skill.businessContext.seasonality) {
      lines.push(`- Seasonality: ${skill.businessContext.seasonality}`);
    }
    lines.push('');

    // Financial structure
    lines.push('## Financial Structure');
    lines.push(`- Currency: ${skill.financialStructure.baseCurrency}`);
    lines.push(`- Financial year ends: ${monthName(skill.financialStructure.yearEndMonth)} ${skill.financialStructure.yearEndDay}`);
    if (skill.financialStructure.annualRevenue) {
      lines.push(`- Annual revenue range: ${skill.financialStructure.annualRevenue}`);
    }
    if (skill.financialStructure.typicalGrossMargin) {
      lines.push(`- Typical gross margin: ${skill.financialStructure.typicalGrossMargin}`);
    }
    lines.push(`- Key cost centres: ${skill.financialStructure.keyCostCenters.join(', ')}`);
    if (skill.financialStructure.vatScheme) {
      lines.push(`- VAT scheme: ${skill.financialStructure.vatScheme}`);
    }
    lines.push('');

    // Semantic understanding
    if (skill.semanticMappings.mappedAccountCount > 0) {
      lines.push('## Account Structure');
      lines.push(`- ${skill.semanticMappings.mappedAccountCount} accounts mapped to standard categories (${skill.semanticMappings.confirmedCount} confirmed)`);
      if (skill.semanticMappings.topCategories.length > 0) {
        lines.push('- Key categories: ' + skill.semanticMappings.topCategories.map((c) => `${c.label} (${c.count})`).join(', '));
      }
      lines.push('');
    }

    // Tracking dimensions
    if (skill.trackingDimensions.length > 0) {
      lines.push('## Business Dimensions');
      for (const dim of skill.trackingDimensions) {
        lines.push(`- ${dim.name} (${dim.semanticType}): ${dim.optionCount} options`);
      }
      lines.push('');
    }

    // Data quality
    if (skill.dataPatterns.dataHealthScore != null) {
      lines.push('## Data Quality');
      lines.push(`- Health score: ${skill.dataPatterns.dataHealthScore}/100`);
      lines.push(`- Forecast ready: ${skill.dataPatterns.forecastReady ? 'Yes' : 'No'}`);
      if (skill.dataPatterns.seasonalTrends) {
        lines.push(`- Seasonal patterns: ${skill.dataPatterns.seasonalTrends}`);
      }
      lines.push('');
    }

    // Communication preferences
    lines.push('## Communication Style');
    lines.push(`- Owner financial literacy: ${skill.communicationPreferences.ownerFinancialLiteracy}`);
    lines.push(`- Preferred style: ${skill.communicationPreferences.preferredStyle}`);
    lines.push(`- Report format: ${skill.communicationPreferences.reportFormat}`);
    lines.push('');

    // Context freshness warnings
    if (skill.contextFreshness.isStale) {
      lines.push('## Data Freshness Warnings');
      for (const reason of skill.contextFreshness.staleReasons) {
        lines.push(`- ${reason}`);
      }
      lines.push('Note: Flag any insights that may be affected by stale data.');
      lines.push('');
    }

    // Standing instructions
    lines.push('## Standing Instructions');
    lines.push('- Use £ currency formatted with commas (e.g. £79,000)');
    lines.push('- Reference UK tax rules (Corporation Tax, VAT, PAYE, Employer NI, Employer Pension)');
    lines.push('- Lead with the most important insight');
    lines.push('- Be direct and actionable — this is for a busy business owner');
    lines.push('- Always include confidence level with financial assessments');
    lines.push('- When referencing account categories, use the standard category names from the mapping');

    return lines.join('\n');
  } catch {
    return 'You are a helpful financial AI assistant for a UK small business. Use £ currency.';
  }
}

/* ------------------------------------------------------------------ */
/*  Lightweight context prefix for other AI callers                    */
/* ------------------------------------------------------------------ */

/**
 * Returns a short (3-5 line) company context string that can be prepended
 * to any existing system prompt. Much lighter than the full skill prompt.
 * Gracefully degrades if data isn't available.
 */
export async function getCompanyContextPrefix(orgId: string): Promise<string> {
  try {
    const skill = await getCompanySkill(orgId);
    const lines: string[] = [];
    lines.push(`Business: ${skill.businessContext.companyName} (${skill.businessContext.industry}, ${skill.businessContext.stage})`);
    lines.push(`Currency: ${skill.financialStructure.baseCurrency}, FY ends ${monthName(skill.financialStructure.yearEndMonth)}`);
    if (skill.communicationPreferences.ownerFinancialLiteracy !== 'advanced') {
      lines.push(`Communication: ${skill.communicationPreferences.preferredStyle}`);
    }
    if (skill.contextFreshness.isStale) {
      lines.push(`Warning: ${skill.contextFreshness.staleReasons[0]}`);
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function monthName(month: number): string {
  const names = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return names[month] ?? 'December';
}
