import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMWithUsage } from '@/lib/ai/llm';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { hasBudgetRemaining } from '@/lib/ai/token-budget';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { getSkillAsSystemPrompt } from '@/lib/skills/company-skill';
import { logAudit } from '@/lib/audit/log';
import { calculateKPIs } from '@/lib/kpi/engine';
import { z } from 'zod';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';

export const maxDuration = 30;

const querySchema = z.object({
  refresh: z.enum(['true', 'false']).optional(),
});

/**
 * Key Actions briefing response schema (4 sections).
 * Each insight includes a source_ref for deep linking.
 */
const insightSchema = z.object({
  text: z.string(),
  source_ref: z.object({
    page: z.string(),
    params: z.record(z.string(), z.string()).optional(),
  }),
});

const sectionSchema = z.object({
  title: z.string(),
  insights: z.array(insightSchema),
  trend: z.enum(['up', 'down', 'stable']).optional(),
  highlight_value: z.string().optional(),
});

const briefingResponseSchema = z.object({
  revenue: sectionSchema,
  cash: sectionSchema,
  costs: sectionSchema,
  risk: sectionSchema,
});

type KeyActionsBriefing = z.infer<typeof briefingResponseSchema>;

/**
 * GET /api/briefing/key-actions/[orgId]
 *
 * Generates a structured 4-section Key Actions briefing:
 * Revenue, Cash, Costs, Risk.
 *
 * Checks daily_briefing_cache first; regenerates if stale/missing.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const parsedQuery = querySchema.safeParse({
      refresh: url.searchParams.get('refresh') || undefined,
    });
    const forceRefresh = parsedQuery.success && parsedQuery.data.refresh === 'true';

    const supabase = await createServiceClient();
    const untypedDb = await createUntypedServiceClient();
    const today = new Date().toISOString().split('T')[0];

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      try {
        const { data: cached } = await untypedDb
          .from('daily_briefing_cache')
          .select('*')
          .eq('org_id', orgId)
          .eq('briefing_date', today)
          .single();

        if (cached && new Date(cached.expires_at as string) > new Date()) {
          return NextResponse.json({
            ...((cached.content as Record<string, unknown>) ?? {}),
            generatedAt: cached.generated_at,
            cached: true,
          });
        }
      } catch {
        // Cache table may not exist yet or no row — continue to generate
      }
    }

    // Rate limit
    const rateCheck = checkRateLimit(orgId, 'key_actions_briefing');
    if (!rateCheck.allowed) {
      const headers = getRateLimitHeaders(rateCheck);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers }
      );
    }

    const hasBudget = await hasBudgetRemaining(orgId);
    if (!hasBudget) {
      return NextResponse.json(
        { error: 'Monthly AI token budget exhausted.' },
        { status: 402 }
      );
    }

    // Fetch data in parallel
    const [
      financialsResult,
      accountsResult,
      anomaliesResult,
      challengesResult,
      companySystemPrompt,
      orgResult,
    ] = await Promise.all([
      supabase.from('normalised_financials').select('*').eq('org_id', orgId),
      supabase.from('chart_of_accounts').select('*').eq('org_id', orgId),
      untypedDb
        .from('detected_anomalies')
        .select('title, severity, description')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10),
      untypedDb
        .from('number_challenges')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10),
      getSkillAsSystemPrompt(orgId),
      untypedDb
        .from('organisations')
        .select('company_number, year_end_date, last_confirmation_statement_date')
        .eq('id', orgId)
        .single(),
    ]);

    const fins = (financialsResult.data ?? []) as NormalisedFinancial[];
    const accs = (accountsResult.data ?? []) as ChartOfAccount[];
    const anomalies = (anomaliesResult.data ?? []) as Record<string, unknown>[];
    const challenges = (challengesResult.data ?? []) as Record<string, unknown>[];
    const orgInfo = (orgResult.data ?? {}) as Record<string, unknown>;

    // ── Filing deadline context (best-effort) ──────────────────────
    let filingDeadlineContext = '';
    try {
      const yearEndStr = orgInfo.year_end_date as string | undefined;
      const confirmStr = orgInfo.last_confirmation_statement_date as string | undefined;
      const companyNumber = orgInfo.company_number as string | undefined;

      if (yearEndStr && confirmStr) {
        const { calculateFilingDeadlines } = await import('@/lib/compliance/uk-company-classification');
        const deadlines = calculateFilingDeadlines({
          yearEndDate: new Date(yearEndStr),
          lastConfirmationStatementDate: new Date(confirmStr),
        });

        const overdueItems: string[] = [];
        const upcomingItems: string[] = [];

        if (deadlines.isOverdue.accounts) overdueItems.push(`Annual accounts OVERDUE (was due ${deadlines.accountsDeadline.toLocaleDateString('en-GB')})`);
        else if (deadlines.daysUntil.accounts <= 90) upcomingItems.push(`Annual accounts due in ${deadlines.daysUntil.accounts} days (${deadlines.accountsDeadline.toLocaleDateString('en-GB')})`);

        if (deadlines.isOverdue.confirmationStatement) overdueItems.push(`Confirmation statement OVERDUE (was due ${deadlines.confirmationStatementDeadline.toLocaleDateString('en-GB')})`);
        else if (deadlines.daysUntil.confirmationStatement <= 90) upcomingItems.push(`Confirmation statement due in ${deadlines.daysUntil.confirmationStatement} days`);

        if (deadlines.isOverdue.corporationTaxReturn) overdueItems.push(`Corporation tax return OVERDUE`);
        else if (deadlines.daysUntil.corporationTaxReturn <= 90) upcomingItems.push(`CT return due in ${deadlines.daysUntil.corporationTaxReturn} days`);

        if (deadlines.isOverdue.corporationTaxPayment) overdueItems.push(`Corporation tax payment OVERDUE`);
        else if (deadlines.daysUntil.corporationTaxPayment <= 90) upcomingItems.push(`CT payment due in ${deadlines.daysUntil.corporationTaxPayment} days`);

        if (overdueItems.length > 0 || upcomingItems.length > 0) {
          filingDeadlineContext = `\nCompanies House Filing Deadlines${companyNumber ? ` (Company #${companyNumber})` : ''}:\n`;
          if (overdueItems.length > 0) filingDeadlineContext += `OVERDUE: ${overdueItems.join('; ')}\n`;
          if (upcomingItems.length > 0) filingDeadlineContext += `Upcoming: ${upcomingItems.join('; ')}\n`;
        }
      }
    } catch {
      // Filing deadline data may not be available — non-critical
    }

    const periods = getAvailablePeriods(fins);
    if (periods.length === 0) {
      return NextResponse.json({
        revenue: { title: 'Revenue', insights: [{ text: 'Connect your accounting data to see revenue insights.', source_ref: { page: '/integrations' } }] },
        cash: { title: 'Cash', insights: [{ text: 'No cash flow data available yet.', source_ref: { page: '/financials/cash-flow' } }] },
        costs: { title: 'Costs', insights: [{ text: 'Connect Xero to track expenses.', source_ref: { page: '/integrations' } }] },
        risk: { title: 'Risk', insights: [{ text: 'No risk data available.', source_ref: { page: '/intelligence' } }] },
        generatedAt: new Date().toISOString(),
        cached: false,
      });
    }

    const latestPeriod = periods[0];
    const previousPeriod = periods.length > 1 ? periods[1] : null;

    const currentPnL = buildPnL(fins, accs, latestPeriod);
    const previousPnL = previousPeriod ? buildPnL(fins, accs, previousPeriod) : null;

    // KPIs (best-effort)
    let kpiData: { key: string; label: string; formatted_value: string; benchmark_status: string }[] = [];
    try {
      const kpis = await calculateKPIs(orgId, latestPeriod + '-01', 'universal');
      kpiData = kpis.map((k) => ({
        key: k.key,
        label: k.label,
        formatted_value: k.formatted_value,
        benchmark_status: k.benchmark_status,
      }));
    } catch {
      // Optional
    }

    const systemPrompt = `${companySystemPrompt}

## Key Actions Briefing Task
Generate a structured 4-section Key Actions briefing for a UK SME business owner.
Use GBP currency formatting. Be concise, data-driven, and actionable.

You MUST respond with ONLY valid JSON matching this exact schema:
{
  "revenue": {
    "title": "Revenue",
    "insights": [
      {
        "text": "Insight text with specific numbers",
        "source_ref": { "page": "/financials/income-statement", "params": { "metric": "revenue" } }
      }
    ],
    "trend": "up|down|stable",
    "highlight_value": "e.g. £120,000"
  },
  "cash": {
    "title": "Cash",
    "insights": [...],
    "trend": "up|down|stable",
    "highlight_value": "..."
  },
  "costs": {
    "title": "Costs",
    "insights": [...],
    "trend": "up|down|stable",
    "highlight_value": "..."
  },
  "risk": {
    "title": "Risk",
    "insights": [...],
    "highlight_value": "e.g. 3 items"
  }
}

Rules:
- Each section must have 2-4 insights
- Every insight must include a source_ref with a valid page path
- Valid pages: /financials/income-statement, /financials/cash-flow, /financials/balance-sheet, /variance, /intelligence/anomalies, /intelligence, /kpi, /dashboard/alerts, /playbook
- Reference specific GBP amounts and percentages from the data
- highlight_value should be the most important number for that section
- trend should reflect the direction vs previous period (if available)
- For risk section, combine anomalies, challenges, at-risk KPIs, and Companies House filing deadlines (if provided). Flag any OVERDUE filings as critical alerts with source_ref to /settings`;

    const userMessage = `Current period: ${latestPeriod}
P&L Summary:
- Revenue: ${currentPnL.revenue}
- Cost of Sales: ${currentPnL.costOfSales}
- Gross Profit: ${currentPnL.grossProfit} (Margin: ${currentPnL.revenue > 0 ? ((currentPnL.grossProfit / currentPnL.revenue) * 100).toFixed(1) : 0}%)
- Operating Expenses: ${currentPnL.expenses}
- Net Profit: ${currentPnL.netProfit} (Margin: ${currentPnL.revenue > 0 ? ((currentPnL.netProfit / currentPnL.revenue) * 100).toFixed(1) : 0}%)

${previousPnL ? `Previous period: ${previousPeriod}
- Revenue: ${previousPnL.revenue}
- Gross Profit: ${previousPnL.grossProfit}
- Net Profit: ${previousPnL.netProfit}
` : 'No previous period available.'}

KPIs: ${kpiData.length > 0 ? kpiData.map((k) => `${k.label}: ${k.formatted_value} [${k.benchmark_status}]`).join(', ') : 'None available'}

Anomalies: ${anomalies.length > 0 ? anomalies.map((a) => `[${a.severity}] ${a.title}`).join('; ') : 'None'}

Open challenges: ${challenges.length > 0 ? challenges.map((c) => `[${c.severity}] ${c.metric_label}: ${c.reason}`).join('; ') : 'None'}
${filingDeadlineContext}`;

    const llmResult = await callLLMWithUsage({
      systemPrompt,
      userMessage,
      model: 'sonnet',
      temperature: 0.3,
      maxTokens: 2048,
      cacheSystemPrompt: true,
      orgId,
      userId: profile.id as string,
      endpoint: 'key_actions_briefing',
    });

    // Parse response
    let briefing: KeyActionsBriefing;
    try {
      let jsonStr = llmResult.text.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      briefing = briefingResponseSchema.parse(JSON.parse(jsonMatch[0]));
    } catch {
      // Fallback: return a minimal briefing
      briefing = {
        revenue: {
          title: 'Revenue',
          insights: [{ text: `Revenue for ${latestPeriod}: £${currentPnL.revenue.toLocaleString()}`, source_ref: { page: '/financials/income-statement' } }],
          trend: 'stable',
          highlight_value: `£${currentPnL.revenue.toLocaleString()}`,
        },
        cash: {
          title: 'Cash',
          insights: [{ text: 'View cash flow statement for details.', source_ref: { page: '/financials/cash-flow' } }],
        },
        costs: {
          title: 'Costs',
          insights: [{ text: `Operating expenses: £${currentPnL.expenses.toLocaleString()}`, source_ref: { page: '/variance' } }],
          highlight_value: `£${currentPnL.expenses.toLocaleString()}`,
        },
        risk: {
          title: 'Risk',
          insights: [{ text: `${anomalies.length + challenges.length} items need attention.`, source_ref: { page: '/intelligence/anomalies' } }],
          highlight_value: `${anomalies.length + challenges.length} items`,
        },
      };
    }

    const generatedAt = new Date().toISOString();

    // Cache the result (best-effort)
    try {
      await untypedDb
        .from('daily_briefing_cache')
        .upsert({
          org_id: orgId,
          briefing_date: today,
          content: briefing,
          source_refs: { period: latestPeriod, kpiCount: kpiData.length, anomalyCount: anomalies.length },
          generated_at: generatedAt,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }, {
          onConflict: 'org_id,briefing_date',
        });
    } catch {
      // Cache write failure is non-critical
    }

    // Audit log
    await logAudit(
      {
        orgId,
        userId: profile.id as string,
        action: 'key_actions_briefing_generated',
        entityType: 'briefing',
        metadata: {
          period: latestPeriod,
          inputTokens: llmResult.inputTokens,
          outputTokens: llmResult.outputTokens,
        },
      },
      { critical: false }
    );

    return NextResponse.json({
      ...briefing,
      generatedAt,
      cached: false,
    });
  } catch (err) {
    console.error('[KEY_ACTIONS] Error:', err);

    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to generate key actions briefing' },
      { status: 500 }
    );
  }
}
