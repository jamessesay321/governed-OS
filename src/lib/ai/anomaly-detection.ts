/**
 * Anomaly Detection Engine
 * Sprint 7: On each Xero data sync, detect unusual patterns.
 *
 * Passes new data to Claude API to identify anomalies, unusual variances,
 * or emerging trends. Surfaces findings as notification cards.
 */

import { callLLM } from './llm';
import { buildFinancialContext } from './financial-context';
import type { FinancialContext } from './financial-context';

export type Anomaly = {
  id: string;
  type: 'spike' | 'drop' | 'trend_change' | 'unusual_transaction' | 'threshold_breach';
  severity: 'high' | 'medium' | 'low';
  metric: string;
  title: string;
  description: string;
  monetary_impact: number | null;
  recommendation: string;
  data_points: Record<string, unknown>;
};

export type AnomalyDetectionResult = {
  anomalies: Anomaly[];
  summary: string;
  analysed_at: string;
};

const ANOMALY_DETECTION_PROMPT = `You are the Grove anomaly detection engine. Compare the latest month's financial data to the previous 6 months and identify unusual patterns.

## Rules
- Respond with valid JSON ONLY.
- Maximum 5 anomalies per analysis.
- Focus on material anomalies — ignore noise under 5% variance from trend.
- Use £ currency. This is a UK business.
- Every anomaly must include: what happened, why it matters, estimated £ impact, and a recommended action.

## Anomaly Types
- spike: Sudden increase (>20% above 6-month average)
- drop: Sudden decrease (>20% below 6-month average)
- trend_change: Direction reversal in a previously consistent trend
- unusual_transaction: Single large item that distorts the period
- threshold_breach: KPI crossing a critical threshold (e.g., cash runway below 3 months)

## Output JSON Schema
{
  "anomalies": [
    {
      "id": "string (unique, e.g. anomaly_1)",
      "type": "spike | drop | trend_change | unusual_transaction | threshold_breach",
      "severity": "high | medium | low",
      "metric": "string (e.g. revenue, gross_margin, operating_expenses)",
      "title": "string (1-80 chars) — concise headline",
      "description": "string (1-300 chars) — what happened and why it matters",
      "monetary_impact": number | null,
      "recommendation": "string (1-200 chars) — suggested action",
      "data_points": { "current": number, "average": number, "previous": number }
    }
  ],
  "summary": "string (1-200 chars) — overall health assessment"
}`;

/**
 * Run anomaly detection on the latest sync data.
 * Called after each Xero data sync.
 */
export async function detectAnomalies(
  orgId: string,
  periodEnd: string
): Promise<AnomalyDetectionResult> {
  // Build context from last 7 months (6 for comparison + 1 latest)
  const endDate = new Date(periodEnd);
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - 7);
  const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`;

  let context: FinancialContext;
  try {
    context = await buildFinancialContext(orgId, start, periodEnd);
  } catch {
    return {
      anomalies: [],
      summary: 'Insufficient data for anomaly detection.',
      analysed_at: new Date().toISOString(),
    };
  }

  if (context.periodSummaries.length < 2) {
    return {
      anomalies: [],
      summary: 'Need at least 2 months of data for anomaly detection.',
      analysed_at: new Date().toISOString(),
    };
  }

  const financialSummary = `
Average Monthly Revenue: £${context.avgMonthlyRevenue.toLocaleString()}
Revenue Growth Rate: ${(context.revenueGrowthRate * 100).toFixed(1)}%
Average Gross Margin: ${(context.avgGrossMargin * 100).toFixed(1)}%
Average Net Margin: ${(context.avgNetMargin * 100).toFixed(1)}%

Monthly P&L Summary (latest first):
${context.periodSummaries.map((p) =>
  `${p.period}: Revenue £${p.revenue.toLocaleString()}, COGS £${p.costOfSales.toLocaleString()}, Expenses £${p.expenses.toLocaleString()}, Net £${p.netProfit.toLocaleString()}`
).join('\n')}

Top Revenue Accounts:
${context.topRevenueAccounts.map((a) => `- ${a.name}: £${a.amount.toLocaleString()}`).join('\n') || 'None'}

Top Expense Accounts:
${context.topExpenseAccounts.map((a) => `- ${a.name}: £${a.amount.toLocaleString()}`).join('\n') || 'None'}`;

  const rawResponse = await callLLM({
    systemPrompt: ANOMALY_DETECTION_PROMPT,
    userMessage: `Analyse the following financial data for anomalies:\n\n${financialSummary}`,
    temperature: 0.1,
  });

  // Parse response
  const fenceMatch = rawResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : rawResponse.match(/\{[\s\S]*\}/)?.[0] ?? rawResponse;

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      anomalies: validateAnomalies(parsed.anomalies ?? []),
      summary: String(parsed.summary ?? 'Analysis complete.'),
      analysed_at: new Date().toISOString(),
    };
  } catch {
    return {
      anomalies: [],
      summary: 'Anomaly detection completed but could not parse results.',
      analysed_at: new Date().toISOString(),
    };
  }
}

function validateAnomalies(anomalies: unknown[]): Anomaly[] {
  const validTypes = new Set(['spike', 'drop', 'trend_change', 'unusual_transaction', 'threshold_breach']);
  const validSeverities = new Set(['high', 'medium', 'low']);

  return (anomalies as Anomaly[])
    .filter((a) => a && typeof a === 'object' && validTypes.has(a.type))
    .slice(0, 5)
    .map((a, i) => ({
      id: a.id || `anomaly_${i + 1}`,
      type: validTypes.has(a.type) ? a.type : 'spike',
      severity: validSeverities.has(a.severity) ? a.severity : 'medium',
      metric: String(a.metric || 'unknown'),
      title: String(a.title || 'Anomaly detected'),
      description: String(a.description || ''),
      monetary_impact: typeof a.monetary_impact === 'number' ? a.monetary_impact : null,
      recommendation: String(a.recommendation || ''),
      data_points: (a.data_points && typeof a.data_points === 'object') ? a.data_points : {},
    }));
}
