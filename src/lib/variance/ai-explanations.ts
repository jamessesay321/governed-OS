import { callLLM } from '@/lib/ai/llm';
import type { VarianceLine } from './engine';

type TransactionSummary = {
  date: string;
  description: string;
  amount_pence: number;
};

const VARIANCE_SYSTEM_PROMPT = `You are a financial controller explaining budget variances to an SME owner. Given a variance line item and the underlying transactions, provide a clear, actionable explanation.

You MUST return valid JSON with exactly these fields:
{
  "explanation": <string, 2-3 sentences explaining WHY this variance occurred, grounded in the transaction data>,
  "action_items": <string[], 1-3 recommended actions the business owner should consider>,
  "risk_level": <"low" | "medium" | "high">
}

Rules:
- Be specific — reference actual transaction amounts and patterns
- Use plain English suitable for a non-accountant
- Focus on the "why" not the "what" — the numbers are already visible
- If the variance is favourable, acknowledge it but note any sustainability concerns
- All monetary references should be in pounds (£), converting from pence
- Return ONLY the JSON object, no markdown formatting`;

export type VarianceExplanation = {
  explanation: string;
  action_items: string[];
  risk_level: 'low' | 'medium' | 'high';
};

/**
 * Use Claude to explain a significant variance, grounded in transaction data.
 * AI is used ONLY for narrative generation — all variance math is deterministic.
 */
export async function explainVariance(
  variance: VarianceLine,
  transactions: TransactionSummary[]
): Promise<VarianceExplanation> {
  const budgetPounds = (variance.budget_pence / 100).toFixed(2);
  const actualPounds = (variance.actual_pence / 100).toFixed(2);
  const variancePounds = (variance.variance_pence / 100).toFixed(2);
  const variancePct = (variance.variance_percentage * 100).toFixed(1);

  const transactionList = transactions
    .slice(0, 20) // Limit to top 20 transactions for context window
    .map(
      (t) =>
        `- ${t.date}: ${t.description} — £${(t.amount_pence / 100).toFixed(2)}`
    )
    .join('\n');

  const userMessage = `Variance to explain:
- Category: ${variance.category}
- Budget: £${budgetPounds}
- Actual: £${actualPounds}
- Variance: £${variancePounds} (${variancePct}%)
- Direction: ${variance.direction}

Underlying transactions (${transactions.length} total, showing top 20):
${transactionList || 'No transactions available for this category.'}

Explain why this variance occurred and what the business owner should do about it.`;

  const response = await callLLM({
    systemPrompt: VARIANCE_SYSTEM_PROMPT,
    userMessage,
    temperature: 0.2,
  });

  // Parse the JSON response
  const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned) as VarianceExplanation;

  // Validate response shape
  if (
    typeof parsed.explanation !== 'string' ||
    !Array.isArray(parsed.action_items) ||
    typeof parsed.risk_level !== 'string'
  ) {
    throw new Error('Invalid variance explanation response from LLM');
  }

  return parsed;
}
