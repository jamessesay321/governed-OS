import { createUntypedServiceClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications/notify';
import { logAudit } from '@/lib/audit/log';

interface VarianceResult {
  accountCode: string;
  accountName: string;
  period: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePct: number;
}

/**
 * Check budget vs actuals for an org and fire notifications for significant variances.
 * Called after Xero sync or on-demand.
 *
 * @param orgId - Organisation ID
 * @param userId - User ID to receive notifications
 * @param thresholdPct - Minimum variance percentage to trigger alert (default 15%)
 */
export async function checkBudgetVariances(
  orgId: string,
  userId: string,
  thresholdPct = 15
): Promise<VarianceResult[]> {
  const supabase = await createUntypedServiceClient();

  // Get the most recent period from normalised_financials
  const { data: periods } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId)
    .order('period', { ascending: false })
    .limit(1);

  if (!periods || periods.length === 0) return [];
  const currentPeriod = periods[0].period as string;

  // Fetch budget lines for this period
  const { data: budgetLines } = await supabase
    .from('budget_lines')
    .select('account_code, account_name, budgeted_amount')
    .eq('org_id', orgId)
    .eq('period', currentPeriod);

  if (!budgetLines || budgetLines.length === 0) return [];

  // Fetch actual amounts for this period
  const { data: actuals } = await supabase
    .from('normalised_financials')
    .select('account_code, amount')
    .eq('org_id', orgId)
    .eq('period', currentPeriod);

  if (!actuals) return [];

  // Build actuals lookup
  const actualsByCode = new Map<string, number>();
  for (const row of actuals) {
    const code = row.account_code as string;
    const amount = Number(row.amount) || 0;
    actualsByCode.set(code, (actualsByCode.get(code) ?? 0) + amount);
  }

  // Compare budget vs actual
  const significantVariances: VarianceResult[] = [];

  for (const line of budgetLines) {
    const code = line.account_code as string;
    const budgeted = Number(line.budgeted_amount) || 0;
    const actual = actualsByCode.get(code) ?? 0;

    if (budgeted === 0) continue;

    const variance = actual - budgeted;
    const variancePct = (variance / Math.abs(budgeted)) * 100;

    if (Math.abs(variancePct) >= thresholdPct) {
      significantVariances.push({
        accountCode: code,
        accountName: line.account_name as string,
        period: currentPeriod,
        budgeted,
        actual,
        variance,
        variancePct,
      });
    }
  }

  // Fire notification if there are significant variances
  if (significantVariances.length > 0) {
    const top3 = significantVariances
      .sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct))
      .slice(0, 3);

    const body = top3
      .map(
        (v) =>
          `${v.accountName}: ${v.variancePct > 0 ? '+' : ''}${v.variancePct.toFixed(0)}% (${v.variance > 0 ? 'over' : 'under'} budget)`
      )
      .join('; ');

    await createNotification({
      userId,
      orgId,
      type: 'intelligence',
      title: `${significantVariances.length} budget variance${significantVariances.length === 1 ? '' : 's'} detected`,
      body,
      actionUrl: '/variance',
    }).catch(() => {});

    await logAudit({
      orgId,
      userId,
      action: 'budget.variance_alert',
      entityType: 'budget_variance',
      entityId: currentPeriod,
      metadata: {
        count: significantVariances.length,
        threshold: thresholdPct,
        topVariances: top3.map((v) => ({
          account: v.accountCode,
          pct: v.variancePct.toFixed(1),
        })),
      },
    }).catch(() => {});
  }

  return significantVariances;
}
