import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import { formatCurrencyCompact } from '@/lib/formatting/currency';
import { AnomaliesClient } from './anomalies-client';

export type AnomalyCategory = 'revenue' | 'expense' | 'cost_of_sales' | 'payroll' | 'tax' | 'new_activity' | 'general';

export interface Anomaly {
  title: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
  impact: string;
  accountName: string;
  changePercent: number;
  category: AnomalyCategory;
  direction: 'up' | 'down' | 'new';
}

export default async function AnomaliesPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId);

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  const fin = (financials ?? []) as NormalisedFinancial[];
  const accts = (accounts ?? []) as ChartOfAccount[];

  if (fin.length === 0 || accts.length === 0) {
    return <AnomaliesClient anomalies={[]} hasData={false} />;
  }

  const periods = getAvailablePeriods(fin);

  if (periods.length < 2) {
    return <AnomaliesClient anomalies={[]} hasData={true} />;
  }

  const latestPeriod = periods[0];
  const priorPeriod = periods[1];

  const accountMap = new Map(accts.map((a) => [a.id, a]));

  // Group amounts by account for latest and prior periods
  const latestByAccount = new Map<string, number>();
  const priorByAccount = new Map<string, number>();

  for (const f of fin) {
    if (f.period === latestPeriod) {
      latestByAccount.set(f.account_id, (latestByAccount.get(f.account_id) ?? 0) + Number(f.amount));
    } else if (f.period === priorPeriod) {
      priorByAccount.set(f.account_id, (priorByAccount.get(f.account_id) ?? 0) + Number(f.amount));
    }
  }

  const anomalies: Anomaly[] = [];

  function inferCategory(acc: ChartOfAccount): AnomalyCategory {
    const name = acc.name.toLowerCase();
    const type = (acc.type ?? '').toLowerCase();
    if (type === 'revenue' || name.includes('revenue') || name.includes('sales') || name.includes('income')) return 'revenue';
    if (name.includes('salary') || name.includes('wage') || name.includes('payroll') || name.includes('staff')) return 'payroll';
    if (name.includes('tax') || name.includes('vat') || name.includes('paye') || name.includes('corporation')) return 'tax';
    if (type === 'direct costs' || name.includes('cost of') || name.includes('cogs') || name.includes('direct')) return 'cost_of_sales';
    if (type === 'expense' || name.includes('expense') || name.includes('overhead') || name.includes('rent') || name.includes('utility')) return 'expense';
    return 'general';
  }

  // Compare each account between latest and prior period
  const allAccountIds = new Set([...latestByAccount.keys(), ...priorByAccount.keys()]);

  for (const accountId of allAccountIds) {
    const latest = latestByAccount.get(accountId) ?? 0;
    const prior = priorByAccount.get(accountId) ?? 0;
    const acc = accountMap.get(accountId);

    if (!acc) continue;

    // Skip if both are zero or prior is zero (can't compute % change)
    if (prior === 0 && latest === 0) continue;
    if (prior === 0) {
      // New account with activity - flag if significant
      if (Math.abs(latest) > 100) {
        anomalies.push({
          title: `New activity in ${acc.name}`,
          detail: `${acc.name} had no activity in ${priorPeriod} but shows activity of ${formatAmount(latest)} in ${latestPeriod}. This is a new account entry worth reviewing.`,
          severity: 'medium',
          impact: formatAmount(latest),
          accountName: acc.name,
          changePercent: 100,
          category: 'new_activity',
          direction: 'new',
        });
      }
      continue;
    }

    const change = ((latest - prior) / Math.abs(prior)) * 100;
    const absChange = Math.abs(change);

    if (absChange > 50) {
      const direction = change > 0 ? 'increased' : 'decreased';
      const severity: Anomaly['severity'] = absChange > 100 ? 'high' : absChange > 75 ? 'medium' : 'low';

      anomalies.push({
        title: `${acc.name} ${direction} ${absChange.toFixed(0)}%`,
        detail: `${acc.name} ${direction} from ${formatAmount(prior)} in ${priorPeriod} to ${formatAmount(latest)} in ${latestPeriod}. This ${absChange > 100 ? 'significant' : 'notable'} change may warrant investigation.`,
        severity,
        impact: formatAmount(latest - prior),
        accountName: acc.name,
        changePercent: change,
        category: inferCategory(acc),
        direction: change > 0 ? 'up' : 'down',
      });
    }
  }

  // Sort by severity (high first) then by absolute change
  anomalies.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const sDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sDiff !== 0) return sDiff;
    return Math.abs(b.changePercent) - Math.abs(a.changePercent);
  });

  // Limit to top 10 anomalies
  const topAnomalies = anomalies.slice(0, 10);

  return <AnomaliesClient anomalies={topAnomalies} hasData={true} />;
}

function formatAmount(amount: number): string {
  return formatCurrencyCompact(amount);
}
