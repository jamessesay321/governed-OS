import { createServiceClient } from '@/lib/supabase/server';
import { callLLM } from '@/lib/ai/llm';
import { buildPnL, getAvailablePeriods, sumAmounts } from '@/lib/financial/aggregate';
import { getTemplate } from './templates';
import type {
  Report,
  ReportSection,
  ReportSectionType,
  GenerateReportOptions,
} from '@/types/reports';
import type {
  KPISnapshot,
  ModelSnapshot,
  IntelligenceImpact,
  FinancialStatement,
} from '@/types';

/**
 * Generate a full report from live data.
 * Pulls KPIs, P&L, cash position, scenarios, intelligence.
 * Calls Claude for executive summary + section commentary.
 */
export async function generateReport(
  orgId: string,
  userId: string,
  options: GenerateReportOptions
): Promise<Report> {
  const supabase = await createServiceClient();
  const template = getTemplate(options.reportType);

  if (!template) {
    throw new Error(`Unknown report type: ${options.reportType}`);
  }

  // Determine which sections to include
  const activeSections = options.selectedSections
    ? template.sections.filter(
        (s) => s.required || options.selectedSections!.includes(s.type)
      )
    : template.sections;

  // Fetch all necessary data in parallel
  const [
    { data: financials },
    { data: accounts },
    { data: kpis },
    { data: modelSnapshots },
    { data: intelligenceImpacts },
    { data: financialStatements },
    { data: scenarios },
  ] = await Promise.all([
    supabase
      .from('normalised_financials')
      .select('*')
      .eq('org_id', orgId)
      .gte('period', options.periodStart)
      .lte('period', options.periodEnd),
    supabase.from('chart_of_accounts').select('*').eq('org_id', orgId),
    supabase
      .from('kpi_snapshots' as any)
      .select('*')
      .eq('org_id', orgId)
      .gte('period', options.periodStart)
      .lte('period', options.periodEnd)
      .order('period', { ascending: false }),
    supabase
      .from('model_snapshots')
      .select('*')
      .eq('org_id', orgId)
      .order('period', { ascending: false })
      .limit(12),
    supabase
      .from('intelligence_impacts' as any)
      .select('*, intelligence_events(*)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('financial_statements' as any)
      .select('*')
      .eq('org_id', orgId)
      .gte('period', options.periodStart)
      .lte('period', options.periodEnd),
    supabase
      .from('scenarios')
      .select('*')
      .eq('org_id', orgId)
      .in('status', ['active', 'draft'])
      .limit(5),
  ]);

  // Build P&L for the period
  const periods = getAvailablePeriods(financials || []);
  const pnlData = periods.map((period) =>
    buildPnL(financials || [], accounts || [], period)
  );
  const latestPnl = pnlData[0];

  // Build sections
  const sections: ReportSection[] = [];
  let sectionOrder = 0;

  for (const sectionConfig of activeSections) {
    const section = await buildSection(
      sectionConfig.type,
      sectionConfig.title,
      sectionOrder++,
      {
        kpis: (kpis || []) as any,
        pnlData,
        latestPnl,
        modelSnapshots: modelSnapshots || [],
        intelligenceImpacts: (intelligenceImpacts || []) as any,
        financialStatements: (financialStatements || []) as any,
        scenarios: scenarios || [],
        periodStart: options.periodStart,
        periodEnd: options.periodEnd,
      }
    );
    sections.push(section);
  }

  // Generate AI executive commentary across all sections
  const aiCommentary = await generateExecutiveCommentary(sections, options);

  // Update the executive summary section with the AI commentary
  const execSummaryIndex = sections.findIndex(
    (s) => s.type === 'executive_summary'
  );
  if (execSummaryIndex >= 0) {
    sections[execSummaryIndex].commentary = aiCommentary;
  }

  const reportId = crypto.randomUUID();
  const now = new Date().toISOString();

  const report: Report = {
    id: reportId,
    org_id: orgId,
    report_type: options.reportType,
    title:
      options.title ||
      `${template.label} - ${formatPeriodRange(options.periodStart, options.periodEnd)}`,
    status: 'draft',
    period_start: options.periodStart,
    period_end: options.periodEnd,
    sections,
    ai_commentary: aiCommentary,
    generated_by: userId,
    approved_by: null,
    pdf_url: null,
    created_at: now,
    updated_at: now,
  };

  return report;
}

type SectionDataContext = {
  kpis: KPISnapshot[];
  pnlData: ReturnType<typeof buildPnL>[];
  latestPnl: ReturnType<typeof buildPnL> | undefined;
  modelSnapshots: ModelSnapshot[];
  intelligenceImpacts: (IntelligenceImpact & {
    intelligence_events?: Record<string, unknown>;
  })[];
  financialStatements: FinancialStatement[];
  scenarios: { id: string; name: string; status: string; description: string }[];
  periodStart: string;
  periodEnd: string;
};

async function buildSection(
  type: ReportSectionType,
  title: string,
  order: number,
  ctx: SectionDataContext
): Promise<ReportSection> {
  const id = crypto.randomUUID();
  let data: Record<string, unknown> = {};
  let commentary = '';

  switch (type) {
    case 'executive_summary':
      data = {
        periodStart: ctx.periodStart,
        periodEnd: ctx.periodEnd,
        revenue: ctx.latestPnl?.revenue ?? 0,
        netProfit: ctx.latestPnl?.netProfit ?? 0,
        grossMargin: ctx.latestPnl
          ? ctx.latestPnl.revenue > 0
            ? ((ctx.latestPnl.grossProfit / ctx.latestPnl.revenue) * 100).toFixed(1)
            : '0.0'
          : '0.0',
      };
      break;

    case 'kpi_summary':
      data = {
        kpis: ctx.kpis.map((k) => ({
          type: k.kpi_type,
          value: k.value,
          period: k.period,
          trend: k.trend_direction,
          trendPct: k.trend_percentage,
          benchmark: k.benchmark_value,
        })),
      };
      commentary = await generateSectionCommentary(
        'KPI Summary',
        `KPI data for the period: ${JSON.stringify(data.kpis)}`
      );
      break;

    case 'pnl':
      data = {
        periods: ctx.pnlData.map((p) => ({
          period: p.period,
          revenue: p.revenue,
          costOfSales: p.costOfSales,
          grossProfit: p.grossProfit,
          expenses: p.expenses,
          netProfit: p.netProfit,
          sections: p.sections.map((s) => ({
            label: s.label,
            total: s.total,
            rows: s.rows.map((r) => ({
              name: r.accountName,
              amount: r.amount,
            })),
          })),
        })),
      };
      commentary = await generateSectionCommentary(
        'Profit & Loss',
        `P&L summary: Revenue ${ctx.latestPnl?.revenue ?? 0}, Gross Profit ${ctx.latestPnl?.grossProfit ?? 0}, Net Profit ${ctx.latestPnl?.netProfit ?? 0}`
      );
      break;

    case 'cash_flow': {
      const cashFlowStatements = ctx.financialStatements.filter(
        (s) => s.statement_type === 'cash_flow'
      );
      const latestSnapshot = ctx.modelSnapshots[0];
      data = {
        statements: cashFlowStatements.map((s) => ({
          period: s.period,
          data: s.data,
        })),
        closingCash: latestSnapshot?.closing_cash ?? null,
        burnRate: latestSnapshot?.burn_rate ?? null,
        runwayMonths: latestSnapshot?.runway_months ?? null,
      };
      commentary = await generateSectionCommentary(
        'Cash Flow',
        `Cash position: Closing cash ${latestSnapshot?.closing_cash ?? 'N/A'}, Burn rate ${latestSnapshot?.burn_rate ?? 'N/A'}, Runway ${latestSnapshot?.runway_months ?? 'N/A'} months`
      );
      break;
    }

    case 'variance': {
      const budgetVariances = ctx.pnlData.map((p) => ({
        period: p.period,
        revenue: p.revenue,
        netProfit: p.netProfit,
      }));
      data = { variances: budgetVariances };
      commentary = await generateSectionCommentary(
        'Variance Analysis',
        `Period data for variance analysis: ${JSON.stringify(budgetVariances)}`
      );
      break;
    }

    case 'scenarios':
      data = {
        scenarios: ctx.scenarios.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          description: s.description,
        })),
        snapshots: ctx.modelSnapshots.slice(0, 6).map((s) => ({
          period: s.period,
          revenue: s.revenue,
          netProfit: s.net_profit,
          closingCash: s.closing_cash,
          runwayMonths: s.runway_months,
        })),
      };
      commentary = await generateSectionCommentary(
        'Scenario Analysis',
        `Active scenarios: ${ctx.scenarios.map((s) => s.name).join(', ')}`
      );
      break;

    case 'intelligence':
      data = {
        impacts: ctx.intelligenceImpacts.map((i) => ({
          eventTitle:
            (i.intelligence_events as Record<string, unknown>)?.title ?? 'Unknown',
          eventSummary:
            (i.intelligence_events as Record<string, unknown>)?.summary ?? '',
          relevanceScore: i.relevance_score,
          impactType: i.impact_type,
          narrative: i.impact_narrative,
          estimatedImpact: i.estimated_impact_pence,
        })),
      };
      commentary = await generateSectionCommentary(
        'Intelligence Briefing',
        `Recent intelligence events: ${ctx.intelligenceImpacts
          .map(
            (i) =>
              `${(i.intelligence_events as Record<string, unknown>)?.title ?? 'Event'} (${i.impact_type}, relevance: ${i.relevance_score})`
          )
          .join('; ')}`
      );
      break;

    case 'playbook':
      data = {
        note: 'Playbook progress data will be populated when the playbook engine is active.',
      };
      commentary = 'Playbook progress tracking is available when the playbook engine is configured.';
      break;

    case 'action_items':
      data = {
        items: [],
        note: 'Action items are populated from board decisions and scenario outcomes.',
      };
      commentary = await generateSectionCommentary(
        'Action Items',
        'Generate recommended action items based on the financial and operational data reviewed in this report.'
      );
      break;

    case 'custom':
      data = {};
      break;
  }

  return { id, type, title, data, commentary, order };
}

async function generateSectionCommentary(
  sectionTitle: string,
  context: string
): Promise<string> {
  try {
    const response = await callLLM({
      systemPrompt: `You are a senior financial advisor generating commentary for a board report section titled "${sectionTitle}".
Write 2-3 sentences of professional, concise commentary suitable for a board pack.
Focus on key insights, trends, and actionable observations.
Do not use markdown formatting. Write in plain professional English.
Be specific about numbers when provided.`,
      userMessage: context,
      temperature: 0.3,
    });
    return response;
  } catch (error) {
    console.error(`[REPORTS] Failed to generate commentary for ${sectionTitle}:`, error);
    return `Commentary generation unavailable. Please review the data below.`;
  }
}

async function generateExecutiveCommentary(
  sections: ReportSection[],
  options: GenerateReportOptions
): Promise<string> {
  const sectionSummaries = sections
    .filter((s) => s.type !== 'executive_summary')
    .map((s) => `${s.title}: ${s.commentary}`)
    .join('\n\n');

  try {
    const response = await callLLM({
      systemPrompt: `You are a senior financial advisor writing an executive summary for a ${options.reportType.replace('_', ' ')} report.
Write a professional executive summary (4-6 sentences) that synthesises the key findings from all report sections.
Highlight the most important trends, risks, and opportunities.
Do not use markdown formatting. Write in plain professional English suitable for board-level readers.`,
      userMessage: `Report period: ${options.periodStart} to ${options.periodEnd}\n\nSection summaries:\n${sectionSummaries}`,
      temperature: 0.3,
    });
    return response;
  } catch (error) {
    console.error('[REPORTS] Failed to generate executive commentary:', error);
    return 'Executive summary generation unavailable. Please review individual sections below.';
  }
}

function formatPeriodRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric',
  });
  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}
