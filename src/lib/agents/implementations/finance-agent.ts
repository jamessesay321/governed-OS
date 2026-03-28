import { createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMCached } from '@/lib/ai/cache';
import { BaseAgent, type AgentStep, type SourceCitation } from '../runtime';
import { recall, remember, recallAll, reinforceMemory } from '../memory';
import { shouldAutoApprove, shouldEscalate } from '../trust';
import { logAgentAction } from '../audit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawTransaction {
  id: string;
  source_id: string;
  date: string;
  amount: number;
  contact_name?: string;
  description?: string;
  account_code?: string;
  [key: string]: unknown;
}

interface CategorisedTransaction {
  transactionId: string;
  contactName: string;
  description: string;
  amount: number;
  suggestedCategory: string;
  suggestedSubcategory: string;
  confidence: number;
  source: 'memory' | 'blueprint' | 'llm';
  citation: SourceCitation;
}

interface AccountMapping {
  source_pattern: string;
  target_category: string;
  target_subcategory: string;
}

// ---------------------------------------------------------------------------
// Finance Agent
// ---------------------------------------------------------------------------

export class FinanceAgent extends BaseAgent {
  id = 'agent-finance';
  name = 'Finance Agent';

  /**
   * Step 1: Gather uncategorised transactions, chart of accounts, and agent memory.
   */
  async gatherInput(orgId: string, context: Record<string, unknown>): Promise<AgentStep> {
    const startedAt = new Date().toISOString();

    try {
      const supabase = await createUntypedServiceClient();

      // Fetch uncategorised transactions
      const { data: transactions, error: txError } = await supabase
        .from('raw_transactions')
        .select('*')
        .eq('org_id', orgId)
        .neq('status', 'categorised')
        .order('date', { ascending: false })
        .limit(200);

      if (txError) throw new Error(`Failed to fetch transactions: ${txError.message}`);

      // Fetch chart of accounts
      const { data: accounts, error: accError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('org_id', orgId);

      if (accError) throw new Error(`Failed to fetch accounts: ${accError.message}`);

      // Load agent memory for transaction categorisation
      const memories = await recallAll(orgId, this.id, 'transaction_category:');

      // Load blueprint mappings (if any)
      const { data: blueprint } = await supabase
        .from('industry_blueprints')
        .select('account_mappings')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      return {
        type: 'input',
        name: 'Gather uncategorised transactions',
        status: 'completed',
        startedAt,
        input: context,
        output: {
          transactionCount: transactions?.length ?? 0,
          transactions: transactions ?? [],
          accounts: accounts ?? [],
          memories: memories ?? [],
          blueprintMappings: (blueprint?.account_mappings as AccountMapping[]) ?? [],
        },
        confidence: 1.0,
      };
    } catch (error) {
      return {
        type: 'input',
        name: 'Gather uncategorised transactions',
        status: 'failed',
        startedAt,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Step 2: Categorise each transaction using memory, blueprint, or LLM.
   */
  async process(input: AgentStep): Promise<AgentStep> {
    const startedAt = new Date().toISOString();

    try {
      const transactions = (input.output?.transactions ?? []) as RawTransaction[];
      const memories = (input.output?.memories ?? []) as Array<{ key: string; value: string; confidence: number }>;
      const blueprintMappings = (input.output?.blueprintMappings ?? []) as AccountMapping[];
      const accounts = (input.output?.accounts ?? []) as Array<{ code: string; name: string; category?: string }>;
      const orgId = (input.input?.orgId as string) ?? '';

      const categorised: CategorisedTransaction[] = [];

      for (const tx of transactions) {
        const contactKey = `transaction_category:${(tx.contact_name ?? '').toUpperCase().replace(/\s+/g, '_')}`;
        const descKey = `transaction_category:${(tx.description ?? '').toUpperCase().replace(/\s+/g, '_').slice(0, 80)}`;

        // 1. Check agent memory (contact name match)
        const memoryMatch = memories.find(m => m.key === contactKey || m.key === descKey);
        if (memoryMatch) {
          categorised.push({
            transactionId: tx.id,
            contactName: tx.contact_name ?? '',
            description: tx.description ?? '',
            amount: tx.amount,
            suggestedCategory: memoryMatch.value,
            suggestedSubcategory: '',
            confidence: memoryMatch.confidence,
            source: 'memory',
            citation: {
              source: 'agent_memory',
              reference: memoryMatch.key,
              field: 'category',
              value: memoryMatch.value,
            },
          });
          continue;
        }

        // 2. Check blueprint mappings
        const blueprintMatch = blueprintMappings.find(m =>
          (tx.contact_name ?? '').toLowerCase().includes(m.source_pattern.toLowerCase()) ||
          (tx.description ?? '').toLowerCase().includes(m.source_pattern.toLowerCase())
        );
        if (blueprintMatch) {
          categorised.push({
            transactionId: tx.id,
            contactName: tx.contact_name ?? '',
            description: tx.description ?? '',
            amount: tx.amount,
            suggestedCategory: blueprintMatch.target_category,
            suggestedSubcategory: blueprintMatch.target_subcategory,
            confidence: 0.75,
            source: 'blueprint',
            citation: {
              source: 'industry_blueprint',
              reference: `Pattern: ${blueprintMatch.source_pattern}`,
              field: 'category',
              value: blueprintMatch.target_category,
            },
          });
          continue;
        }

        // 3. Use LLM to suggest category
        const accountList = accounts.map(a => `${a.code}: ${a.name} (${a.category ?? 'uncategorised'})`).join('\n');

        const { response } = await callLLMCached({
          systemPrompt: `You are a financial categorisation assistant. Given a transaction, suggest the most appropriate account category from the chart of accounts provided. Respond with ONLY a JSON object: { "category": "...", "subcategory": "...", "confidence": 0.0-1.0, "reasoning": "..." }`,
          userMessage: `Transaction:\n- Contact: ${tx.contact_name ?? 'Unknown'}\n- Description: ${tx.description ?? 'N/A'}\n- Amount: ${tx.amount}\n- Date: ${tx.date}\n\nChart of Accounts:\n${accountList}`,
          orgId,
          temperature: 0.1,
          cacheTTLMinutes: 120,
        });

        let category = 'Uncategorised';
        let subcategory = '';
        let llmConfidence = 0.5;

        try {
          const parsed = JSON.parse(response);
          category = parsed.category ?? 'Uncategorised';
          subcategory = parsed.subcategory ?? '';
          llmConfidence = Math.min(1.0, Math.max(0, parsed.confidence ?? 0.5));
        } catch {
          // LLM response wasn't valid JSON — use raw text as category
          category = response.trim().slice(0, 100);
          llmConfidence = 0.3;
        }

        categorised.push({
          transactionId: tx.id,
          contactName: tx.contact_name ?? '',
          description: tx.description ?? '',
          amount: tx.amount,
          suggestedCategory: category,
          suggestedSubcategory: subcategory,
          confidence: llmConfidence,
          source: 'llm',
          citation: {
            source: 'llm',
            reference: `AI categorisation for ${tx.contact_name ?? tx.description ?? tx.id}`,
            field: 'category',
            value: category,
          },
        });
      }

      const avgConfidence = categorised.length > 0
        ? categorised.reduce((sum, c) => sum + c.confidence, 0) / categorised.length
        : 0;

      return {
        type: 'process',
        name: 'Categorise transactions',
        status: 'completed',
        startedAt,
        output: {
          categorised,
          totalCategorised: categorised.length,
          byMemory: categorised.filter(c => c.source === 'memory').length,
          byBlueprint: categorised.filter(c => c.source === 'blueprint').length,
          byLLM: categorised.filter(c => c.source === 'llm').length,
        },
        confidence: avgConfidence,
        sourceCitations: categorised.map(c => c.citation),
      };
    } catch (error) {
      return {
        type: 'process',
        name: 'Categorise transactions',
        status: 'failed',
        startedAt,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Step 3: Apply business logic — check thresholds, detect anomalies, flag items.
   */
  async applyLogic(processed: AgentStep): Promise<AgentStep> {
    const startedAt = new Date().toISOString();

    try {
      const categorised = (processed.output?.categorised ?? []) as CategorisedTransaction[];
      const orgId = (processed.input?.orgId as string) ?? '';

      const autoApproved: CategorisedTransaction[] = [];
      const flagged: CategorisedTransaction[] = [];
      const anomalies: Array<CategorisedTransaction & { anomalyReason: string }> = [];

      // Build historical averages per category for anomaly detection
      const categoryAmounts: Record<string, number[]> = {};
      for (const tx of categorised) {
        const key = tx.suggestedCategory;
        if (!categoryAmounts[key]) categoryAmounts[key] = [];
        categoryAmounts[key].push(Math.abs(tx.amount));
      }

      for (const tx of categorised) {
        // Check trust-level thresholds
        const canAutoApprove = await shouldAutoApprove(orgId, 'agent-finance', tx.confidence);
        const needsEscalation = await shouldEscalate(orgId, 'agent-finance', tx.confidence);

        // Anomaly detection: is this amount significantly different from historical average?
        const amounts = categoryAmounts[tx.suggestedCategory] ?? [];
        const avg = amounts.length > 1
          ? amounts.reduce((s, a) => s + a, 0) / amounts.length
          : 0;
        const isAnomaly = avg > 0 && Math.abs(Math.abs(tx.amount) - avg) > avg * 2;

        if (isAnomaly) {
          anomalies.push({
            ...tx,
            anomalyReason: `Amount ${tx.amount} is significantly different from average ${avg.toFixed(2)} for category "${tx.suggestedCategory}"`,
          });
          flagged.push(tx);
        } else if (canAutoApprove && !needsEscalation) {
          autoApproved.push(tx);
        } else {
          flagged.push(tx);
        }
      }

      return {
        type: 'logic',
        name: 'Apply business rules and anomaly detection',
        status: 'completed',
        startedAt,
        output: {
          autoApproved,
          flagged,
          anomalies,
          autoApprovedCount: autoApproved.length,
          flaggedCount: flagged.length,
          anomalyCount: anomalies.length,
        },
        confidence: categorised.length > 0
          ? (autoApproved.length / categorised.length)
          : 0,
      };
    } catch (error) {
      return {
        type: 'logic',
        name: 'Apply business rules and anomaly detection',
        status: 'failed',
        startedAt,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Step 4: Generate output — summary, update memory, log audit actions.
   */
  async generateOutput(logic: AgentStep): Promise<AgentStep> {
    const startedAt = new Date().toISOString();

    try {
      const autoApproved = (logic.output?.autoApproved ?? []) as CategorisedTransaction[];
      const flagged = (logic.output?.flagged ?? []) as CategorisedTransaction[];
      const anomalies = (logic.output?.anomalies ?? []) as Array<CategorisedTransaction & { anomalyReason: string }>;
      const orgId = (logic.input?.orgId as string) ?? '';
      const runId = crypto.randomUUID();

      // Update agent memory for auto-approved categorisations
      for (const tx of autoApproved) {
        if (tx.contactName) {
          const key = `transaction_category:${tx.contactName.toUpperCase().replace(/\s+/g, '_')}`;
          const existing = await recall(orgId, this.id, key);
          if (existing) {
            await reinforceMemory(orgId, this.id, key);
          } else {
            await remember(orgId, this.id, key, tx.suggestedCategory, 'learned');
          }
        }

        // Log audit entry
        await logAgentAction({
          orgId,
          agentId: this.id,
          runId,
          action: 'categorise_transaction',
          detail: `Categorised "${tx.contactName || tx.description}" as "${tx.suggestedCategory}" (${tx.source})`,
          sourceCitations: [tx.citation],
          confidence: tx.confidence,
          decision: 'auto_approved',
        });
      }

      // Log flagged items
      for (const tx of flagged) {
        const isAnomaly = anomalies.some(a => a.transactionId === tx.transactionId);
        await logAgentAction({
          orgId,
          agentId: this.id,
          runId,
          action: isAnomaly ? 'flag_anomaly' : 'categorise_transaction',
          detail: isAnomaly
            ? `Anomaly detected: "${tx.contactName || tx.description}" amount ${tx.amount}`
            : `Flagged "${tx.contactName || tx.description}" for review (confidence: ${tx.confidence.toFixed(2)})`,
          sourceCitations: [tx.citation],
          confidence: tx.confidence,
          decision: isAnomaly ? 'escalated' : 'flagged',
        });
      }

      const total = autoApproved.length + flagged.length;
      const summary = [
        `Processed ${total} transaction${total !== 1 ? 's' : ''}.`,
        autoApproved.length > 0 ? `${autoApproved.length} auto-approved.` : null,
        flagged.length > 0 ? `${flagged.length} flagged for review.` : null,
        anomalies.length > 0 ? `${anomalies.length} anomal${anomalies.length !== 1 ? 'ies' : 'y'} detected.` : null,
      ].filter(Boolean).join(' ');

      return {
        type: 'output',
        name: 'Generate summary and update memory',
        status: 'completed',
        startedAt,
        output: {
          summary,
          itemsProcessed: total,
          itemsFlagged: flagged.length,
          itemsAutoApproved: autoApproved.length,
          anomalyCount: anomalies.length,
        },
        confidence: total > 0 ? autoApproved.length / total : 0,
        sourceCitations: [
          ...autoApproved.map(t => t.citation),
          ...flagged.map(t => t.citation),
        ],
      };
    } catch (error) {
      return {
        type: 'output',
        name: 'Generate summary and update memory',
        status: 'failed',
        startedAt,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
