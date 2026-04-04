import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { buildPnL, buildSemanticPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import type { NormalisedFinancial, ChartOfAccount, AccountMapping } from '@/types';
import { IncomeStatementClient } from './income-statement-client';

export default async function IncomeStatementPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();
  const untypedDb = await createUntypedServiceClient();

  // Fetch connection, financials, accounts, and mappings in parallel
  const [xeroConnResult, financialsResult, accountsResult, mappingsResult] = await Promise.all([
    supabase
      .from('xero_connections')
      .select('id')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('normalised_financials')
      .select('*')
      .eq('org_id', orgId)
      .order('period', { ascending: false }),
    supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('org_id', orgId),
    untypedDb
      .from('account_mappings')
      .select('*')
      .eq('org_id', orgId),
  ]);

  // Fetch last sync timestamp for DataFreshness
  const syncResult = await supabase
    .from('sync_log')
    .select('completed_at')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastSyncAt = syncResult.data?.completed_at ?? null;

  const finData = (financialsResult.data ?? []) as NormalisedFinancial[];
  const accData = (accountsResult.data ?? []) as ChartOfAccount[];
  const mappings = (mappingsResult.data ?? []) as AccountMapping[];
  const periods = getAvailablePeriods(finData);
  const connected = !!xeroConnResult.data;

  // Use semantic P&L when we have mappings, otherwise fall back to class-based
  const hasMappings = mappings.length > 0;

  const pnlByPeriod = periods.map((p) => {
    if (hasMappings) {
      // Semantic P&L: accounts grouped by StandardCategory within taxonomy sections
      const spnl = buildSemanticPnL(finData, accData, mappings, p);
      return {
        period: p,
        sections: spnl.sections
          .filter((s) => s.section !== 'balance_sheet')
          .map((s) => {
            const isCostSection = ['cost_of_sales', 'operating_expenses', 'tax'].includes(s.section);
            // Group rows by category for sub-headings
            const categoryGroups = new Map<string, { label: string; rows: Array<{ name: string; code: string; amount: number; category: string }> }>();
            for (const row of s.rows) {
              const key = row.standardCategory;
              if (!categoryGroups.has(key)) {
                categoryGroups.set(key, { label: row.categoryLabel, rows: [] });
              }
              categoryGroups.get(key)!.rows.push({
                name: row.accountName,
                code: row.accountCode,
                amount: isCostSection ? Math.abs(row.amount) : row.amount,
                category: row.categoryLabel,
              });
            }
            return {
              label: s.label,
              class: s.section.toUpperCase(),
              total: isCostSection ? Math.abs(s.total) : s.total,
              rows: s.rows.map((r) => ({
                name: r.accountName,
                code: r.accountCode,
                amount: isCostSection ? Math.abs(r.amount) : r.amount,
                category: r.categoryLabel,
              })),
            };
          }),
        revenue: spnl.revenue,
        costOfSales: spnl.costOfSales,
        grossProfit: spnl.grossProfit,
        expenses: spnl.operatingExpenses,
        netProfit: spnl.netProfit,
        mappingCoverage: spnl.mappingCoverage,
      };
    }

    // Fallback: class-based P&L
    const pnl = buildPnL(finData, accData, p);
    return {
      period: p,
      sections: pnl.sections.map((s) => {
        const isCostSection = ['DIRECTCOSTS', 'EXPENSE', 'OVERHEADS'].includes(s.class);
        return {
          label: s.label,
          class: s.class,
          total: isCostSection ? Math.abs(s.total) : s.total,
          rows: s.rows.map((r) => ({
            name: r.accountName,
            code: r.accountCode,
            amount: isCostSection ? Math.abs(r.amount) : r.amount,
          })),
        };
      }),
      revenue: pnl.revenue,
      costOfSales: pnl.costOfSales,
      grossProfit: pnl.grossProfit,
      expenses: pnl.expenses,
      netProfit: pnl.netProfit,
    };
  });

  return (
    <IncomeStatementClient
      connected={connected}
      periods={pnlByPeriod}
      orgId={orgId}
      lastSyncAt={lastSyncAt}
    />
  );
}
