import { createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMCached } from '@/lib/ai/cache';
import { BaseAgent, type AgentStep, type SourceCitation } from '../runtime';
import { logAgentAction } from '../audit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  category?: string;
  [key: string]: unknown;
}

interface ProposedMapping {
  accountCode: string;
  accountName: string;
  managementCategory: string;
  managementSubcategory: string;
  confidence: number;
  source: 'blueprint' | 'llm';
  citation: SourceCitation;
}

interface SuggestedKPI {
  key: string;
  label: string;
  formula: string;
  priority: 'high' | 'medium' | 'low';
  source: 'blueprint' | 'llm';
}

interface AccountMapping {
  source_pattern: string;
  target_category: string;
  target_subcategory: string;
}

interface BlueprintKPI {
  key: string;
  label: string;
  priority: 'high' | 'medium' | 'low';
  suggested_target?: number;
}

// ---------------------------------------------------------------------------
// Setup Agent — always runs at 'guided' trust level (everything reviewed)
// ---------------------------------------------------------------------------

export class SetupAgent extends BaseAgent {
  id = 'agent-setup';
  name = 'AI Setup Assistant';

  /**
   * Step 1: Gather chart of accounts, org profile, interview data, and blueprint.
   */
  async gatherInput(orgId: string, context: Record<string, unknown>): Promise<AgentStep> {
    const startedAt = new Date().toISOString();

    try {
      const supabase = await createUntypedServiceClient();

      // Fetch chart of accounts
      const { data: accounts, error: accError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('org_id', orgId);

      if (accError) throw new Error(`Failed to fetch accounts: ${accError.message}`);

      // Fetch org profile
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle();

      if (orgError) throw new Error(`Failed to fetch organisation: ${orgError.message}`);

      // Fetch interview data (if any)
      const { data: interview } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Find matching industry blueprint
      const industry = (org?.industry as string) ?? (interview?.industry as string) ?? '';
      const { data: blueprint } = await supabase
        .from('industry_blueprints')
        .select('*')
        .eq('is_active', true)
        .ilike('industry', `%${industry}%`)
        .limit(1)
        .maybeSingle();

      return {
        type: 'input',
        name: 'Gather organisation data and blueprint',
        status: 'completed',
        startedAt,
        input: { ...context, orgId },
        output: {
          accountCount: accounts?.length ?? 0,
          accounts: accounts ?? [],
          org: org ?? {},
          interview: interview ?? null,
          industry,
          blueprint: blueprint ?? null,
          hasBlueprintMatch: !!blueprint,
        },
        confidence: 1.0,
      };
    } catch (error) {
      return {
        type: 'input',
        name: 'Gather organisation data and blueprint',
        status: 'failed',
        startedAt,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Step 2: Map each account to a management account category using blueprint + LLM.
   */
  async process(input: AgentStep): Promise<AgentStep> {
    const startedAt = new Date().toISOString();

    try {
      const accounts = (input.output?.accounts ?? []) as Account[];
      const blueprint = input.output?.blueprint as Record<string, unknown> | null;
      const orgId = (input.input?.orgId as string) ?? '';
      const blueprintMappings = (blueprint?.account_mappings ?? []) as AccountMapping[];

      const mappings: ProposedMapping[] = [];
      const unmapped: Account[] = [];

      for (const account of accounts) {
        // Try blueprint mapping first
        const bpMatch = blueprintMappings.find(m =>
          account.name.toLowerCase().includes(m.source_pattern.toLowerCase()) ||
          account.code.includes(m.source_pattern)
        );

        if (bpMatch) {
          mappings.push({
            accountCode: account.code,
            accountName: account.name,
            managementCategory: bpMatch.target_category,
            managementSubcategory: bpMatch.target_subcategory,
            confidence: 0.85,
            source: 'blueprint',
            citation: {
              source: 'industry_blueprint',
              reference: `Blueprint pattern: ${bpMatch.source_pattern}`,
              field: 'management_category',
              value: bpMatch.target_category,
            },
          });
          continue;
        }

        // Fall back to LLM
        const { response } = await callLLMCached({
          systemPrompt: `You are a management accountant. Map the given account to a management account category. Categories: Revenue, Cost of Sales, Gross Profit, Operating Expenses, Other Income, Other Expenses, Assets, Liabilities, Equity. Respond with ONLY a JSON object: { "category": "...", "subcategory": "...", "confidence": 0.0-1.0 }`,
          userMessage: `Account Code: ${account.code}\nAccount Name: ${account.name}\nAccount Type: ${account.type}`,
          orgId,
          temperature: 0.1,
          cacheTTLMinutes: 1440,
        });

        try {
          const parsed = JSON.parse(response);
          mappings.push({
            accountCode: account.code,
            accountName: account.name,
            managementCategory: parsed.category ?? 'Uncategorised',
            managementSubcategory: parsed.subcategory ?? '',
            confidence: Math.min(1.0, Math.max(0, parsed.confidence ?? 0.5)),
            source: 'llm',
            citation: {
              source: 'llm',
              reference: `AI mapping for ${account.code}: ${account.name}`,
              field: 'management_category',
              value: parsed.category ?? 'Uncategorised',
            },
          });
        } catch {
          unmapped.push(account);
        }
      }

      return {
        type: 'process',
        name: 'Map accounts to management categories',
        status: 'completed',
        startedAt,
        input: { orgId },
        output: {
          mappings,
          unmapped,
          mappedCount: mappings.length,
          unmappedCount: unmapped.length,
          blueprint,
        },
        confidence: accounts.length > 0
          ? mappings.length / accounts.length
          : 0,
        sourceCitations: mappings.map(m => m.citation),
      };
    } catch (error) {
      return {
        type: 'process',
        name: 'Map accounts to management categories',
        status: 'failed',
        startedAt,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Step 3: Identify gaps, suggest KPIs based on the account structure.
   */
  async applyLogic(processed: AgentStep): Promise<AgentStep> {
    const startedAt = new Date().toISOString();

    try {
      const mappings = (processed.output?.mappings ?? []) as ProposedMapping[];
      const unmapped = (processed.output?.unmapped ?? []) as Account[];
      const blueprint = processed.output?.blueprint as Record<string, unknown> | null;
      const orgId = (processed.input?.orgId as string) ?? '';

      // Identify gaps: categories with no accounts mapped to them
      const expectedCategories = ['Revenue', 'Cost of Sales', 'Operating Expenses', 'Assets', 'Liabilities', 'Equity'];
      const mappedCategories = new Set(mappings.map(m => m.managementCategory));
      const missingCategories = expectedCategories.filter(c => !mappedCategories.has(c));

      // Suggest KPIs from blueprint first
      const blueprintKPIs = (blueprint?.kpi_definitions ?? []) as BlueprintKPI[];
      const suggestedKPIs: SuggestedKPI[] = blueprintKPIs.map(kpi => ({
        key: kpi.key,
        label: kpi.label,
        formula: '',
        priority: kpi.priority,
        source: 'blueprint' as const,
      }));

      // If no blueprint KPIs, suggest standard ones based on mapped categories
      if (suggestedKPIs.length === 0) {
        const hasRevenue = mappedCategories.has('Revenue');
        const hasCostOfSales = mappedCategories.has('Cost of Sales');
        const hasOpex = mappedCategories.has('Operating Expenses');

        if (hasRevenue) {
          suggestedKPIs.push({ key: 'revenue_growth', label: 'Revenue Growth %', formula: '(current_revenue - prior_revenue) / prior_revenue * 100', priority: 'high', source: 'llm' });
        }
        if (hasRevenue && hasCostOfSales) {
          suggestedKPIs.push({ key: 'gross_margin', label: 'Gross Margin %', formula: '(revenue - cost_of_sales) / revenue * 100', priority: 'high', source: 'llm' });
        }
        if (hasRevenue && hasOpex) {
          suggestedKPIs.push({ key: 'operating_margin', label: 'Operating Margin %', formula: '(revenue - cost_of_sales - opex) / revenue * 100', priority: 'high', source: 'llm' });
          suggestedKPIs.push({ key: 'opex_ratio', label: 'Opex to Revenue Ratio', formula: 'opex / revenue * 100', priority: 'medium', source: 'llm' });
        }
        suggestedKPIs.push({ key: 'cash_runway', label: 'Cash Runway (months)', formula: 'cash_balance / monthly_burn', priority: 'high', source: 'llm' });
      }

      // Determine recommended dashboard template
      let dashboardTemplate = 'standard';
      if (mappedCategories.has('Cost of Sales') && mappedCategories.has('Revenue')) {
        dashboardTemplate = 'product_business';
      }
      if (!mappedCategories.has('Cost of Sales')) {
        dashboardTemplate = 'services_business';
      }

      // Log analysis action
      await logAgentAction({
        orgId,
        agentId: this.id,
        runId: crypto.randomUUID(),
        action: 'analyse_account_structure',
        detail: `Analysed ${mappings.length} mapped accounts, ${unmapped.length} unmapped, ${missingCategories.length} missing categories`,
        sourceCitations: [],
        confidence: processed.confidence ?? 0,
        decision: 'flagged', // setup agent always flags for review
      });

      return {
        type: 'logic',
        name: 'Identify gaps and suggest KPIs',
        status: 'completed',
        startedAt,
        input: { orgId },
        output: {
          mappings,
          unmapped,
          missingCategories,
          suggestedKPIs,
          dashboardTemplate,
          gapCount: missingCategories.length + unmapped.length,
        },
        confidence: missingCategories.length === 0 && unmapped.length === 0 ? 0.9 : 0.6,
      };
    } catch (error) {
      return {
        type: 'logic',
        name: 'Identify gaps and suggest KPIs',
        status: 'failed',
        startedAt,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Step 4: Return the proposed setup — everything flagged for user review.
   */
  async generateOutput(logic: AgentStep): Promise<AgentStep> {
    const startedAt = new Date().toISOString();

    try {
      const mappings = (logic.output?.mappings ?? []) as ProposedMapping[];
      const unmapped = (logic.output?.unmapped ?? []) as Account[];
      const missingCategories = (logic.output?.missingCategories ?? []) as string[];
      const suggestedKPIs = (logic.output?.suggestedKPIs ?? []) as SuggestedKPI[];
      const dashboardTemplate = (logic.output?.dashboardTemplate as string) ?? 'standard';

      const parts: string[] = [
        `Proposed ${mappings.length} account mappings.`,
      ];

      if (unmapped.length > 0) {
        parts.push(`${unmapped.length} account${unmapped.length !== 1 ? 's' : ''} could not be mapped and need${unmapped.length === 1 ? 's' : ''} manual review.`);
      }

      if (missingCategories.length > 0) {
        parts.push(`Missing categories: ${missingCategories.join(', ')}.`);
      }

      parts.push(`Suggested ${suggestedKPIs.length} KPIs.`);
      parts.push(`Recommended dashboard template: ${dashboardTemplate}.`);
      parts.push('All proposals flagged for user review.');

      return {
        type: 'output',
        name: 'Generate setup proposal',
        status: 'completed',
        startedAt,
        output: {
          summary: parts.join(' '),
          proposedMappings: mappings,
          unmappedAccounts: unmapped,
          missingCategories,
          suggestedKPIs,
          dashboardTemplate,
          itemsProcessed: mappings.length,
          itemsFlagged: mappings.length + unmapped.length, // everything flagged — setup is always guided
        },
        confidence: logic.confidence ?? 0.6,
        sourceCitations: mappings.map(m => m.citation),
      };
    } catch (error) {
      return {
        type: 'output',
        name: 'Generate setup proposal',
        status: 'failed',
        startedAt,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
