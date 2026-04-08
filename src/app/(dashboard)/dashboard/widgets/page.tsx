import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import { WidgetsClient } from './widgets-client';

/* ─── expense category colour palette ─── */
const EXPENSE_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#f43f5e',
  '#8b5cf6',
  '#06b6d4',
  '#94a3b8',
];

/**
 * Available widget types for the customiser.
 * Each entry maps to a rendered widget on the main dashboard.
 */
const CUSTOMISABLE_WIDGETS: Array<{
  type: string;
  label: string;
  description: string;
}> = [
  {
    type: 'kpi_cards',
    label: 'KPI Summary Cards',
    description: 'Key performance indicator cards with trends and period comparisons.',
  },
  {
    type: 'pnl_table',
    label: 'Profit & Loss Table',
    description: 'Full P&L breakdown with drill-down into accounts and transactions.',
  },
  {
    type: 'narrative_summary',
    label: 'AI Narrative Summary',
    description: 'Claude-generated financial insight and commentary for the period.',
  },
  {
    type: 'waterfall_chart',
    label: 'Revenue Waterfall',
    description: 'Visual bridge from revenue to net profit showing each step.',
  },
  {
    type: 'cash_position',
    label: 'Cash Position',
    description: 'Current cash balance, runway projection, and cash flow trends.',
  },
  {
    type: 'data_health',
    label: 'Data Health Widget',
    description: 'Sync status, data freshness, and data quality indicators.',
  },
  {
    type: 'activity_feed',
    label: 'Activity Feed',
    description: 'Recent team activity, comments, and audit trail entries.',
  },
  {
    type: 'sync_status',
    label: 'Sync Status',
    description: 'Xero connection health, last sync time, and records synced.',
  },
];

/** Default widget order when no saved config exists */
const DEFAULT_WIDGET_CONFIG = CUSTOMISABLE_WIDGETS.map((w, i) => ({
  type: w.type,
  visible: true,
  order: i,
}));

export default async function DashboardWidgetsPage() {
  const { orgId, userId } = await getUserProfile();
  const supabase = await createClient();

  /* ─── 1. Fetch saved widget config ─── */
  let savedConfig: Array<{ type: string; visible: boolean; order: number }> | null = null;

  try {
    const svc = await createUntypedServiceClient();

    // Try dashboard_preferences first
    const { data: prefData } = await svc
      .from('dashboard_preferences')
      .select('custom_widgets')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .maybeSingle();

    if (prefData?.custom_widgets && Array.isArray(prefData.custom_widgets)) {
      const items = prefData.custom_widgets as unknown[];
      const first = items[0] as Record<string, unknown> | undefined;
      if (first && 'visible' in first && 'order' in first) {
        savedConfig = prefData.custom_widgets as Array<{ type: string; visible: boolean; order: number }>;
      }
    }

    // Fallback to dashboard_widget_configs
    if (!savedConfig) {
      const { data: configData } = await svc
        .from('dashboard_widget_configs')
        .select('widgets')
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .maybeSingle();

      if (configData?.widgets && Array.isArray(configData.widgets)) {
        const items = configData.widgets as unknown[];
        const first = items[0] as Record<string, unknown> | undefined;
        if (first && 'visible' in first && 'order' in first) {
          savedConfig = configData.widgets as Array<{ type: string; visible: boolean; order: number }>;
        }
      }
    }
  } catch {
    // Table may not exist yet — proceed with defaults
  }

  // Merge saved config with available widgets
  const widgetConfig = savedConfig
    ? mergeWidgetConfig(savedConfig, CUSTOMISABLE_WIDGETS)
    : DEFAULT_WIDGET_CONFIG;

  /* ─── 2. Check Xero connection ─── */
  const { data: connections } = await supabase
    .from('xero_connections')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .limit(1);

  const connected = (connections?.length ?? 0) > 0;

  /* ─── 3. Fetch normalised financials ─── */
  const { data: rawFinancials } = await supabase
    .from('normalised_financials')
    .select('*, chart_of_accounts!inner(id, code, name, type, class, status)')
    .eq('org_id', orgId);

  const financials: NormalisedFinancial[] = (rawFinancials ?? []).map((r) => ({
    id: r.id,
    org_id: r.org_id,
    period: r.period,
    account_id: r.account_id,
    amount: Number(r.amount),
    transaction_count: r.transaction_count,
    source: r.source,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  /* ─── 4. Fetch chart of accounts ─── */
  const { data: rawAccounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  const accounts: ChartOfAccount[] = (rawAccounts ?? []) as ChartOfAccount[];
  const periods = getAvailablePeriods(financials);

  if (periods.length === 0) {
    return (
      <WidgetsClient
        connected={connected}
        revenueTrend={[]}
        pnlSummary={[]}
        cashTrend={[]}
        expenseBreakdown={[]}
        kpis={[]}
        initialWidgets={widgetConfig}
        availableWidgets={CUSTOMISABLE_WIDGETS}
        defaultWidgets={DEFAULT_WIDGET_CONFIG}
      />
    );
  }

  /* ─── 5. Build P&L for latest period and last 6 ─── */
  const last6 = periods.slice(0, 6).reverse(); // chronological
  const latestPeriod = periods[0];
  const latestPnL = buildPnL(financials, accounts, latestPeriod);

  // Previous period for growth calc
  const prevPnL =
    periods.length > 1 ? buildPnL(financials, accounts, periods[1]) : null;

  /* ─── 6. Revenue trend (6 months) ─── */
  const revenueTrend = last6.map((period) => {
    const pnl = buildPnL(financials, accounts, period);
    return { period, revenue: pnl.revenue };
  });

  /* ─── 7. P&L summary for latest month ─── */
  const pnlSummary = [
    { name: 'Revenue', value: latestPnL.revenue },
    { name: 'COGS', value: latestPnL.costOfSales },
    { name: 'Gross Profit', value: latestPnL.grossProfit },
    { name: 'Expenses', value: latestPnL.expenses },
    { name: 'Net Profit', value: latestPnL.netProfit },
  ];

  /* ─── 8. Expense breakdown by account name ─── */
  const accountMap = new Map<string, ChartOfAccount>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  const expenseMap = new Map<string, number>();
  const latestFinancials = financials.filter((f) => f.period === latestPeriod);
  for (const fin of latestFinancials) {
    const account = accountMap.get(fin.account_id);
    if (!account) continue;
    const cls = account.class.toUpperCase();
    if (cls === 'EXPENSE' || cls === 'OVERHEADS') {
      const existing = expenseMap.get(account.name) ?? 0;
      expenseMap.set(account.name, existing + Math.abs(Number(fin.amount)));
    }
  }

  const totalExpenses = Array.from(expenseMap.values()).reduce(
    (s, v) => s + v,
    0
  );

  const expenseBreakdown = Array.from(expenseMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value], i) => ({
      name,
      value: totalExpenses > 0 ? Math.round((value / totalExpenses) * 100) : 0,
      color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
    }));

  /* ─── 9. Cash position trend ─── */
  const cashTrend = last6.map((period) => {
    const periodFins = financials.filter((f) => f.period === period);
    let periodCash = 0;
    for (const fin of periodFins) {
      const account = accountMap.get(fin.account_id);
      if (!account) continue;
      const cls = account.class.toUpperCase();
      const accType = account.type.toUpperCase();
      if (
        cls === 'ASSET' &&
        (accType.includes('BANK') || accType.includes('CASH'))
      ) {
        periodCash += Number(fin.amount);
      }
    }
    return { period, cash: periodCash };
  });

  /* ─── 10. KPIs ─── */
  const grossMarginPct =
    latestPnL.revenue > 0
      ? Math.round((latestPnL.grossProfit / latestPnL.revenue) * 100)
      : 0;

  const revenueGrowthPct =
    prevPnL && prevPnL.revenue > 0
      ? Math.round(
          ((latestPnL.revenue - prevPnL.revenue) / prevPnL.revenue) * 100
        )
      : 0;

  const netMarginPct =
    latestPnL.revenue > 0
      ? Math.round((latestPnL.netProfit / latestPnL.revenue) * 100)
      : 0;

  const kpis = [
    {
      label: 'Gross Margin',
      value: `${grossMarginPct}%`,
      color: 'bg-emerald-500/15 text-emerald-600',
    },
    {
      label: 'Revenue Growth',
      value: `${revenueGrowthPct >= 0 ? '+' : ''}${revenueGrowthPct}%`,
      color: 'bg-indigo-500/15 text-indigo-600',
    },
    {
      label: 'Net Margin',
      value: `${netMarginPct}%`,
      color:
        netMarginPct >= 0
          ? 'bg-blue-500/15 text-blue-600'
          : 'bg-rose-500/15 text-rose-600',
    },
  ];

  return (
    <WidgetsClient
      connected={connected}
      revenueTrend={revenueTrend}
      pnlSummary={pnlSummary}
      cashTrend={cashTrend}
      expenseBreakdown={expenseBreakdown}
      kpis={kpis}
      initialWidgets={widgetConfig}
      availableWidgets={CUSTOMISABLE_WIDGETS}
      defaultWidgets={DEFAULT_WIDGET_CONFIG}
    />
  );
}

/**
 * Merge saved config with the full list of available widgets.
 * Preserves saved order/visibility, appends any new widgets at the end.
 */
function mergeWidgetConfig(
  saved: Array<{ type: string; visible: boolean; order: number }>,
  available: Array<{ type: string; label: string; description: string }>
): Array<{ type: string; visible: boolean; order: number }> {
  const savedTypes = new Set(saved.map((w) => w.type));
  const merged = [...saved];

  // Add any new widgets that were not in the saved config
  for (const widget of available) {
    if (!savedTypes.has(widget.type)) {
      merged.push({
        type: widget.type,
        visible: true,
        order: merged.length,
      });
    }
  }

  // Remove widgets that no longer exist in available list
  const availableTypes = new Set(available.map((w) => w.type));
  return merged
    .filter((w) => availableTypes.has(w.type))
    .sort((a, b) => a.order - b.order)
    .map((w, i) => ({ ...w, order: i }));
}
