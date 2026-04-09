import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { buildPnL, buildSemanticPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { fetchFinanceCosts, buildFinanceCostsSection } from '@/lib/financial/finance-costs';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import { adaptMappingsFromDB } from '@/lib/financial/adapt-mappings';
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

  // Fetch finance costs using shared utility (single source of truth)
  const financeCosts = await fetchFinanceCosts(orgId);
  const totalMonthlyInterest = financeCosts.totalMonthlyInterest;
  const debtFacilities = financeCosts.facilities;

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
  const periods = getAvailablePeriods(finData);
  const connected = !!xeroConnResult.data;

  // Adapt migration-014 schema (source_account_code, target_category)
  // to AccountMapping interface (account_id, standard_category) for buildSemanticPnL
  const rawMappings = (mappingsResult.data ?? []) as Array<Record<string, unknown>>;
  const mappings = adaptMappingsFromDB(rawMappings, accData, orgId);

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
            const categoryGroups = new Map<string, { label: string; key: string; rows: Array<{ id?: string; name: string; code: string; amount: number; category: string }> }>();
            for (const row of s.rows) {
              const key = row.standardCategory;
              if (!categoryGroups.has(key)) {
                categoryGroups.set(key, { label: row.categoryLabel, key, rows: [] });
              }
              categoryGroups.get(key)!.rows.push({
                id: row.accountId,
                name: row.accountName,
                code: row.accountCode,
                amount: isCostSection ? Math.abs(row.amount) : row.amount,
                category: row.categoryLabel,
              });
            }

            // Build sub-categories array from the grouped data
            const subCategories = Array.from(categoryGroups.values()).map((group) => ({
              label: group.label,
              key: group.key,
              rows: group.rows,
              total: group.rows.reduce((sum, r) => sum + r.amount, 0),
            }));

            return {
              label: s.label,
              class: s.section.toUpperCase(),
              total: isCostSection ? Math.abs(s.total) : s.total,
              rows: s.rows.map((r) => ({
                id: r.accountId,
                name: r.accountName,
                code: r.accountCode,
                amount: isCostSection ? Math.abs(r.amount) : r.amount,
                category: r.categoryLabel,
              })),
              // Pass sub-category groupings to client for management-account-style display
              subCategories: subCategories.length > 1 ? subCategories : undefined,
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
            id: r.accountId,
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

  // Inject Finance Costs section from debt facilities into each period
  // Interest costs are NOT in normalised_financials (they appear only on bank
  // transactions which are excluded to prevent double-counting — see Lesson 10).
  // Instead we derive monthly interest from debt_facilities.annual_interest_amount.
  const pnlWithFinanceCosts = pnlByPeriod.map((period) => {
    if (totalMonthlyInterest <= 0) return period;

    const financeCostsSection = {
      label: 'Finance Costs',
      class: 'FINANCE_COSTS',
      total: totalMonthlyInterest,
      rows: debtFacilities
        .filter((d) => d.annual_interest_amount && d.annual_interest_amount > 0)
        .map((d) => ({
          id: undefined as string | undefined,
          name: `${d.name} - Interest`,
          code: 'DEBT',
          amount: (d.annual_interest_amount ?? 0) / 12,
        })),
    };

    return {
      ...period,
      sections: [...period.sections, financeCostsSection],
      financeCosts: totalMonthlyInterest,
      netProfit: period.netProfit - totalMonthlyInterest,
    };
  });

  return (
    <IncomeStatementClient
      connected={connected}
      periods={pnlWithFinanceCosts}
      orgId={orgId}
      lastSyncAt={lastSyncAt}
    />
  );
}
