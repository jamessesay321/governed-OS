/**
 * AI Commentary Generator with Source Citations
 *
 * Generates narrative commentary for a period, comparing actuals
 * against the business thesis expectations. Every number in the
 * narrative MUST have a source citation.
 */

import { callLLMCached } from '@/lib/ai/cache';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { getThesis } from './thesis';
import { governedOutput, xeroFinancialsSource } from '@/lib/governance/checkpoint';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Commentary {
  orgId: string;
  period: string;
  sections: CommentarySection[];
  generatedAt: string;
  sources: SourceCitation[];
}

export interface CommentarySection {
  title: string;
  narrative: string;
  citations: { text: string; source: string; reference: string }[];
  metrics: { label: string; value: string; change?: string }[];
  sentiment: 'positive' | 'neutral' | 'concerning';
}

export interface SourceCitation {
  id: string;
  table: string;
  accountCodes?: string[];
  period: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const COMMENTARY_SYSTEM_PROMPT = `You are a senior financial analyst writing a monthly commentary for a UK business. Every number you cite MUST include a source reference in square brackets like [ref:1].

Write clear, actionable commentary in these sections:
1. Revenue — what happened to revenue, why, and what it means
2. Profitability — gross and operating margins, what drove changes
3. Costs — largest cost items, any unusual movements
4. Outlook — forward-looking assessment based on trends

Rules:
- Use £ currency formatted with commas
- Every number must have a [ref:N] citation
- Compare against thesis expectations where available
- Be specific: name account lines, percentages, amounts
- Keep each section to 2-4 sentences
- Sentiment should be: positive (good news), neutral (mixed/stable), concerning (problems)

Respond with ONLY valid JSON:
{
  "sections": [
    {
      "title": "string",
      "narrative": "string with [ref:N] citations",
      "citations": [
        { "text": "the cited figure", "source": "table.column", "reference": "ref:N" }
      ],
      "metrics": [
        { "label": "string", "value": "string", "change": "string or null" }
      ],
      "sentiment": "positive | neutral | concerning"
    }
  ]
}`;

/**
 * Generate AI commentary for a period with source citations.
 * Compares actuals against thesis expectations.
 */
export async function generateCommentary(
  orgId: string,
  period?: string
): Promise<Commentary> {
  const supabase = await createUntypedServiceClient();

  // 1. Fetch financial data
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId);

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  const fins = (financials ?? []) as NormalisedFinancial[];
  const accs = (accounts ?? []) as ChartOfAccount[];

  const periods = getAvailablePeriods(fins);
  if (periods.length === 0) {
    return {
      orgId,
      period: period || 'N/A',
      sections: [{
        title: 'No Data',
        narrative: 'No financial data available for commentary. Connect your accounting system and sync data.',
        citations: [],
        metrics: [],
        sentiment: 'neutral',
      }],
      generatedAt: new Date().toISOString(),
      sources: [],
    };
  }

  const targetPeriod = period && periods.includes(period) ? period : periods[0];
  const currentPnL = buildPnL(fins, accs, targetPeriod);

  // 2. Previous period for comparison
  const periodIdx = periods.indexOf(targetPeriod);
  const prevPeriod = periodIdx < periods.length - 1 ? periods[periodIdx + 1] : null;
  const prevPnL = prevPeriod ? buildPnL(fins, accs, prevPeriod) : null;

  // 3. Fetch business thesis for context
  const thesis = await getThesis(orgId);

  // 4. Build source citations
  const sources: SourceCitation[] = [];
  let refCounter = 1;

  const addSource = (table: string, desc: string, accountCodes?: string[]): string => {
    const id = `ref:${refCounter++}`;
    sources.push({ id, table, accountCodes, period: targetPeriod, description: desc });
    return id;
  };

  // Build data payload for LLM
  const revRef = addSource('normalised_financials', `Revenue total for ${targetPeriod}`);
  const cosRef = addSource('normalised_financials', `Cost of sales total for ${targetPeriod}`);
  const gpRef = addSource('normalised_financials', `Gross profit (revenue - cost of sales) for ${targetPeriod}`);
  const expRef = addSource('normalised_financials', `Operating expenses total for ${targetPeriod}`);
  const npRef = addSource('normalised_financials', `Net profit for ${targetPeriod}`);

  const prevRevRef = prevPnL ? addSource('normalised_financials', `Revenue total for ${prevPeriod}`) : null;
  const prevGpRef = prevPnL ? addSource('normalised_financials', `Gross profit for ${prevPeriod}`) : null;
  const prevNpRef = prevPnL ? addSource('normalised_financials', `Net profit for ${prevPeriod}`) : null;

  // Top revenue lines with refs
  const topRevLines = currentPnL.sections
    .find((s) => s.class === 'REVENUE')?.rows
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5)
    .map((r) => {
      const ref = addSource('normalised_financials', `${r.accountName} (${r.accountCode}) for ${targetPeriod}`, [r.accountCode]);
      return { name: r.accountName, amount: r.amount, code: r.accountCode, ref };
    }) || [];

  // Top cost lines with refs
  const topCostLines = currentPnL.sections
    .filter((s) => s.class === 'DIRECTCOSTS' || s.class === 'EXPENSE' || s.class === 'OVERHEADS')
    .flatMap((s) => s.rows)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5)
    .map((r) => {
      const ref = addSource('normalised_financials', `${r.accountName} (${r.accountCode}) for ${targetPeriod}`, [r.accountCode]);
      return { name: r.accountName, amount: r.amount, code: r.accountCode, ref };
    });

  // Calculate margins
  const grossMargin = currentPnL.revenue > 0
    ? ((currentPnL.grossProfit / currentPnL.revenue) * 100).toFixed(1)
    : '0';
  const opMargin = currentPnL.revenue > 0
    ? ((currentPnL.netProfit / currentPnL.revenue) * 100).toFixed(1)
    : '0';

  const prevGrossMargin = prevPnL && prevPnL.revenue > 0
    ? ((prevPnL.grossProfit / prevPnL.revenue) * 100).toFixed(1)
    : null;

  // Build user message
  const parts: string[] = [
    `Period: ${targetPeriod}`,
    '',
    `--- Current Period (${targetPeriod}) ---`,
    `Revenue: £${currentPnL.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })} [${revRef}]`,
    `Cost of Sales: £${Math.abs(currentPnL.costOfSales).toLocaleString('en-GB', { minimumFractionDigits: 2 })} [${cosRef}]`,
    `Gross Profit: £${currentPnL.grossProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${grossMargin}%) [${gpRef}]`,
    `Operating Expenses: £${Math.abs(currentPnL.expenses).toLocaleString('en-GB', { minimumFractionDigits: 2 })} [${expRef}]`,
    `Net Profit: £${currentPnL.netProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${opMargin}%) [${npRef}]`,
  ];

  if (prevPnL) {
    parts.push('');
    parts.push(`--- Previous Period (${prevPeriod}) ---`);
    parts.push(`Revenue: £${prevPnL.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })} [${prevRevRef}]`);
    parts.push(`Gross Profit: £${prevPnL.grossProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${prevGrossMargin}%) [${prevGpRef}]`);
    parts.push(`Net Profit: £${prevPnL.netProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })} [${prevNpRef}]`);
  }

  parts.push('');
  parts.push('--- Top Revenue Lines ---');
  for (const line of topRevLines) {
    parts.push(`${line.name}: £${Math.abs(line.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })} [${line.ref}]`);
  }

  parts.push('');
  parts.push('--- Top Cost Lines ---');
  for (const line of topCostLines) {
    parts.push(`${line.name}: £${Math.abs(line.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })} [${line.ref}]`);
  }

  if (thesis) {
    parts.push('');
    parts.push('--- Business Thesis Expectations ---');
    parts.push(`Expected Gross Margin: ${thesis.costStructure.expectedGrossMargin}`);
    parts.push(`Expected Growth Range: ${thesis.revenueStructure.expectedGrowthRange}`);
    parts.push(`Revenue Type: ${thesis.revenueStructure.type}`);
    parts.push(`Biggest Expected Costs: ${thesis.costStructure.biggestCostLines.join(', ')}`);
    parts.push(`Actual Gross Margin: ${grossMargin}%`);
    if (thesis.costStructure.expectedGrossMargin) {
      parts.push(`Compare: thesis expected ${thesis.costStructure.expectedGrossMargin}, actual is ${grossMargin}%.`);
    }
  }

  parts.push('');
  parts.push('Available source references:');
  for (const src of sources) {
    parts.push(`[${src.id}] = ${src.description}`);
  }

  const userMessage = parts.join('\n');

  // 5. Call LLM
  const llmResult = await callLLMCached({
    systemPrompt: COMMENTARY_SYSTEM_PROMPT,
    userMessage,
    orgId,
    temperature: 0.3,
  });

  // 6. Parse response
  let parsedSections: CommentarySection[];
  try {
    const jsonMatch = llmResult.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    parsedSections = parsed.sections || [];
  } catch {
    parsedSections = [{
      title: 'Commentary',
      narrative: llmResult.response.slice(0, 1000),
      citations: [],
      metrics: [],
      sentiment: 'neutral',
    }];
  }

  // Governance checkpoint — audit trail for AI commentary
  const narrativeContent = parsedSections.map((s) => `${s.title}: ${s.narrative}`).join('\n');
  await governedOutput({
    orgId,
    outputType: 'narrative',
    content: narrativeContent,
    modelTier: 'sonnet',
    modelId: 'claude-sonnet-4-20250514',
    dataSources: [
      xeroFinancialsSource(targetPeriod),
      ...(prevPeriod ? [xeroFinancialsSource(prevPeriod)] : []),
      { type: 'source_citations', reference: `${sources.length} cited references` },
    ],
    tokensUsed: llmResult.tokensUsed,
    cached: false,
  });

  const commentary: Commentary = {
    orgId,
    period: targetPeriod,
    sections: parsedSections,
    generatedAt: new Date().toISOString(),
    sources,
  };

  // 7. Save to commentaries table (upsert per org+period)
  const { error: upsertError } = await supabase
    .from('commentaries')
    .upsert(
      {
        org_id: orgId,
        period: targetPeriod,
        sections: parsedSections as unknown as Record<string, unknown>[],
        sources: sources as unknown as Record<string, unknown>[],
        generated_at: commentary.generatedAt,
      },
      { onConflict: 'org_id,period' }
    );

  if (upsertError) {
    console.error('[analysis/commentary] Failed to save commentary:', upsertError.message);
  }

  return commentary;
}

/**
 * Retrieve a saved commentary for a period.
 * Returns null if no commentary exists for the requested period.
 */
export async function getCommentary(
  orgId: string,
  period: string
): Promise<Commentary | null> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('commentaries')
    .select('*')
    .eq('org_id', orgId)
    .eq('period', period)
    .maybeSingle();

  if (error || !data) return null;

  return {
    orgId,
    period: data.period as string,
    sections: data.sections as unknown as CommentarySection[],
    generatedAt: data.generated_at as string,
    sources: data.sources as unknown as SourceCitation[],
  };
}

/**
 * Get the latest commentary for an organisation (any period).
 */
export async function getLatestCommentary(orgId: string): Promise<Commentary | null> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('commentaries')
    .select('*')
    .eq('org_id', orgId)
    .order('period', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    orgId,
    period: data.period as string,
    sections: data.sections as unknown as CommentarySection[],
    generatedAt: data.generated_at as string,
    sources: data.sources as unknown as SourceCitation[],
  };
}
