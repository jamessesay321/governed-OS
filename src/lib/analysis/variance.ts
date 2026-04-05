/**
 * Variance Explainer
 *
 * Breaks down period-over-period variances into component drivers,
 * using account-level data to decompose what changed and why.
 */

import { callLLMCached } from '@/lib/ai/cache';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { getCompanyContextPrefix } from '@/lib/skills/company-skill';
import { governedOutput, xeroFinancialsSource } from '@/lib/governance/checkpoint';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VarianceExplanation {
  metric: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  drivers: VarianceDriver[];
  aiInsight: string;
}

export interface VarianceDriver {
  factor: string;
  impact: number;
  direction: 'positive' | 'negative';
  explanation: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MetricName = 'revenue' | 'grossProfit' | 'expenses' | 'netProfit' | 'costOfSales';

/**
 * Map a user-facing metric string to PnL summary fields and the
 * account classes that compose it.
 */
function resolveMetric(metric: string): {
  field: MetricName;
  classes: string[];
} | null {
  const lower = metric.toLowerCase().replace(/[\s_-]+/g, '');
  if (lower.includes('revenue') || lower.includes('sales') || lower.includes('income')) {
    return { field: 'revenue', classes: ['REVENUE', 'OTHERINCOME'] };
  }
  if (lower.includes('grossprofit') || lower.includes('grossmargin')) {
    return { field: 'grossProfit', classes: ['REVENUE', 'OTHERINCOME', 'DIRECTCOSTS'] };
  }
  if (lower.includes('netprofit') || lower.includes('operatingprofit') || lower.includes('bottomline')) {
    return { field: 'netProfit', classes: ['REVENUE', 'OTHERINCOME', 'DIRECTCOSTS', 'EXPENSE', 'OVERHEADS'] };
  }
  if (lower.includes('expense') || lower.includes('opex') || lower.includes('overhead')) {
    return { field: 'expenses', classes: ['EXPENSE', 'OVERHEADS'] };
  }
  if (lower.includes('costofsales') || lower.includes('cogs') || lower.includes('directcost')) {
    return { field: 'costOfSales', classes: ['DIRECTCOSTS'] };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Explain the variance of a metric between a given period and the previous one.
 * Decomposes the change into account-level drivers and generates an AI insight.
 */
export async function explainVariance(
  orgId: string,
  period: string,
  metric: string
): Promise<VarianceExplanation> {
  const supabase = await createUntypedServiceClient();

  const resolved = resolveMetric(metric);
  if (!resolved) {
    throw new Error(`Unrecognised metric: "${metric}". Use revenue, grossProfit, expenses, netProfit, or costOfSales.`);
  }

  // Fetch financial data
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

  if (!periods.includes(period)) {
    throw new Error(`Period "${period}" not found in data. Available periods: ${periods.slice(0, 6).join(', ')}`);
  }

  const periodIdx = periods.indexOf(period);
  const prevPeriod = periodIdx < periods.length - 1 ? periods[periodIdx + 1] : null;

  if (!prevPeriod) {
    throw new Error(`No previous period available to compare against "${period}".`);
  }

  // Build P&L for both periods
  const currentPnL = buildPnL(fins, accs, period);
  const previousPnL = buildPnL(fins, accs, prevPeriod);

  const currentValue = currentPnL[resolved.field];
  const previousValue = previousPnL[resolved.field];
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0
    ? Math.round(((change / Math.abs(previousValue)) * 100 + Number.EPSILON) * 100) / 100
    : 0;

  // -----------------------------------------------------------------------
  // Decompose variance into account-level drivers
  // -----------------------------------------------------------------------
  const drivers: VarianceDriver[] = [];

  // Get rows from relevant sections for both periods
  for (const cls of resolved.classes) {
    const currentSection = currentPnL.sections.find((s) => s.class === cls);
    const previousSection = previousPnL.sections.find((s) => s.class === cls);

    if (!currentSection) continue;

    const previousRowMap = new Map(
      (previousSection?.rows || []).map((r) => [r.accountId, r])
    );

    // Accounts that exist in current period
    for (const row of currentSection.rows) {
      const prevRow = previousRowMap.get(row.accountId);
      const prevAmount = prevRow?.amount ?? 0;
      const accountChange = row.amount - prevAmount;

      if (Math.abs(accountChange) > 0.01) {
        const isPositive = resolved.field === 'expenses' || resolved.field === 'costOfSales'
          ? accountChange < 0  // for costs, a decrease is positive
          : accountChange > 0; // for revenue/profit, an increase is positive

        drivers.push({
          factor: `${row.accountName} (${row.accountCode})`,
          impact: accountChange,
          direction: isPositive ? 'positive' : 'negative',
          explanation: `Changed from £${prevAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })} to £${row.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${accountChange > 0 ? '+' : ''}£${accountChange.toLocaleString('en-GB', { minimumFractionDigits: 2 })}).`,
        });
      }
    }

    // Accounts in previous period but not in current (disappeared)
    for (const [accountId, prevRow] of previousRowMap) {
      const stillExists = currentSection.rows.some((r) => r.accountId === accountId);
      if (!stillExists && Math.abs(prevRow.amount) > 0.01) {
        const isPositive = resolved.field === 'expenses' || resolved.field === 'costOfSales'
          ? true  // cost disappearing is positive
          : false; // revenue disappearing is negative

        drivers.push({
          factor: `${prevRow.accountName} (${prevRow.accountCode}) — no longer present`,
          impact: -prevRow.amount,
          direction: isPositive ? 'positive' : 'negative',
          explanation: `Was £${prevRow.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })} in ${prevPeriod}, absent in ${period}.`,
        });
      }
    }
  }

  // Sort by absolute impact (largest movers first)
  drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  // -----------------------------------------------------------------------
  // Generate AI insight
  // -----------------------------------------------------------------------
  let aiInsight = `${metric} changed by ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}% (£${change.toLocaleString('en-GB', { minimumFractionDigits: 2 })}).`;

  try {
    const topDrivers = drivers.slice(0, 8).map((d) => ({
      factor: d.factor,
      impact: `£${d.impact.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
      direction: d.direction,
    }));

    const companyContext = await getCompanyContextPrefix(orgId);
    const llmResult = await callLLMCached({
      systemPrompt: `${companyContext ? companyContext + '\n\n' : ''}You are a financial analyst explaining a variance. Given the metric change and its component drivers, write 2-3 sentences explaining what happened, why it matters, and what to watch for next month. Be specific. Use £ currency. Respond with plain text only.`,
      userMessage: `Metric: ${metric}\nPeriod: ${period} vs ${prevPeriod}\nChange: £${change.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)\nCurrent value: £${currentValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}\nPrevious value: £${previousValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}\n\nTop drivers:\n${JSON.stringify(topDrivers, null, 2)}`,
      orgId,
      temperature: 0.3,
      model: 'sonnet',
      cacheSystemPrompt: true,
    });
    aiInsight = llmResult.response.trim();

    // Governance checkpoint — audit trail for variance AI insights
    await governedOutput({
      orgId,
      outputType: 'variance_commentary',
      content: aiInsight,
      modelTier: 'sonnet',
      modelId: 'claude-sonnet-4-20250514',
      dataSources: [
        xeroFinancialsSource(period),
        { type: 'variance_drivers', reference: `${drivers.length} account-level drivers for ${metric}` },
      ],
      tokensUsed: llmResult.tokensUsed,
      cached: false,
    });
  } catch (err) {
    console.error('[analysis/variance] LLM insight failed, using fallback:', err);
  }

  return {
    metric,
    currentValue,
    previousValue,
    change,
    changePercent,
    drivers,
    aiInsight,
  };
}
