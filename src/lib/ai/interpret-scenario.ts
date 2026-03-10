import { callLLM } from './llm';
import { buildFinancialContext } from './financial-context';
import type { FinancialContext } from './financial-context';
import { validateProposedChanges, detectConflicts } from './validate-proposal';
import type { ValidationWarning } from './validate-proposal';
import { llmInterpretationSchema } from '@/lib/schemas';
import type { LLMInterpretation } from '@/types';

export type InterpretInput = {
  orgId: string;
  naturalLanguageInput: string;
  basePeriodStart: string;
  basePeriodEnd: string;
  forecastHorizonMonths: number;
  currentAssumptionSetId?: string;
};

export type InterpretResult = {
  interpretation: LLMInterpretation;
  financialContext: FinancialContext;
  needsClarification: boolean;
  warnings: ValidationWarning[];
};

const VALID_ASSUMPTION_KEYS = [
  'revenue_growth_rate',
  'seasonality_factor',
  'variable_cost_rate',
  'fixed_costs',
  'receivables_days',
  'payables_days',
  'capital_expenditure',
];

function buildSystemPrompt(context: FinancialContext): string {
  return `You are a financial modelling assistant for SME advisory. Your role is to interpret natural language scenario requests and translate them into structured assumption changes.

## Rules
- You MUST respond with valid JSON only — no markdown, no explanations outside the JSON.
- Maximum 5 assumption changes per request.
- Include a confidence score (0 to 1) for how well you understood the request.
- If you are unsure, set confidence below 0.7 and include follow-up questions.
- Base period data is binding context — your proposals must be grounded in these actuals.
- You propose changes ONLY. You never apply them.

## Valid Assumption Keys
The scenario engine uses these keys:
${VALID_ASSUMPTION_KEYS.map((k) => `- ${k}`).join('\n')}

## Valid Categories
revenue_drivers, pricing, costs, growth_rates, headcount, marketing, capital, custom

## Valid Types
percentage, currency, integer, boolean, decimal

## Financial Context (Base Period Actuals)
Average Monthly Revenue: $${context.avgMonthlyRevenue.toLocaleString()}
Revenue Growth Rate: ${(context.revenueGrowthRate * 100).toFixed(1)}%
Average Gross Margin: ${(context.avgGrossMargin * 100).toFixed(1)}%
Average Net Margin: ${(context.avgNetMargin * 100).toFixed(1)}%

### Monthly P&L Summary
${context.periodSummaries.map((p) =>
  `${p.period}: Revenue $${p.revenue.toLocaleString()}, COGS $${p.costOfSales.toLocaleString()}, Expenses $${p.expenses.toLocaleString()}, Net $${p.netProfit.toLocaleString()}`
).join('\n')}

### Top Revenue Accounts
${context.topRevenueAccounts.map((a) => `- ${a.name} (${a.code}): $${a.amount.toLocaleString()}`).join('\n') || 'None available'}

### Top Expense Accounts
${context.topExpenseAccounts.map((a) => `- ${a.name} (${a.code}): $${a.amount.toLocaleString()}`).join('\n') || 'None available'}

${context.currentAssumptions.length > 0 ? `### Current Assumptions
${context.currentAssumptions.map((a) => `- ${a.label} (${a.key}): ${a.value}`).join('\n')}` : ''}

## Output JSON Schema
{
  "interpretation_summary": "string (1-2000 chars) — explain what you understood",
  "confidence": number (0 to 1),
  "assumption_changes": [
    {
      "category": "one of the valid categories",
      "key": "one of the valid assumption keys",
      "label": "human-readable label",
      "type": "percentage | currency | integer | boolean | decimal",
      "current_value": number | null,
      "new_value": number,
      "reasoning": "string (1-500 chars) — why this change",
      "effective_from": "YYYY-MM-01"
    }
  ],
  "follow_up_questions": ["string (max 3 questions, max 500 chars each)"]
}`;
}

/**
 * Extract JSON from LLM response, handling markdown code fences.
 */
function extractJSON(text: string): string {
  // Try to extract from markdown code fence
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return text;
}

/**
 * Orchestrate: context building → LLM call → output parsing → validation.
 */
export async function interpretScenarioRequest(
  input: InterpretInput
): Promise<InterpretResult> {
  // Build financial context from Xero actuals
  const financialContext = await buildFinancialContext(
    input.orgId,
    input.basePeriodStart,
    input.basePeriodEnd,
    input.currentAssumptionSetId
  );

  // Build prompt and call LLM
  const systemPrompt = buildSystemPrompt(financialContext);
  const rawResponse = await callLLM({
    systemPrompt,
    userMessage: input.naturalLanguageInput,
  });

  // Parse and validate LLM output
  const jsonStr = extractJSON(rawResponse);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('LLM returned invalid JSON');
  }

  const interpretation = llmInterpretationSchema.parse(parsed);

  // Run boundary validation and conflict detection
  const boundaryWarnings = validateProposedChanges(interpretation.assumption_changes);
  const conflictWarnings = detectConflicts(interpretation.assumption_changes);
  const warnings = [...boundaryWarnings, ...conflictWarnings];

  // Confidence threshold
  const needsClarification = interpretation.confidence < 0.7;

  return {
    interpretation,
    financialContext,
    needsClarification,
    warnings,
  };
}
