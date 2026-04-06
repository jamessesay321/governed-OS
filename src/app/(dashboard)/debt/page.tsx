import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import type { DebtFacility, DebtBalanceHistory, DebtSummary, TaxLiabilityFromBS, VATQuarter } from '@/types/debt';
import { DebtClient } from './debt-client';

// Pattern matching for tax/statutory accounts from the balance sheet
const TAX_PATTERNS: Array<{ pattern: RegExp; type: TaxLiabilityFromBS['type'] }> = [
  { pattern: /paye/i, type: 'paye' },
  { pattern: /\bnic\b|national insurance/i, type: 'nic' },
  { pattern: /\bvat\b/i, type: 'vat' },
  { pattern: /pension/i, type: 'pension' },
  { pattern: /corporation tax|corp\.?\s*tax/i, type: 'corp_tax' },
  { pattern: /tax payable|income tax|hmrc/i, type: 'other_tax' },
];

function classifyTaxAccount(name: string): TaxLiabilityFromBS['type'] | null {
  for (const { pattern, type } of TAX_PATTERNS) {
    if (pattern.test(name)) return type;
  }
  return null;
}

function computeSummary(facilities: DebtFacility[]): DebtSummary {
  const active = facilities.filter((f) => f.status === 'active');

  const total_outstanding = active.reduce((sum, f) => sum + Number(f.current_balance), 0);
  const total_monthly_repayment = active.reduce((sum, f) => sum + Number(f.monthly_repayment), 0);
  const total_annual_cost = total_monthly_repayment * 12;

  // Weighted average rate (by balance)
  let weightedRateSum = 0;
  let rateCount = 0;
  let rateSum = 0;
  let highest_rate = 0;
  let highest_rate_facility = '';

  for (const f of active) {
    const rate = Number(f.effective_apr ?? f.interest_rate ?? 0);
    if (rate > 0) {
      weightedRateSum += rate * Number(f.current_balance);
      rateSum += rate;
      rateCount++;
      if (rate > highest_rate) {
        highest_rate = rate;
        highest_rate_facility = f.facility_name;
      }
    }
  }

  const weighted_average_rate = total_outstanding > 0 ? weightedRateSum / total_outstanding : 0;
  const average_rate = rateCount > 0 ? rateSum / rateCount : 0;

  // Next maturity
  const withMaturity = active
    .filter((f) => f.maturity_date)
    .sort((a, b) => new Date(a.maturity_date!).getTime() - new Date(b.maturity_date!).getTime());
  const next_maturity = withMaturity.length > 0
    ? { facility: withMaturity[0].facility_name, date: withMaturity[0].maturity_date! }
    : null;

  // Next payment
  const withPayment = active
    .filter((f) => f.next_payment_date)
    .sort((a, b) => new Date(a.next_payment_date!).getTime() - new Date(b.next_payment_date!).getTime());
  const next_payment = withPayment.length > 0
    ? { facility: withPayment[0].facility_name, date: withPayment[0].next_payment_date!, amount: Number(withPayment[0].monthly_repayment) }
    : null;

  // By classification
  const good_total = active.filter((f) => f.classification === 'good').reduce((s, f) => s + Number(f.current_balance), 0);
  const okay_total = active.filter((f) => f.classification === 'okay').reduce((s, f) => s + Number(f.current_balance), 0);
  const bad_total = active.filter((f) => f.classification === 'bad').reduce((s, f) => s + Number(f.current_balance), 0);

  // By category
  const lenders = active.filter((f) => f.category === 'lender');
  const creditors = active.filter((f) => f.category === 'creditor');
  const dlas = active.filter((f) => f.category === 'director_loan');
  const taxStatutory = active.filter((f) => f.category === 'tax_statutory');

  const lenders_total = lenders.reduce((s, f) => s + Number(f.current_balance), 0);
  const lenders_monthly = lenders.reduce((s, f) => s + Number(f.monthly_repayment), 0);
  const creditors_total = creditors.reduce((s, f) => s + Number(f.current_balance), 0);
  const creditors_monthly = creditors.reduce((s, f) => s + Number(f.monthly_repayment), 0);
  const director_loans_total = dlas.reduce((s, f) => s + Number(f.current_balance), 0);
  const director_loans_monthly = dlas.reduce((s, f) => s + Number(f.monthly_repayment), 0);
  const tax_statutory_total = taxStatutory.reduce((s, f) => s + Number(f.current_balance), 0);

  // Legacy type breakdowns
  const businessTypes = ['term_loan', 'unsecured_loan', 'secured_loan', 'credit_card', 'overdraft', 'government_loan'];
  const business_loans_total = active.filter((f) => businessTypes.includes(f.facility_type)).reduce((s, f) => s + Number(f.current_balance), 0);
  const mca_total = active.filter((f) => f.facility_type === 'mca').reduce((s, f) => s + Number(f.current_balance), 0);

  // Missing info / action required counts
  const facilities_missing_info = active.filter((f) => f.missing_info && f.missing_info.length > 0).length;
  const facilities_action_required = active.filter((f) => f.action_required).length;

  // Credit-impacting DLAs
  const creditImpacting = dlas.filter((f) => f.credit_impacting);
  const credit_impacting_total = creditImpacting.reduce((s, f) => s + Number(f.current_balance), 0);
  const credit_impacting_count = creditImpacting.length;

  return {
    total_outstanding,
    total_monthly_repayment,
    total_annual_cost,
    facility_count: facilities.length,
    active_count: active.length,
    average_rate,
    weighted_average_rate,
    highest_rate_facility,
    next_maturity,
    next_payment,
    dscr: null,
    good_total,
    okay_total,
    bad_total,
    lenders_total,
    lenders_monthly,
    creditors_total,
    creditors_monthly,
    director_loans_total,
    director_loans_monthly,
    tax_statutory_total,
    business_loans_total,
    mca_total,
    director_loans_total_legacy: director_loans_total,
    creditor_plans_total: creditors_total,
    facilities_missing_info,
    facilities_action_required,
    credit_impacting_total,
    credit_impacting_count,
  };
}

export default async function DebtPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // Fetch all facilities
  const { data: rawFacilities } = await supabase
    .from('debt_facilities')
    .select('*')
    .eq('org_id', orgId)
    .order('classification', { ascending: true })
    .order('current_balance', { ascending: false });

  const rawRows = (rawFacilities ?? []) as unknown as Record<string, unknown>[];

  // Fetch balance history
  const facilityIds = rawRows.map((f) => f.id as string);
  let balanceHistory: DebtBalanceHistory[] = [];
  if (facilityIds.length > 0) {
    const { data: bh } = await supabase
      .from('debt_balance_history')
      .select('*')
      .in('facility_id', facilityIds)
      .order('period', { ascending: true });
    balanceHistory = (bh ?? []) as unknown as DebtBalanceHistory[];
  }

  // Group balance history by facility
  const historyByFacility: Record<string, DebtBalanceHistory[]> = {};
  for (const bh of balanceHistory) {
    if (!historyByFacility[bh.facility_id]) historyByFacility[bh.facility_id] = [];
    historyByFacility[bh.facility_id].push(bh);
  }

  const facilities: DebtFacility[] = rawRows.map((f) => ({
    ...f,
    // Ensure category defaults for old rows
    category: f.category || (
      f.facility_type === 'director_loan' ? 'director_loan' :
      f.facility_type === 'creditor_plan' ? 'creditor' :
      ['paye_plan', 'vat_liability', 'corp_tax'].includes(f.facility_type as string) ? 'tax_statutory' :
      'lender'
    ),
    missing_info: f.missing_info ?? null,
    action_required: f.action_required ?? null,
    credit_impacting: f.credit_impacting ?? false,
    credit_impact_notes: f.credit_impact_notes ?? null,
    balance_history: historyByFacility[f.id as string] ?? [],
    documents: [],
  })) as unknown as DebtFacility[];

  const summary = computeSummary(facilities);
  const hasData = facilities.length > 0;

  // ── Pull tax/statutory liabilities from balance sheet (Xero GL) ──
  // Get latest period
  const { data: latestPeriodRow } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId)
    .order('period', { ascending: false })
    .limit(1);

  const latestPeriod = (latestPeriodRow as unknown as Array<{ period: string }> | null)?.[0]?.period;

  let taxLiabilities: TaxLiabilityFromBS[] = [];

  if (latestPeriod) {
    // Fetch liability accounts from chart_of_accounts joined with normalised_financials
    const { data: bsAccounts } = await supabase
      .from('normalised_financials')
      .select('amount, period, account_id, chart_of_accounts!inner(id, code, name, type, class)')
      .eq('org_id', orgId)
      .eq('period', latestPeriod)
      .in('chart_of_accounts.class' as string, ['LIABILITY']);

    const bsRows = (bsAccounts ?? []) as unknown as Array<{
      amount: number;
      period: string;
      account_id: string;
      chart_of_accounts: { id: string; code: string; name: string; type: string; class: string };
    }>;

    for (const row of bsRows) {
      const acct = row.chart_of_accounts;
      const taxType = classifyTaxAccount(acct.name);
      if (taxType) {
        taxLiabilities.push({
          account_name: acct.name,
          account_code: acct.code,
          account_id: acct.id,
          balance: Math.abs(Number(row.amount)),
          period: row.period,
          type: taxType,
        });
      }
    }
  }

  // ── Fetch VAT quarters ──
  const { data: rawVatQuarters } = await supabase
    .from('vat_quarters')
    .select('*')
    .eq('org_id', orgId)
    .order('period_start', { ascending: false });

  const vatQuarters = (rawVatQuarters ?? []) as unknown as VATQuarter[];

  return (
    <DebtClient
      facilities={facilities}
      summary={summary}
      hasData={hasData}
      orgId={orgId}
      taxLiabilities={taxLiabilities}
      vatQuarters={vatQuarters}
      latestPeriod={latestPeriod ?? null}
    />
  );
}
