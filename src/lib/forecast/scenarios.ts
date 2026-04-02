import { createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMCached } from '@/lib/ai/cache';
import { governedOutput } from '@/lib/governance/checkpoint';
import {
  generateForecast,
  getLatestForecast,
  type ForecastAssumption,
  type ForecastResult,
} from './engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Scenario {
  id: string;
  orgId: string;
  name: string;
  description: string;
  assumptions: ForecastAssumption[];
  forecast: ForecastResult;
  createdAt: string;
}

export interface ScenarioComparison {
  periods: string[];
  metrics: {
    label: string;
    scenario1: number[];
    scenario2: number[];
    delta: number[];
    deltaPct: number[];
  }[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Parse Natural Language into Assumptions
// ---------------------------------------------------------------------------

const SCENARIO_SYSTEM_PROMPT = `You are a financial analyst assistant. Your job is to translate natural language business scenarios into concrete financial assumptions.

Given a "what if" question, produce a JSON array of assumptions. Each assumption must have:
- category: one of 'revenue_growth', 'cogs_percent', 'opex_growth', 'headcount', 'avg_salary', 'capex', 'debt_repayment', 'depreciation', 'other_income', 'other_expenses', 'collection_days', 'payment_days'
- type: 'percentage' | 'absolute' | 'formula'
- value: a number (percentages as whole numbers, e.g. 5 for 5%)
- label: a human-readable description of this assumption

Examples of common translations:
- "Hire 2 developers at £60K each" -> headcount: 2, avg_salary: 5000 (monthly = 60000/12)
- "Revenue drops 10%" -> revenue_growth: -10
- "Reduce payment terms to 15 days" -> payment_days: 15
- "Buy new equipment for £50K" -> capex: 50000
- "Increase prices by 5%" -> revenue_growth: 5

Reply ONLY with a valid JSON array. No explanation, no markdown fences.`;

export async function parseScenarioFromNaturalLanguage(
  orgId: string,
  query: string,
): Promise<{ assumptions: ForecastAssumption[]; description: string }> {
  const llmResult = await callLLMCached({
    systemPrompt: SCENARIO_SYSTEM_PROMPT,
    userMessage: query,
    orgId,
    temperature: 0.1,
    cacheTTLMinutes: 30,
  });

  // Parse the LLM response as JSON
  let assumptions: ForecastAssumption[];
  try {
    // Strip any markdown fences the LLM might add despite instructions
    const cleaned = llmResult.response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    assumptions = JSON.parse(cleaned);
  } catch {
    console.error('[scenarios] Failed to parse LLM response as JSON:', llmResult.response);
    assumptions = [];
  }

  // Validate each assumption has the required fields
  assumptions = assumptions.filter(
    (a) =>
      a &&
      typeof a.category === 'string' &&
      typeof a.type === 'string' &&
      typeof a.value === 'number' &&
      typeof a.label === 'string',
  );

  // Governance checkpoint — audit trail for scenario parsing
  if (assumptions.length > 0) {
    await governedOutput({
      orgId,
      outputType: 'scenario_interpretation',
      content: JSON.stringify(assumptions),
      modelTier: 'sonnet',
      modelId: 'claude-sonnet-4-20250514',
      dataSources: [
        { type: 'user_query', reference: query.slice(0, 100) },
      ],
      tokensUsed: llmResult.tokensUsed,
      cached: llmResult.cached,
    });
  }

  return {
    assumptions,
    description: query,
  };
}

// ---------------------------------------------------------------------------
// Run Scenario
// ---------------------------------------------------------------------------

export async function runScenario(
  orgId: string,
  name: string,
  assumptions: ForecastAssumption[],
  months: number = 12,
): Promise<Scenario> {
  // Determine start period as next month from now
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startPeriod = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

  // Get the base forecast's assumptions and merge with scenario overrides
  const baseForecast = await getLatestForecast(orgId);
  const baseAssumptions = baseForecast?.assumptions || [];

  // Merge: scenario assumptions override base assumptions by category
  const mergedAssumptions = [...baseAssumptions];
  for (const override of assumptions) {
    const idx = mergedAssumptions.findIndex((a) => a.category === override.category);
    if (idx >= 0) {
      mergedAssumptions[idx] = override;
    } else {
      mergedAssumptions.push(override);
    }
  }

  // Generate the forecast with merged assumptions
  const forecast = await generateForecast({
    orgId,
    startPeriod,
    months,
    assumptions: mergedAssumptions,
  });

  // Save the scenario
  const supabase = await createUntypedServiceClient();

  // Get the forecast_id from the just-saved forecast
  const { data: latestForecast } = await supabase
    .from('forecasts')
    .select('id')
    .eq('org_id', orgId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const forecastId = (latestForecast as Record<string, unknown> | null)?.id as string | undefined;

  const { data: scenarioRow, error } = await supabase
    .from('forecast_scenarios')
    .insert({
      org_id: orgId,
      name,
      description: `Scenario: ${name}`,
      assumptions: assumptions as unknown,
      forecast_id: forecastId || null,
    })
    .select('id, created_at')
    .single();

  if (error) {
    console.error('[scenarios] Error saving scenario:', error.message);
  }

  const row = scenarioRow as Record<string, unknown> | null;

  return {
    id: (row?.id as string) || crypto.randomUUID(),
    orgId,
    name,
    description: `Scenario: ${name}`,
    assumptions,
    forecast,
    createdAt: (row?.created_at as string) || new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Compare Scenarios
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function compareScenarios(
  scenario1: Scenario,
  scenario2: Scenario,
): ScenarioComparison {
  const f1 = scenario1.forecast;
  const f2 = scenario2.forecast;

  // Use the shorter period set for comparison
  const maxPeriods = Math.min(f1.periods.length, f2.periods.length);
  const periods = f1.periods.slice(0, maxPeriods);

  function buildMetric(label: string, arr1: number[], arr2: number[]) {
    const s1 = arr1.slice(0, maxPeriods);
    const s2 = arr2.slice(0, maxPeriods);
    const delta = s1.map((v, i) => round2(s2[i] - v));
    const deltaPct = s1.map((v, i) =>
      v !== 0 ? round2(((s2[i] - v) / Math.abs(v)) * 100) : 0,
    );
    return { label, scenario1: s1, scenario2: s2, delta, deltaPct };
  }

  const metrics = [
    buildMetric('Revenue', f1.pnl.revenue, f2.pnl.revenue),
    buildMetric('Gross Profit', f1.pnl.grossProfit, f2.pnl.grossProfit),
    buildMetric('Operating Expenses', f1.pnl.operatingExpenses, f2.pnl.operatingExpenses),
    buildMetric('Net Profit', f1.pnl.netProfit, f2.pnl.netProfit),
    buildMetric('Cash', f1.balanceSheet.cash, f2.balanceSheet.cash),
    buildMetric('Operating Cash Flow', f1.cashFlow.operatingCashFlow, f2.cashFlow.operatingCashFlow),
  ];

  // Generate a text summary
  const lastIdx = maxPeriods - 1;
  const revDelta = metrics[0].delta[lastIdx];
  const profitDelta = metrics[3].delta[lastIdx];
  const cashDelta = metrics[4].delta[lastIdx];

  const summary = [
    `By ${periods[lastIdx]}: `,
    `Revenue ${revDelta >= 0 ? '+' : ''}${revDelta.toLocaleString()}`,
    `, Net Profit ${profitDelta >= 0 ? '+' : ''}${profitDelta.toLocaleString()}`,
    `, Cash ${cashDelta >= 0 ? '+' : ''}${cashDelta.toLocaleString()}`,
    ` (${scenario2.name} vs ${scenario1.name}).`,
  ].join('');

  return { periods, metrics, summary };
}
