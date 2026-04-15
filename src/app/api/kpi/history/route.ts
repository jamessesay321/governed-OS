import { NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/kpi/history?metrics=revenue,gross_profit,net_profit&months=12
 *
 * Returns monthly KPI values computed from normalised_financials.
 * Each metric key maps to an array of { period, value } objects sorted oldest→newest.
 */

type MetricKey = string;
type PeriodData = Record<string, { revenue: number; cogs: number; opex: number; other_income: number }>;

function aggregateByPeriod(
  rows: Array<{ amount: number; period: string; chart_of_accounts: { class: string } }>
): PeriodData {
  const periods: PeriodData = {};

  for (const row of rows) {
    const p = row.period;
    if (!periods[p]) periods[p] = { revenue: 0, cogs: 0, opex: 0, other_income: 0 };

    const cls = row.chart_of_accounts.class;
    const amt = Math.abs(Number(row.amount));

    if (cls === 'REVENUE') periods[p].revenue += amt;
    else if (cls === 'OTHERINCOME') periods[p].other_income += amt;
    else if (cls === 'DIRECTCOSTS') periods[p].cogs += amt;
    else if (cls === 'EXPENSE' || cls === 'OVERHEADS') periods[p].opex += amt;
  }

  return periods;
}

function computeMetric(
  key: MetricKey,
  data: PeriodData
): Array<{ period: string; value: number }> {
  const sortedPeriods = Object.keys(data).sort();

  return sortedPeriods.map((period) => {
    const d = data[period];
    const totalRevenue = d.revenue + d.other_income;
    const grossProfit = totalRevenue - d.cogs;
    const netProfit = grossProfit - d.opex;

    let value = 0;
    switch (key) {
      case 'revenue':
        value = totalRevenue;
        break;
      case 'gross_profit':
        value = grossProfit;
        break;
      case 'gross_margin':
        value = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        break;
      case 'net_profit':
        value = netProfit;
        break;
      case 'net_margin':
        value = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        break;
      case 'operating_expenses':
        value = d.opex;
        break;
      case 'expense_ratio':
        value = totalRevenue > 0 ? (d.opex / totalRevenue) * 100 : 0;
        break;
      case 'revenue_growth': {
        // Need previous period — handled as percent change
        const idx = sortedPeriods.indexOf(period);
        if (idx > 0) {
          const prev = data[sortedPeriods[idx - 1]];
          const prevRev = prev.revenue + prev.other_income;
          value = prevRev > 0 ? ((totalRevenue - prevRev) / prevRev) * 100 : 0;
        }
        break;
      }
      default:
        value = 0;
    }

    return { period, value: Math.round(value * 100) / 100 };
  });
}

export async function GET(request: Request) {
  try {
    const { orgId } = await getUserProfile();
    const supabase = await createUntypedServiceClient();

    const url = new URL(request.url);
    const metricsParam = url.searchParams.get('metrics') ?? 'revenue,gross_profit,net_profit';
    const months = parseInt(url.searchParams.get('months') ?? '12', 10);

    const metricKeys = metricsParam.split(',').map((k) => k.trim()).filter(Boolean);

    // Compute cutoff date
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().slice(0, 7);

    // Fetch all P&L data for the period
    const { data: rows, error } = await supabase
      .from('normalised_financials')
      .select('amount, period, chart_of_accounts!inner(class)')
      .eq('org_id', orgId)
      .gte('period', cutoffStr)
      .in('chart_of_accounts.class' as string, [
        'REVENUE', 'OTHERINCOME', 'DIRECTCOSTS', 'EXPENSE', 'OVERHEADS',
      ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const typedRows = (rows ?? []) as unknown as Array<{
      amount: number;
      period: string;
      chart_of_accounts: { class: string };
    }>;

    const periodData = aggregateByPeriod(typedRows);

    // Compute each requested metric
    const result: Record<string, Array<{ period: string; value: number }>> = {};
    for (const key of metricKeys) {
      result[key] = computeMetric(key, periodData);
    }

    return NextResponse.json({ metrics: result, periods: Object.keys(periodData).sort() });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
