import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import type { DebtFacility, DebtBalanceHistory, DebtSummary } from '@/types/debt';
import { DebtClient } from './debt-client';

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

  // By type
  const businessTypes = ['term_loan', 'unsecured_loan', 'secured_loan', 'credit_card', 'overdraft', 'government_loan'];
  const business_loans_total = active.filter((f) => businessTypes.includes(f.facility_type)).reduce((s, f) => s + Number(f.current_balance), 0);
  const mca_total = active.filter((f) => f.facility_type === 'mca').reduce((s, f) => s + Number(f.current_balance), 0);
  const director_loans_total = active.filter((f) => f.facility_type === 'director_loan').reduce((s, f) => s + Number(f.current_balance), 0);
  const creditor_plans_total = active.filter((f) => f.facility_type === 'creditor_plan').reduce((s, f) => s + Number(f.current_balance), 0);

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
    dscr: null, // calculated separately with P&L data
    good_total,
    okay_total,
    bad_total,
    business_loans_total,
    mca_total,
    director_loans_total,
    creditor_plans_total,
  };
}

export default async function DebtPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // Fetch all facilities (using service client as tables not in generated types yet)
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
    balance_history: historyByFacility[f.id as string] ?? [],
    documents: [],
  })) as unknown as DebtFacility[];

  const summary = computeSummary(facilities);
  const hasData = facilities.length > 0;

  return (
    <DebtClient
      facilities={facilities}
      summary={summary}
      hasData={hasData}
      orgId={orgId}
    />
  );
}
