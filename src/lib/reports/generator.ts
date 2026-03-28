// === Report Generation Engine ===
// Generates structured reports from templates using live financial data and AI narratives.

import { createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMCached, CACHE_TTL } from '@/lib/ai/cache';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import {
  getBuilderTemplate,
  type ReportTemplate,
  type ReportSectionConfig,
} from './templates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneratedReport {
  id: string;
  orgId: string;
  templateId: string;
  title: string;
  period: string;
  sections: GeneratedSection[];
  generatedAt: string;
  generatedBy: string; // 'ai' or user_id
  status: 'draft' | 'final' | 'shared';
  shareUrl?: string;
}

export interface GeneratedSection {
  id: string;
  type: ReportSectionConfig['type'];
  title: string;
  content: {
    narrative?: string;
    kpis?: { label: string; value: string; change?: string; status?: string }[];
    chartData?: {
      labels: string[];
      datasets: { label: string; data: number[] }[];
    };
    tableData?: { headers: string[]; rows: string[][] };
    customText?: string;
  };
  citations: { text: string; source: string; reference: string }[];
}

// ---------------------------------------------------------------------------
// Main generation function
// ---------------------------------------------------------------------------

export async function generateReport(
  orgId: string,
  templateId: string,
  period?: string
): Promise<GeneratedReport> {
  const template = getBuilderTemplate(templateId);
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  const supabase = await createUntypedServiceClient();

  // Resolve period -- default to most recent month available
  const resolvedPeriod = period || new Date().toISOString().slice(0, 7);

  // Fetch financial data for context
  const [
    { data: financials },
    { data: accounts },
    { data: modelSnapshots },
    { data: thesisRows },
  ] = await Promise.all([
    supabase
      .from('normalised_financials')
      .select('*')
      .eq('org_id', orgId)
      .order('period', { ascending: false })
      .limit(500),
    supabase.from('chart_of_accounts').select('*').eq('org_id', orgId),
    supabase
      .from('model_snapshots')
      .select('*')
      .eq('org_id', orgId)
      .order('period', { ascending: false })
      .limit(12),
    supabase
      .from('business_theses' as string)
      .select('*')
      .eq('org_id', orgId)
      .limit(1),
  ]);

  const allFinancials = (financials || []) as Record<string, unknown>[];
  const allAccounts = (accounts || []) as Record<string, unknown>[];
  const snapshots = (modelSnapshots || []) as Record<string, unknown>[];
  const thesis = (thesisRows || [])[0] as Record<string, unknown> | undefined;

  // Build P&L data for available periods
  const periods = getAvailablePeriods(allFinancials as any);
  const pnlByPeriod: Record<string, ReturnType<typeof buildPnL>> = {};
  for (const p of periods) {
    pnlByPeriod[p] = buildPnL(allFinancials as any, allAccounts as any, p);
  }

  const currentPnl = pnlByPeriod[resolvedPeriod];

  // Context for AI narratives
  const financialContext = buildFinancialContext(
    currentPnl,
    pnlByPeriod,
    snapshots,
    resolvedPeriod,
    thesis
  );

  // Generate each section
  const sections: GeneratedSection[] = [];
  for (const sectionConfig of template.sections) {
    const section = await generateSection(
      sectionConfig,
      orgId,
      resolvedPeriod,
      financialContext,
      pnlByPeriod,
      snapshots,
      periods
    );
    sections.push(section);
  }

  const reportId = crypto.randomUUID();
  const now = new Date().toISOString();

  const report: GeneratedReport = {
    id: reportId,
    orgId,
    templateId,
    title: `${template.name} - ${formatPeriod(resolvedPeriod)}`,
    period: resolvedPeriod,
    sections,
    generatedAt: now,
    generatedBy: 'ai',
    status: 'draft',
  };

  // Persist to generated_reports table
  const { error: insertError } = await supabase.from('generated_reports').insert({
    id: reportId,
    org_id: orgId,
    template_id: templateId,
    title: report.title,
    period: resolvedPeriod,
    sections: JSON.parse(JSON.stringify(sections)),
    status: 'draft',
    generated_by: 'ai',
    generated_at: now,
  });

  if (insertError) {
    console.error('[REPORT BUILDER] Failed to persist report:', insertError.message);
    // Still return the report even if persistence fails
  }

  return report;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export async function getReport(reportId: string): Promise<GeneratedReport | null> {
  const supabase = await createUntypedServiceClient();
  const { data, error } = await supabase
    .from('generated_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    orgId: data.org_id as string,
    templateId: data.template_id as string,
    title: data.title as string,
    period: (data.period as string) || '',
    sections: (data.sections as GeneratedSection[]) || [],
    generatedAt: data.generated_at as string,
    generatedBy: (data.generated_by as string) || 'ai',
    status: (data.status as GeneratedReport['status']) || 'draft',
    shareUrl: (data.share_url as string) || undefined,
  };
}

export async function listReports(orgId: string): Promise<GeneratedReport[]> {
  const supabase = await createUntypedServiceClient();
  const { data, error } = await supabase
    .from('generated_reports')
    .select('*')
    .eq('org_id', orgId)
    .order('generated_at', { ascending: false });

  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    orgId: row.org_id as string,
    templateId: row.template_id as string,
    title: row.title as string,
    period: (row.period as string) || '',
    sections: (row.sections as GeneratedSection[]) || [],
    generatedAt: row.generated_at as string,
    generatedBy: (row.generated_by as string) || 'ai',
    status: (row.status as GeneratedReport['status']) || 'draft',
    shareUrl: (row.share_url as string) || undefined,
  }));
}

// ---------------------------------------------------------------------------
// Section generation
// ---------------------------------------------------------------------------

async function generateSection(
  config: ReportSectionConfig,
  orgId: string,
  period: string,
  financialContext: string,
  pnlByPeriod: Record<string, ReturnType<typeof buildPnL>>,
  snapshots: Record<string, unknown>[],
  availablePeriods: string[]
): Promise<GeneratedSection> {
  const sectionId = crypto.randomUUID();
  const citations: GeneratedSection['citations'] = [];

  switch (config.type) {
    case 'narrative': {
      const prompt = (config.config.prompt as string) || 'Provide financial commentary.';
      const maxWords = (config.config.maxWords as number) || 200;
      const narrative = await generateNarrative(
        orgId,
        config.title,
        prompt,
        maxWords,
        financialContext
      );
      citations.push({
        text: 'AI-generated narrative based on financial data',
        source: 'normalised_financials',
        reference: `Period: ${period}`,
      });
      return {
        id: sectionId,
        type: 'narrative',
        title: config.title,
        content: { narrative },
        citations,
      };
    }

    case 'kpi_grid': {
      const kpiKeys = (config.config.kpis as string[]) || [];
      const kpis = buildKpiData(kpiKeys, pnlByPeriod, snapshots, period);
      citations.push({
        text: 'KPI values calculated from financial data',
        source: 'normalised_financials, model_snapshots',
        reference: `Period: ${period}`,
      });
      return {
        id: sectionId,
        type: 'kpi_grid',
        title: config.title,
        content: { kpis },
        citations,
      };
    }

    case 'chart': {
      const chartType = (config.config.chartType as string) || 'line';
      const metric = (config.config.metric as string) || 'revenue';
      const numPeriods = (config.config.periods as number) || 12;
      const chartData = buildChartData(
        metric,
        chartType,
        numPeriods,
        pnlByPeriod,
        snapshots,
        availablePeriods
      );
      citations.push({
        text: `${metric} trend data`,
        source: 'normalised_financials',
        reference: `Last ${numPeriods} periods`,
      });
      return {
        id: sectionId,
        type: 'chart',
        title: config.title,
        content: { chartData },
        citations,
      };
    }

    case 'table': {
      const dataSource = (config.config.dataSource as string) || 'pnl';
      const columns = (config.config.columns as string[]) || [];
      const tableData = buildTableData(dataSource, columns, pnlByPeriod, period);
      citations.push({
        text: `Data from ${dataSource}`,
        source: 'normalised_financials',
        reference: `Period: ${period}`,
      });
      return {
        id: sectionId,
        type: 'table',
        title: config.title,
        content: { tableData },
        citations,
      };
    }

    case 'comparison': {
      const metrics = (config.config.metrics as string[]) || [];
      const period2Type = (config.config.period2 as string) || 'prior_month';
      const priorPeriod = resolvePriorPeriod(period, period2Type);
      const tableData = buildComparisonData(
        metrics,
        period,
        priorPeriod,
        pnlByPeriod,
        snapshots
      );
      citations.push({
        text: `Comparison: ${period} vs ${priorPeriod}`,
        source: 'normalised_financials',
        reference: `Periods: ${period}, ${priorPeriod}`,
      });
      return {
        id: sectionId,
        type: 'comparison',
        title: config.title,
        content: { tableData },
        citations,
      };
    }

    case 'custom_text': {
      const placeholder =
        (config.config.placeholder as string) || 'Enter your text here...';
      return {
        id: sectionId,
        type: 'custom_text',
        title: config.title,
        content: { customText: placeholder },
        citations: [],
      };
    }

    case 'separator':
    default: {
      return {
        id: sectionId,
        type: config.type,
        title: config.title,
        content: {},
        citations: [],
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Narrative generation
// ---------------------------------------------------------------------------

async function generateNarrative(
  orgId: string,
  sectionTitle: string,
  prompt: string,
  maxWords: number,
  financialContext: string
): Promise<string> {
  try {
    const systemPrompt = `You are a senior financial advisor generating a report section titled "${sectionTitle}".
Write professional, concise commentary suitable for board-level readers.
Maximum ${maxWords} words. Do not use markdown formatting. Do not use em dashes.
Write in plain professional English. Be specific about numbers when available.
Focus on actionable insights and trends.`;

    const { response } = await callLLMCached({
      systemPrompt,
      userMessage: `${prompt}\n\nFinancial context:\n${financialContext}`,
      orgId,
      temperature: 0.3,
      cacheTTLMinutes: CACHE_TTL.NARRATIVE,
    });

    return response;
  } catch (error) {
    console.error(`[REPORT BUILDER] Narrative generation failed for ${sectionTitle}:`, error);
    return `Commentary generation unavailable for "${sectionTitle}". Please review the data and add manual commentary.`;
  }
}

// ---------------------------------------------------------------------------
// Data builders
// ---------------------------------------------------------------------------

function buildFinancialContext(
  currentPnl: ReturnType<typeof buildPnL> | undefined,
  pnlByPeriod: Record<string, ReturnType<typeof buildPnL>>,
  snapshots: Record<string, unknown>[],
  period: string,
  thesis?: Record<string, unknown>
): string {
  const parts: string[] = [];

  if (currentPnl) {
    parts.push(
      `Current period (${period}): Revenue ${fmt(currentPnl.revenue)}, ` +
        `Gross Profit ${fmt(currentPnl.grossProfit)}, ` +
        `Net Profit ${fmt(currentPnl.netProfit)}, ` +
        `Gross Margin ${currentPnl.revenue > 0 ? ((currentPnl.grossProfit / currentPnl.revenue) * 100).toFixed(1) : '0'}%`
    );
  }

  // Prior period comparison
  const priorPeriod = resolvePriorPeriod(period, 'prior_month');
  const priorPnl = pnlByPeriod[priorPeriod];
  if (priorPnl && currentPnl) {
    const revChange = currentPnl.revenue - priorPnl.revenue;
    const revPct =
      priorPnl.revenue !== 0
        ? ((revChange / Math.abs(priorPnl.revenue)) * 100).toFixed(1)
        : 'N/A';
    parts.push(
      `Prior period (${priorPeriod}): Revenue ${fmt(priorPnl.revenue)}. ` +
        `Revenue change: ${fmt(revChange)} (${revPct}%)`
    );
  }

  // Cash position from snapshots
  const latestSnapshot = snapshots[0];
  if (latestSnapshot) {
    parts.push(
      `Cash position: Closing cash ${fmt(latestSnapshot.closing_cash as number)}, ` +
        `Burn rate ${fmt(latestSnapshot.burn_rate as number)}, ` +
        `Runway ${latestSnapshot.runway_months ?? 'N/A'} months`
    );
  }

  if (thesis) {
    parts.push(`Business thesis: ${(thesis.summary as string) || 'Not available'}`);
  }

  return parts.join('\n\n');
}

function buildKpiData(
  kpiKeys: string[],
  pnlByPeriod: Record<string, ReturnType<typeof buildPnL>>,
  snapshots: Record<string, unknown>[],
  period: string
): GeneratedSection['content']['kpis'] {
  const currentPnl = pnlByPeriod[period];
  const priorPeriod = resolvePriorPeriod(period, 'prior_month');
  const priorPnl = pnlByPeriod[priorPeriod];
  const latestSnapshot = snapshots[0] as Record<string, unknown> | undefined;

  return kpiKeys.map((key) => {
    const { value, change, status } = resolveKpiValue(
      key,
      currentPnl,
      priorPnl,
      latestSnapshot
    );
    return {
      label: formatKpiLabel(key),
      value,
      change,
      status,
    };
  });
}

function resolveKpiValue(
  key: string,
  currentPnl: ReturnType<typeof buildPnL> | undefined,
  priorPnl: ReturnType<typeof buildPnL> | undefined,
  snapshot: Record<string, unknown> | undefined
): { value: string; change?: string; status?: string } {
  let current = 0;
  let prior = 0;

  switch (key) {
    case 'revenue':
      current = currentPnl?.revenue ?? 0;
      prior = priorPnl?.revenue ?? 0;
      break;
    case 'gross_margin':
      if (currentPnl && currentPnl.revenue > 0) {
        const margin = (currentPnl.grossProfit / currentPnl.revenue) * 100;
        const priorMargin =
          priorPnl && priorPnl.revenue > 0
            ? (priorPnl.grossProfit / priorPnl.revenue) * 100
            : 0;
        return {
          value: `${margin.toFixed(1)}%`,
          change: priorPnl ? `${(margin - priorMargin).toFixed(1)}pp` : undefined,
          status: margin > 50 ? 'good' : margin > 30 ? 'warning' : 'critical',
        };
      }
      return { value: '0.0%', status: 'neutral' };
    case 'net_profit':
      current = currentPnl?.netProfit ?? 0;
      prior = priorPnl?.netProfit ?? 0;
      break;
    case 'operating_expenses':
    case 'expenses':
      current = currentPnl?.expenses ?? 0;
      prior = priorPnl?.expenses ?? 0;
      break;
    case 'cost_of_sales':
      current = currentPnl?.costOfSales ?? 0;
      prior = priorPnl?.costOfSales ?? 0;
      break;
    case 'gross_profit':
      current = currentPnl?.grossProfit ?? 0;
      prior = priorPnl?.grossProfit ?? 0;
      break;
    case 'closing_cash':
    case 'cash_balance':
      current = (snapshot?.closing_cash as number) ?? 0;
      return { value: fmt(current), status: current > 0 ? 'good' : 'critical' };
    case 'burn_rate':
    case 'monthly_burn':
      current = (snapshot?.burn_rate as number) ?? 0;
      return { value: fmt(Math.abs(current)), status: 'neutral' };
    case 'runway_months':
      current = (snapshot?.runway_months as number) ?? 0;
      return {
        value: `${current.toFixed(0)} months`,
        status: current > 12 ? 'good' : current > 6 ? 'warning' : 'critical',
      };
    case 'cash_inflow':
    case 'cash_outflow':
    case 'headcount':
    case 'arr':
    case 'mrr':
    case 'ebitda':
    case 'revenue_growth':
    case 'net_retention':
    case 'customers':
    case 'ltv_cac_ratio':
    case 'current_ratio':
    case 'debt_to_equity':
    case 'interest_coverage':
    case 'dscr':
    case 'quick_ratio':
    case 'leverage_ratio':
      // These require additional data sources not yet available
      return { value: 'N/A', status: 'neutral' };
    default:
      return { value: 'N/A', status: 'neutral' };
  }

  const change = prior !== 0 ? ((current - prior) / Math.abs(prior)) * 100 : 0;
  const changeStr = prior !== 0 ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : undefined;
  const status =
    key === 'operating_expenses' || key === 'cost_of_sales'
      ? change > 10
        ? 'critical'
        : change > 0
          ? 'warning'
          : 'good'
      : change > 0
        ? 'good'
        : change < -10
          ? 'critical'
          : 'warning';

  return { value: fmt(current), change: changeStr, status };
}

function buildChartData(
  metric: string,
  _chartType: string,
  numPeriods: number,
  pnlByPeriod: Record<string, ReturnType<typeof buildPnL>>,
  snapshots: Record<string, unknown>[],
  availablePeriods: string[]
): GeneratedSection['content']['chartData'] {
  const periodsToUse = availablePeriods.slice(0, numPeriods).reverse();
  const labels = periodsToUse.map((p) => formatPeriod(p));

  let data: number[] = [];

  switch (metric) {
    case 'revenue':
      data = periodsToUse.map((p) => pnlByPeriod[p]?.revenue ?? 0);
      break;
    case 'expenses':
    case 'operating_expenses':
      data = periodsToUse.map((p) => Math.abs(pnlByPeriod[p]?.expenses ?? 0));
      break;
    case 'net_profit':
      data = periodsToUse.map((p) => pnlByPeriod[p]?.netProfit ?? 0);
      break;
    case 'gross_profit':
      data = periodsToUse.map((p) => pnlByPeriod[p]?.grossProfit ?? 0);
      break;
    case 'cash_balance': {
      const snapshotByPeriod = new Map<string, number>();
      for (const s of snapshots) {
        const sp = s.period as string;
        if (sp) snapshotByPeriod.set(sp, (s.closing_cash as number) ?? 0);
      }
      data = periodsToUse.map((p) => snapshotByPeriod.get(p) ?? 0);
      break;
    }
    case 'key_ratios':
      // Placeholder for ratio trends
      data = periodsToUse.map(() => 0);
      break;
    default:
      data = periodsToUse.map((p) => pnlByPeriod[p]?.revenue ?? 0);
  }

  return {
    labels,
    datasets: [
      {
        label: formatKpiLabel(metric),
        data,
      },
    ],
  };
}

function buildTableData(
  dataSource: string,
  _columns: string[],
  pnlByPeriod: Record<string, ReturnType<typeof buildPnL>>,
  period: string
): GeneratedSection['content']['tableData'] {
  const pnl = pnlByPeriod[period];

  switch (dataSource) {
    case 'pnl': {
      if (!pnl) {
        return { headers: ['Account', 'Amount'], rows: [['No data available', '']] };
      }
      const headers = ['Account', 'Amount'];
      const rows: string[][] = [];
      for (const section of pnl.sections) {
        rows.push([section.label, fmt(section.total)]);
        for (const row of section.rows) {
          rows.push([`  ${row.accountName}`, fmt(row.amount)]);
        }
      }
      rows.push(['Net Profit', fmt(pnl.netProfit)]);
      return { headers, rows };
    }
    case 'revenue_breakdown': {
      if (!pnl) {
        return { headers: ['Stream', 'Amount'], rows: [['No data available', '']] };
      }
      const revenueSection = pnl.sections.find(
        (s) => s.class === 'REVENUE' || s.label.toLowerCase().includes('revenue')
      );
      const headers = ['Stream', 'Amount'];
      const rows: string[][] = revenueSection
        ? revenueSection.rows.map((r) => [r.accountName, fmt(r.amount)])
        : [['No revenue breakdown available', '']];
      return { headers, rows };
    }
    case 'covenants': {
      return {
        headers: ['Covenant', 'Required', 'Actual', 'Status'],
        rows: [
          ['Minimum cash balance', 'Per agreement', 'See financials', 'Review required'],
          ['Debt service coverage', '>1.2x', 'N/A', 'Review required'],
          ['Current ratio', '>1.0x', 'N/A', 'Review required'],
        ],
      };
    }
    default:
      return { headers: ['Data'], rows: [['No data source configured']] };
  }
}

function buildComparisonData(
  metrics: string[],
  currentPeriod: string,
  priorPeriod: string,
  pnlByPeriod: Record<string, ReturnType<typeof buildPnL>>,
  _snapshots: Record<string, unknown>[]
): GeneratedSection['content']['tableData'] {
  const currentPnl = pnlByPeriod[currentPeriod];
  const priorPnl = pnlByPeriod[priorPeriod];

  const headers = ['Metric', formatPeriod(currentPeriod), formatPeriod(priorPeriod), 'Change'];
  const rows: string[][] = [];

  for (const metric of metrics) {
    let currentVal = 0;
    let priorVal = 0;

    switch (metric) {
      case 'revenue':
        currentVal = currentPnl?.revenue ?? 0;
        priorVal = priorPnl?.revenue ?? 0;
        break;
      case 'cost_of_sales':
        currentVal = currentPnl?.costOfSales ?? 0;
        priorVal = priorPnl?.costOfSales ?? 0;
        break;
      case 'gross_profit':
        currentVal = currentPnl?.grossProfit ?? 0;
        priorVal = priorPnl?.grossProfit ?? 0;
        break;
      case 'operating_expenses':
        currentVal = currentPnl?.expenses ?? 0;
        priorVal = priorPnl?.expenses ?? 0;
        break;
      case 'net_profit':
        currentVal = currentPnl?.netProfit ?? 0;
        priorVal = priorPnl?.netProfit ?? 0;
        break;
      default:
        break;
    }

    const change = priorVal !== 0 ? ((currentVal - priorVal) / Math.abs(priorVal)) * 100 : 0;
    const changeStr = priorVal !== 0 ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : 'N/A';

    rows.push([formatKpiLabel(metric), fmt(currentVal), fmt(priorVal), changeStr]);
  }

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function resolvePriorPeriod(period: string, type: string): string {
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  switch (type) {
    case 'prior_month': {
      const pm = month === 1 ? 12 : month - 1;
      const py = month === 1 ? year - 1 : year;
      return `${py}-${String(pm).padStart(2, '0')}`;
    }
    case 'prior_year':
      return `${year - 1}-${String(month).padStart(2, '0')}`;
    default:
      return type; // Assume it is already a period string
  }
}

function fmt(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const monthIndex = parseInt(month, 10) - 1;
  return `${months[monthIndex] || month} ${year}`;
}

function formatKpiLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
