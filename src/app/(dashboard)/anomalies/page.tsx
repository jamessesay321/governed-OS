import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { AnomaliesClient } from './anomalies-client';

// ── Types ──

export interface Anomaly {
  accountId: string;
  accountName: string;
  accountCode: string;
  period: string;
  label: string;
  amount: number;
  median: number;
  zScore: number;
  severity: 'critical' | 'warning' | 'info';
  direction: 'high' | 'low' | 'zero';
}

// ── Helpers ──

function monthLabel(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeMAD(values: number[], median: number): number {
  if (values.length === 0) return 0;
  const deviations = values.map((v) => Math.abs(v - median));
  return computeMedian(deviations);
}

// ── Page ──

export default async function AnomaliesPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // Fetch chart of accounts for ALL classes
  const { data: coaData } = await supabase
    .from('chart_of_accounts')
    .select('id, name, code, class')
    .eq('org_id', orgId);

  const accounts = (coaData ?? []) as unknown as Array<{
    id: string;
    name: string;
    code: string;
    class: string;
  }>;

  const accountIds = accounts.map((a) => a.id);
  if (accountIds.length === 0) {
    return (
      <AnomaliesClient
        anomalies={[]}
        totalAccountsScanned={0}
        allDataPoints={[]}
        monthlyAnomalyCounts={[]}
      />
    );
  }

  // Fetch all normalised_financials joined with chart_of_accounts
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .in('account_id', accountIds)
    .order('period', { ascending: true });

  const rows = (financials ?? []) as unknown as Array<{
    period: string;
    amount: number;
    account_id: string;
  }>;

  // Determine the last 12 months of data
  const allPeriods = Array.from(new Set(rows.map((r) => r.period))).sort();
  const last12Periods = allPeriods.slice(-12);
  const last12Set = new Set(last12Periods);

  // Build account map
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  // Aggregate: account_id -> period -> total amount
  const accountPeriodAmounts = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (!accountPeriodAmounts.has(row.account_id)) {
      accountPeriodAmounts.set(row.account_id, new Map());
    }
    const periodMap = accountPeriodAmounts.get(row.account_id)!;
    periodMap.set(
      row.period,
      (periodMap.get(row.period) ?? 0) + Number(row.amount),
    );
  }

  // Detect anomalies
  const anomalies: Anomaly[] = [];
  const allDataPoints: Array<{
    accountName: string;
    period: string;
    label: string;
    amount: number;
    isAnomaly: boolean;
  }> = [];
  let totalAccountsScanned = 0;

  for (const [accountId, periodMap] of accountPeriodAmounts.entries()) {
    const acct = accountMap.get(accountId);
    if (!acct) continue;

    // Use ALL periods for statistical calculation (not just last 12)
    const allValues = Array.from(periodMap.values());
    if (allValues.length < 3) continue; // need at least 3 data points for stats

    totalAccountsScanned++;

    const median = computeMedian(allValues);
    const mad = computeMAD(allValues, median);

    // Count non-zero periods to detect missing data
    const nonZeroCount = allValues.filter((v) => v !== 0).length;
    const usuallyActive = nonZeroCount / allValues.length > 0.5;

    // Only flag anomalies in the last 12 months
    for (const period of last12Periods) {
      const amount = periodMap.get(period);
      if (amount === undefined) continue;

      const periodLabel = monthLabel(period);

      // Collect data point for scatter plot
      allDataPoints.push({
        accountName: acct.name,
        period,
        label: periodLabel,
        amount,
        isAnomaly: false, // will be updated below
      });

      // Check for zero when usually active (possible missing data)
      if (amount === 0 && usuallyActive) {
        anomalies.push({
          accountId,
          accountName: acct.name,
          accountCode: acct.code,
          period,
          label: periodLabel,
          amount,
          median,
          zScore: 0,
          severity: 'warning',
          direction: 'zero',
        });

        // Mark data point as anomaly
        const dp = allDataPoints[allDataPoints.length - 1];
        dp.isAnomaly = true;
        continue;
      }

      // Robust z-score: z = 0.6745 * (value - median) / MAD
      if (mad === 0) continue; // all values identical, no anomaly possible
      const zScore = (0.6745 * (amount - median)) / mad;
      const absZ = Math.abs(zScore);

      if (absZ > 3) {
        const severity: Anomaly['severity'] = absZ > 5 ? 'critical' : 'warning';
        const direction: Anomaly['direction'] = zScore > 0 ? 'high' : 'low';

        anomalies.push({
          accountId,
          accountName: acct.name,
          accountCode: acct.code,
          period,
          label: periodLabel,
          amount,
          median,
          zScore: Math.round(zScore * 100) / 100,
          severity,
          direction,
        });

        // Mark data point as anomaly
        const dp = allDataPoints[allDataPoints.length - 1];
        dp.isAnomaly = true;
      }
    }
  }

  // Sort anomalies by severity (highest |z-score| first, zeros at the end)
  anomalies.sort((a, b) => {
    // Critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    // Within same severity, higher |z-score| first
    return Math.abs(b.zScore) - Math.abs(a.zScore);
  });

  // Build monthly anomaly counts for timeline chart
  const monthCountMap = new Map<string, number>();
  for (const period of last12Periods) {
    monthCountMap.set(period, 0);
  }
  for (const a of anomalies) {
    if (last12Set.has(a.period)) {
      monthCountMap.set(a.period, (monthCountMap.get(a.period) ?? 0) + 1);
    }
  }
  const monthlyAnomalyCounts = last12Periods.map((period) => ({
    period,
    label: monthLabel(period),
    count: monthCountMap.get(period) ?? 0,
  }));

  // Compute global stats for scatter plot band
  const allAmounts = allDataPoints.map((d) => d.amount);
  const globalMedian = computeMedian(allAmounts);
  const globalMAD = computeMAD(allAmounts, globalMedian);
  const bandUpper = globalMedian + (3 * globalMAD) / 0.6745;
  const bandLower = globalMedian - (3 * globalMAD) / 0.6745;

  return (
    <AnomaliesClient
      anomalies={anomalies}
      totalAccountsScanned={totalAccountsScanned}
      allDataPoints={allDataPoints}
      monthlyAnomalyCounts={monthlyAnomalyCounts}
      scatterBand={{ median: globalMedian, upper: bandUpper, lower: bandLower }}
    />
  );
}
