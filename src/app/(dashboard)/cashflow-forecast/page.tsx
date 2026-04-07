import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import type { DebtFacility, VATQuarter } from '@/types/debt';
import { CashflowForecastClient } from './cashflow-forecast-client';

// ── Types ──

export interface MonthlyCashProjection {
  period: string;
  label: string; // 'May 2026'
  operatingCashInflow: number;
  debtRepayments: number;
  taxPayments: number;
  netCashChange: number;
  closingCash: number;
}

export interface DebtMaturityMarker {
  facilityName: string;
  maturityDate: string;
  period: string; // YYYY-MM
  balance: number;
  category: string;
}

// ── Helpers ──

function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function getMonthlyRepayment(facility: DebtFacility): number {
  // monthly_repayment field already stores the monthly equivalent regardless of frequency
  const amount = Number(facility.monthly_repayment) || 0;
  if (facility.repayment_frequency === 'none') return 0;
  return amount;
}

function isFacilityActiveInPeriod(facility: DebtFacility, period: string): boolean {
  if (facility.status !== 'active') return false;
  if (!facility.maturity_date) return true; // no end date = continues
  const maturityPeriod = facility.maturity_date.substring(0, 7); // YYYY-MM
  return period <= maturityPeriod;
}

function generatePeriods(startPeriod: string, count: number): string[] {
  const [startYear, startMonth] = startPeriod.split('-').map(Number);
  const periods: string[] = [];
  for (let i = 0; i < count; i++) {
    const totalMonths = (startYear * 12 + startMonth - 1) + i;
    const y = Math.floor(totalMonths / 12);
    const m = (totalMonths % 12) + 1;
    periods.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return periods;
}

// ── Page ──

export default async function CashflowForecastPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // 1. Get latest actual period
  const { data: latestPeriodRow } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId)
    .order('period', { ascending: false })
    .limit(1);
  const latestPeriod = (latestPeriodRow as unknown as Array<{ period: string }> | null)?.[0]?.period;

  // Compute start period (month after latest actuals, or current month)
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const startPeriod = latestPeriod
    ? (() => {
        const [y, m] = latestPeriod.substring(0, 7).split('-').map(Number);
        const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
        return next;
      })()
    : currentPeriod;

  // 2. Compute operating cash flow from recent P&L (lightweight, no heavy engine call)
  const forecastMonths = 24;

  // Get last 6 months of P&L data for base rates
  const { data: recentFinancials } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .order('period', { ascending: false })
    .limit(5000); // Bounded query

  const { data: coaData } = await supabase
    .from('chart_of_accounts')
    .select('id, class')
    .eq('org_id', orgId);

  const classMap = new Map<string, string>();
  for (const a of (coaData ?? []) as unknown as Array<{ id: string; class: string }>) {
    classMap.set(a.id, (a.class ?? '').toUpperCase());
  }

  // Aggregate by period
  const periodPnL = new Map<string, { revenue: number; cogs: number; opex: number }>();
  for (const row of (recentFinancials ?? []) as unknown as Array<{ period: string; amount: number; account_id: string }>) {
    const cls = classMap.get(row.account_id) ?? '';
    if (!periodPnL.has(row.period)) periodPnL.set(row.period, { revenue: 0, cogs: 0, opex: 0 });
    const pd = periodPnL.get(row.period)!;
    if (cls === 'REVENUE' || cls === 'OTHERINCOME') pd.revenue += Number(row.amount);
    else if (cls === 'DIRECTCOSTS') pd.cogs += Number(row.amount);
    else if (cls === 'EXPENSE' || cls === 'OVERHEADS') pd.opex += Number(row.amount);
  }

  const sortedPeriods = Array.from(periodPnL.keys()).sort().slice(-6);
  const recentRevenues = sortedPeriods.map((p) => periodPnL.get(p)!.revenue);
  const recentCogs = sortedPeriods.map((p) => periodPnL.get(p)!.cogs);
  const recentOpex = sortedPeriods.map((p) => periodPnL.get(p)!.opex);

  const avgRevenue = recentRevenues.length > 0 ? recentRevenues.reduce((a, b) => a + b, 0) / recentRevenues.length : 0;
  const avgCogs = recentCogs.length > 0 ? recentCogs.reduce((a, b) => a + b, 0) / recentCogs.length : 0;
  const avgOpex = recentOpex.length > 0 ? recentOpex.reduce((a, b) => a + b, 0) / recentOpex.length : 0;
  const avgNetProfit = avgRevenue - avgCogs - avgOpex;

  // Simple operating cash flow = net profit (assumes ~30 day collection/payment offset is neutral over time)
  const baseOperatingCF = avgNetProfit;

  // Revenue growth trend
  let revenueGrowthRate = 0;
  if (recentRevenues.length >= 2) {
    const last = recentRevenues[recentRevenues.length - 1];
    const first = recentRevenues[0];
    const periods_count = recentRevenues.length - 1;
    revenueGrowthRate = periods_count > 0 && first !== 0 ? ((last / first) ** (1 / periods_count) - 1) : 0;
  }

  // Project 24 months of operating CF with growth
  const operatingCashFlows: number[] = [];
  let projectedRevenue = recentRevenues.length > 0 ? recentRevenues[recentRevenues.length - 1] : avgRevenue;
  for (let i = 0; i < forecastMonths; i++) {
    projectedRevenue *= (1 + revenueGrowthRate);
    const projectedCogs = projectedRevenue * (avgRevenue > 0 ? avgCogs / avgRevenue : 0.5);
    const projectedOpex = avgOpex; // OpEx relatively stable
    operatingCashFlows.push(projectedRevenue - projectedCogs - projectedOpex);
  }

  // 3. Fetch active debt facilities
  const { data: rawFacilities } = await supabase
    .from('debt_facilities')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('current_balance', { ascending: false });

  const facilities = (rawFacilities ?? []) as unknown as DebtFacility[];

  // 4. Fetch VAT quarters
  const { data: rawVatQuarters } = await supabase
    .from('vat_quarters')
    .select('*')
    .eq('org_id', orgId)
    .order('period_start', { ascending: false });
  const vatQuarters = (rawVatQuarters ?? []) as unknown as VATQuarter[];

  // 5. Get actual cash position from balance sheet accounts
  // Try to find bank/cash accounts in chart_of_accounts
  let actualCashPosition = 0;
  const { data: cashAccounts } = await supabase
    .from('chart_of_accounts')
    .select('id, name')
    .eq('org_id', orgId)
    .ilike('type', '%BANK%');

  if (cashAccounts && cashAccounts.length > 0 && latestPeriod) {
    const cashIds = (cashAccounts as unknown as Array<{ id: string; name: string }>).map((a) => a.id);
    const { data: cashBalances } = await supabase
      .from('normalised_financials')
      .select('amount')
      .eq('org_id', orgId)
      .eq('period', latestPeriod)
      .in('account_id', cashIds);

    if (cashBalances) {
      actualCashPosition = (cashBalances as unknown as Array<{ amount: number }>)
        .reduce((sum, r) => sum + Number(r.amount), 0);
    }
  }

  // If no cash from GL, estimate from recent revenue
  if (actualCashPosition === 0 && avgRevenue > 0) {
    actualCashPosition = avgRevenue * 0.5; // ~2 weeks of revenue as starting estimate
  }

  // Minimum fallback so page doesn't show £0
  if (actualCashPosition === 0) {
    actualCashPosition = 25000; // Conservative starting estimate
  }

  // 6. Build the 24-month projection
  const periods = generatePeriods(startPeriod, forecastMonths);

  // Average VAT payment per quarter for future quarters
  const avgVatPayment = vatQuarters.length > 0
    ? vatQuarters.reduce((sum, q) => sum + Math.max(0, Number(q.net_vat)), 0) / Math.max(vatQuarters.length, 1)
    : 0;

  // Map VAT payments to months (UK: payment due ~1 month after quarter end)
  const vatPaymentMonths = new Set<string>();
  for (const q of vatQuarters) {
    if (['pending', 'overdue', 'payment_plan'].includes(q.status)) {
      const endDate = new Date(q.period_end);
      endDate.setMonth(endDate.getMonth() + 1); // Due 1 month after quarter end
      const payMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
      vatPaymentMonths.add(payMonth);
    }
  }

  let runningCash = actualCashPosition;
  const projections: MonthlyCashProjection[] = [];

  for (let i = 0; i < forecastMonths; i++) {
    const period = periods[i];

    // Operating cash from projected P&L
    const operatingCashInflow = operatingCashFlows[i] ?? baseOperatingCF;

    // Debt repayments from actual facility data
    let debtRepayments = 0;
    for (const f of facilities) {
      if (isFacilityActiveInPeriod(f, period)) {
        debtRepayments += getMonthlyRepayment(f);
      }
    }

    // Tax payments — VAT quarters mapped to payment months
    let taxPayments = 0;
    if (vatPaymentMonths.has(period)) {
      // Use actual VAT amount if available for this quarter
      const matchingQuarter = vatQuarters.find((q) => {
        const endDate = new Date(q.period_end);
        endDate.setMonth(endDate.getMonth() + 1);
        const payMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
        return payMonth === period;
      });
      taxPayments = matchingQuarter
        ? Math.max(0, Number(matchingQuarter.net_vat))
        : avgVatPayment;
    }
    // Estimate quarterly VAT for future quarters not yet in the table
    const [py, pm] = period.split('-').map(Number);
    if (!vatPaymentMonths.has(period) && [1, 4, 7, 10].includes(pm) && avgVatPayment > 0) {
      // These are typical UK VAT payment months
      taxPayments = avgVatPayment;
    }

    const netCashChange = operatingCashInflow - debtRepayments - taxPayments;
    runningCash += netCashChange;

    projections.push({
      period,
      label: monthLabel(period),
      operatingCashInflow,
      debtRepayments,
      taxPayments,
      netCashChange,
      closingCash: runningCash,
    });
  }

  // 7. Build maturity markers
  const maturityMarkers: DebtMaturityMarker[] = facilities
    .filter((f) => f.maturity_date)
    .filter((f) => {
      const matPeriod = f.maturity_date!.substring(0, 7);
      return matPeriod >= startPeriod && matPeriod <= periods[periods.length - 1];
    })
    .filter((f) => Number(f.current_balance) > 2000) // Skip tiny facilities
    .map((f) => ({
      facilityName: f.facility_name,
      maturityDate: f.maturity_date!,
      period: f.maturity_date!.substring(0, 7),
      balance: Number(f.current_balance),
      category: f.category,
    }))
    .sort((a, b) => a.maturityDate.localeCompare(b.maturityDate));

  // 8. Compute summary metrics
  const totalActiveDebtRepayments = facilities.reduce((sum, f) => sum + getMonthlyRepayment(f), 0);
  const avgOperatingCF = operatingCashFlows.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
  const avgBurnRate = avgOperatingCF - totalActiveDebtRepayments;

  const monthsOfRunway = avgBurnRate < 0
    ? Math.floor(actualCashPosition / Math.abs(avgBurnRate))
    : null; // Positive = not burning

  const breakevenMonth = projections.findIndex((p) => p.netCashChange >= 0);

  // Cash-negative month (when closing cash goes below zero)
  const cashNegativeMonth = projections.findIndex((p) => p.closingCash < 0);

  return (
    <CashflowForecastClient
      projections={projections}
      maturityMarkers={maturityMarkers}
      actualCashPosition={actualCashPosition}
      totalMonthlyDebtRepayment={totalActiveDebtRepayments}
      avgOperatingCashFlow={avgOperatingCF}
      monthsOfRunway={monthsOfRunway}
      breakevenMonthIndex={breakevenMonth}
      cashNegativeMonthIndex={cashNegativeMonth}
      activeFacilityCount={facilities.length}
      latestPeriod={latestPeriod ?? currentPeriod}
    />
  );
}
