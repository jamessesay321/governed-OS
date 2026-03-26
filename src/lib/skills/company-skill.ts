import { createServiceClient } from '@/lib/supabase/server';
import { callLLM } from '@/lib/ai/llm';

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
  };
  kpiDefinitions: {
    name: string;
    formula?: string;
    target?: string;
  }[];
  dataPatterns: {
    seasonalTrends?: string;
    knownAnomalies: string[];
  };
  communicationPreferences: {
    ownerFinancialLiteracy: string;
    preferredStyle: string;
    reportFormat: string;
  };
  investorFaq: string[];
}

/* ------------------------------------------------------------------ */
/*  Generate a company skill from org data                             */
/* ------------------------------------------------------------------ */

export async function generateCompanySkill(orgId: string): Promise<CompanySkill> {
  const supabase = await createServiceClient();

  // Fetch org data
  const { data: org } = await supabase
    .from('organisations')
    .select('*')
    .eq('id', orgId)
    .single();

  // Fetch business context profile
  const { data: profile } = await supabase
    .from('business_context_profiles' as any)
    .select('*')
    .eq('org_id', orgId)
    .single();

  // Fetch interview data for additional context
  const { data: interview } = await supabase
    .from('raw_interview_data' as any)
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const companyName = org?.name || (org as any)?.demo_company_name || 'Unknown Company';
  const industry = (profile as any)?.industry || (org as any)?.demo_industry || 'General';
  const teamSize = (profile as any)?.team_size || 'Unknown';
  const businessModel = (profile as any)?.business_model || '';
  const revenueRange = (profile as any)?.revenue_range || '';
  const goals = (profile as any)?.goals || '';
  const interviewData = (interview as any)?.data || {};

  // Use LLM to generate investor FAQ and communication insights
  let investorFaq: string[] = [];
  let communicationPreferences = {
    ownerFinancialLiteracy: 'intermediate',
    preferredStyle: 'plain English, no jargon, use examples',
    reportFormat: 'visual-heavy, executive summary first',
  };

  try {
    const aiResponse = await callLLM({
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
    });

    let jsonStr = aiResponse.trim();
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
  } catch {
    // Fallback FAQ if LLM fails
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
    version: 1,
    lastUpdated: new Date().toISOString(),
    businessContext: {
      companyName,
      industry,
      stage: revenueRange || 'Early stage',
      businessModel: businessModel || 'Not specified',
      teamSize: String(teamSize),
      seasonality: (interviewData as any)?.seasonality,
    },
    financialStructure: {
      annualRevenue: revenueRange || undefined,
      typicalGrossMargin: (interviewData as any)?.gross_margin,
      keyCostCenters: (interviewData as any)?.cost_centers || ['Salaries', 'Marketing', 'Operations'],
      paymentTerms: (interviewData as any)?.payment_terms,
    },
    kpiDefinitions: (interviewData as any)?.custom_kpis || [],
    dataPatterns: {
      seasonalTrends: (interviewData as any)?.seasonal_trends,
      knownAnomalies: [],
    },
    communicationPreferences,
    investorFaq,
  };

  // Cache the skill in the database
  await supabase.from('company_skills' as any).upsert({
    org_id: orgId,
    version: skill.version,
    skill_data: skill,
    updated_at: new Date().toISOString(),
  } as any, { onConflict: 'org_id' });

  return skill;
}

/* ------------------------------------------------------------------ */
/*  Get cached skill or generate new one                               */
/* ------------------------------------------------------------------ */

export async function getCompanySkill(orgId: string): Promise<CompanySkill> {
  const supabase = await createServiceClient();

  const { data: cached } = await supabase
    .from('company_skills' as any)
    .select('skill_data, updated_at')
    .eq('org_id', orgId)
    .single();

  if (cached) {
    const skillData = (cached as any).skill_data as CompanySkill;
    // Refresh if older than 7 days
    const updatedAt = new Date((cached as any).updated_at);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (updatedAt > weekAgo) {
      return skillData;
    }
  }

  return generateCompanySkill(orgId);
}

/* ------------------------------------------------------------------ */
/*  Format skill as system prompt for AI calls                         */
/* ------------------------------------------------------------------ */

export async function getSkillAsSystemPrompt(orgId: string): Promise<string> {
  try {
    const skill = await getCompanySkill(orgId);

    return `You are an AI assistant for ${skill.businessContext.companyName}, a ${skill.businessContext.industry} business.

Company context:
- Stage: ${skill.businessContext.stage}
- Business model: ${skill.businessContext.businessModel}
- Team size: ${skill.businessContext.teamSize}
${skill.businessContext.seasonality ? `- Seasonality: ${skill.businessContext.seasonality}` : ''}

Financial structure:
${skill.financialStructure.annualRevenue ? `- Annual revenue: ${skill.financialStructure.annualRevenue}` : ''}
${skill.financialStructure.typicalGrossMargin ? `- Typical gross margin: ${skill.financialStructure.typicalGrossMargin}` : ''}
- Key cost centers: ${skill.financialStructure.keyCostCenters.join(', ')}

Communication preferences:
- Financial literacy: ${skill.communicationPreferences.ownerFinancialLiteracy}
- Style: ${skill.communicationPreferences.preferredStyle}
- Report format: ${skill.communicationPreferences.reportFormat}

Common investor questions for this business:
${skill.investorFaq.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
  } catch {
    // Return minimal prompt if skill generation fails
    return 'You are a helpful financial AI assistant for a UK small business.';
  }
}
