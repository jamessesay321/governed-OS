import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { buildPnL, buildSemanticPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { fetchFinanceCosts, adjustNetProfitForFinanceCosts } from '@/lib/financial/finance-costs';
import {
  checkVATRegistration,
  calculateFilingDeadlines,
} from '@/lib/compliance/uk-company-classification';
import { adaptMappingsFromDB } from '@/lib/financial/adapt-mappings';
import { ExecutiveSummaryClient } from './executive-summary-client';

export default async function ExecutiveSummaryPage() {
  const { orgId, role, displayName } = await getUserProfile();
  const supabase = await createClient();
  const svc = await createUntypedServiceClient();

  // Parallel fetches
  const [financialsResult, accountsResult, xeroResult, syncResult, profileResult, mappingsResult, bsResult] =
    await Promise.all([
      supabase.from('normalised_financials').select('*').eq('org_id', orgId),
      supabase.from('chart_of_accounts').select('*').eq('org_id', orgId),
      supabase
        .from('xero_connections')
        .select('id, status')
        .eq('org_id', orgId)
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('sync_log')
        .select('started_at, completed_at, status')
        .eq('org_id', orgId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('organisations' as any)
        .select('industry, description, name, company_number, year_end_date, last_confirmation_statement_date')
        .eq('id', orgId)
        .single(),
      svc.from('account_mappings').select('*').eq('org_id', orgId),
      // Balance sheet data for cash position
      supabase
        .from('normalised_financials')
        .select('*, chart_of_accounts!inner(code, name, type, class)')
        .eq('org_id', orgId)
        .order('period', { ascending: false }),
    ]);

  const financials = financialsResult.data ?? [];
  const accounts = accountsResult.data ?? [];
  const mappings = adaptMappingsFromDB(
    (mappingsResult.data ?? []) as Array<Record<string, unknown>>,
    (accounts ?? []) as import('@/types').ChartOfAccount[],
    orgId
  );
  const connected = !!xeroResult.data;
  const lastSyncAt = syncResult.data?.completed_at ?? null;
  const orgData = profileResult.data as Record<string, unknown> | null;
  const orgName = (orgData?.name as string) ?? '';
  const industry = (orgData?.industry as string) ?? '';

  // ── Compliance data (best-effort) ──────────────────────────────
  const companyNumber = (orgData?.company_number as string) ?? '';
  const yearEndStr = orgData?.year_end_date as string | undefined;
  const confirmStr = orgData?.last_confirmation_statement_date as string | undefined;

  type ComplianceAlert = { label: string; status: 'ok' | 'warning' | 'critical'; detail: string };
  const complianceAlerts: ComplianceAlert[] = [];

  // Filing deadlines
  if (yearEndStr && confirmStr) {
    try {
      const deadlines = calculateFilingDeadlines({
        yearEndDate: new Date(yearEndStr),
        lastConfirmationStatementDate: new Date(confirmStr),
      });
      if (deadlines.isOverdue.accounts) {
        complianceAlerts.push({ label: 'Annual Accounts', status: 'critical', detail: `Overdue since ${deadlines.accountsDeadline.toLocaleDateString('en-GB')}` });
      } else if (deadlines.daysUntil.accounts <= 90) {
        complianceAlerts.push({ label: 'Annual Accounts', status: 'warning', detail: `Due in ${deadlines.daysUntil.accounts} days` });
      }
      if (deadlines.isOverdue.confirmationStatement) {
        complianceAlerts.push({ label: 'Confirmation Statement', status: 'critical', detail: `Overdue since ${deadlines.confirmationStatementDeadline.toLocaleDateString('en-GB')}` });
      } else if (deadlines.daysUntil.confirmationStatement <= 90) {
        complianceAlerts.push({ label: 'Confirmation Statement', status: 'warning', detail: `Due in ${deadlines.daysUntil.confirmationStatement} days` });
      }
      if (deadlines.isOverdue.corporationTaxPayment) {
        complianceAlerts.push({ label: 'CT Payment', status: 'critical', detail: 'Overdue' });
      } else if (deadlines.daysUntil.corporationTaxPayment <= 90) {
        complianceAlerts.push({ label: 'CT Payment', status: 'warning', detail: `Due in ${deadlines.daysUntil.corporationTaxPayment} days` });
      }
    } catch {
      // Non-critical
    }
  }

  const periods = getAvailablePeriods(financials);

  if (periods.length === 0) {
    return (
      <ExecutiveSummaryClient
        orgId={orgId}
        orgName={orgName}
        displayName={displayName}
        industry={industry}
        connected={connected}
        lastSyncAt={lastSyncAt}
        hasData={false}
        periods={[]}
        pnlByPeriod={{}}
        cashPosition={0}
        totalAssets={0}
        totalLiabilities={0}
        companyNumber={companyNumber}
        complianceAlerts={complianceAlerts}
      />
    );
  }

  // Fetch finance costs from debt facilities — ensures profit figures include interest
  const financeCosts = await fetchFinanceCosts(orgId);

  // Build P&L for all periods
  const hasMappings = mappings.length > 0;
  const pnlByPeriod: Record<string, {
    revenue: number;
    costOfSales: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    financeCosts: number;
  }> = {};

  for (const period of periods) {
    if (hasMappings) {
      const spnl = buildSemanticPnL(financials, accounts, mappings, period);
      pnlByPeriod[period] = {
        revenue: spnl.revenue,
        costOfSales: spnl.costOfSales,
        grossProfit: spnl.grossProfit,
        expenses: spnl.operatingExpenses,
        netProfit: adjustNetProfitForFinanceCosts(spnl.netProfit, financeCosts),
        financeCosts: financeCosts.totalMonthlyInterest,
      };
    } else {
      const pnl = buildPnL(financials, accounts, period);
      pnlByPeriod[period] = {
        revenue: pnl.revenue,
        costOfSales: pnl.costOfSales,
        grossProfit: pnl.grossProfit,
        expenses: pnl.expenses,
        netProfit: adjustNetProfitForFinanceCosts(pnl.netProfit, financeCosts),
        financeCosts: financeCosts.totalMonthlyInterest,
      };
    }
  }

  // Extract cash position from latest BS data
  const latestPeriod = periods[0];
  const bsData = bsResult.data ?? [];
  const latestBsRows = bsData.filter((f: Record<string, unknown>) => f.period === latestPeriod);
  let cashPosition = 0;
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const fin of latestBsRows) {
    const account = fin.chart_of_accounts as { code: string; name: string; type: string; class: string };
    const cls = account.class.toUpperCase();
    const amount = Number(fin.amount);
    const type = account.type.toUpperCase();

    if (cls === 'ASSET') {
      totalAssets += amount;
      if (type === 'BANK' || type === 'CASH' || account.name.toLowerCase().includes('bank') || account.name.toLowerCase().includes('cash')) {
        cashPosition += amount;
      }
    } else if (cls === 'LIABILITY') {
      totalLiabilities += amount;
    }
  }

  // VAT threshold check based on latest period revenue (annualised)
  const latestRevenue = pnlByPeriod[latestPeriod]?.revenue ?? 0;
  const annualisedRevenue = latestRevenue * 12;
  if (annualisedRevenue > 0) {
    const vatCheck = checkVATRegistration(annualisedRevenue);
    if (vatCheck.mustRegister) {
      complianceAlerts.push({ label: 'VAT Registration', status: 'critical', detail: 'Revenue exceeds £90,000 threshold — registration mandatory' });
    } else if (annualisedRevenue >= 75_000) {
      complianceAlerts.push({ label: 'VAT Threshold', status: 'warning', detail: `Annualised revenue £${Math.round(annualisedRevenue).toLocaleString()} — approaching £90k threshold` });
    }
  }

  return (
    <ExecutiveSummaryClient
      orgId={orgId}
      orgName={orgName}
      displayName={displayName}
      industry={industry}
      connected={connected}
      lastSyncAt={lastSyncAt}
      hasData={true}
      periods={periods}
      pnlByPeriod={pnlByPeriod}
      cashPosition={cashPosition}
      totalAssets={totalAssets}
      totalLiabilities={totalLiabilities}
      companyNumber={companyNumber}
      complianceAlerts={complianceAlerts}
    />
  );
}
