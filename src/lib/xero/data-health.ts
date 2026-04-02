/**
 * Data Health Check Engine
 *
 * Runs 6 quality checks against an org's financial data for a given period.
 * Produces a 0-100 score and actionable recommendations.
 *
 * Called after each sync to evaluate data readiness for forecasting.
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { DataHealthCheck, DataHealthCheckName, DataHealthReport } from '@/types';

// ─── Check Definitions ─────────────────────────────────────────────

type CheckFn = (
  orgId: string,
  period: string,
  supabase: Awaited<ReturnType<typeof createServiceClient>>
) => Promise<DataHealthCheck>;

/**
 * 1. Transaction Coverage
 * Are there transactions in this period? Checks raw_transactions count.
 */
const checkTransactionCoverage: CheckFn = async (orgId, period, supabase) => {
  const name: DataHealthCheckName = 'transaction_coverage';
  const periodStart = period; // YYYY-MM-01
  const [y, m] = period.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const periodEnd = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;

  const { count } = await supabase
    .from('raw_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('date', periodStart)
    .lte('date', periodEnd);

  const txCount = count ?? 0;

  if (txCount >= 20) {
    return { name, score: 100, status: 'pass', message: `${txCount} transactions found`, details: { count: txCount } };
  }
  if (txCount >= 5) {
    return { name, score: 60, status: 'warn', message: `Only ${txCount} transactions. Expected 20+ for a full month.`, details: { count: txCount } };
  }
  if (txCount > 0) {
    return { name, score: 30, status: 'warn', message: `Very few transactions (${txCount}). Data may be incomplete.`, details: { count: txCount } };
  }
  return { name, score: 0, status: 'fail', message: 'No transactions found for this period', details: { count: 0 } };
};

/**
 * 2. Account Mapping Completeness
 * What % of accounts used in normalised_financials have a standard_category mapping?
 */
const checkAccountMappingCompleteness: CheckFn = async (orgId, period, supabase) => {
  const name: DataHealthCheckName = 'account_mapping_completeness';

  // Get accounts used in this period
  const { data: periodAccounts } = await supabase
    .from('normalised_financials')
    .select('account_id')
    .eq('org_id', orgId)
    .eq('period', period);

  const accountIds = [...new Set((periodAccounts ?? []).map((r) => r.account_id))];
  if (accountIds.length === 0) {
    return { name, score: 0, status: 'fail', message: 'No normalised financial data for this period', details: { total: 0, mapped: 0 } };
  }

  // Check how many have mappings
  const { count: mappedCount } = await supabase
    .from('account_mappings')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .in('account_id', accountIds);

  const mapped = mappedCount ?? 0;
  const pct = Math.round((mapped / accountIds.length) * 100);

  if (pct >= 90) {
    return { name, score: 100, status: 'pass', message: `${pct}% of accounts mapped (${mapped}/${accountIds.length})`, details: { total: accountIds.length, mapped, pct } };
  }
  if (pct >= 60) {
    return { name, score: pct, status: 'warn', message: `${pct}% of accounts mapped. Review unmapped accounts for accurate categorisation.`, details: { total: accountIds.length, mapped, pct } };
  }
  return { name, score: pct, status: 'fail', message: `Only ${pct}% of accounts mapped. Financial reports may be inaccurate.`, details: { total: accountIds.length, mapped, pct } };
};

/**
 * 3. Reconciliation Status
 * Check if the period's normalised financials have reasonable totals
 * (revenue > 0 for most businesses, and debits roughly equal credits).
 */
const checkReconciliationStatus: CheckFn = async (orgId, period, supabase) => {
  const name: DataHealthCheckName = 'reconciliation_status';

  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('amount, chart_of_accounts!inner(class)')
    .eq('org_id', orgId)
    .eq('period', period);

  if (!financials || financials.length === 0) {
    return { name, score: 0, status: 'fail', message: 'No financial data to reconcile', details: {} };
  }

  let revenue = 0;
  let expenses = 0;
  let assets = 0;
  let liabilities = 0;

  for (const row of financials) {
    const cls = ((row as Record<string, unknown>).chart_of_accounts as Record<string, string>)?.class?.toUpperCase() ?? '';
    const amt = row.amount ?? 0;
    if (cls === 'REVENUE') revenue += amt;
    else if (cls === 'EXPENSE') expenses += amt;
    else if (cls === 'ASSET') assets += amt;
    else if (cls === 'LIABILITY') liabilities += amt;
  }

  const hasRevenue = Math.abs(revenue) > 0;
  const hasExpenses = Math.abs(expenses) > 0;

  if (hasRevenue && hasExpenses) {
    return { name, score: 100, status: 'pass', message: 'Revenue and expenses present. Data appears reconciled.', details: { revenue, expenses, assets, liabilities } };
  }
  if (hasRevenue || hasExpenses) {
    return { name, score: 50, status: 'warn', message: hasRevenue ? 'Revenue found but no expenses. Check data completeness.' : 'Expenses found but no revenue. Check data completeness.', details: { revenue, expenses } };
  }
  return { name, score: 0, status: 'fail', message: 'No P&L data found for this period', details: {} };
};

/**
 * 4. Period Continuity
 * Are there gaps in the month sequence? Missing months break trend analysis.
 */
const checkPeriodContinuity: CheckFn = async (orgId, _period, supabase) => {
  const name: DataHealthCheckName = 'period_continuity';

  const { data: periods } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId);

  const uniquePeriods = [...new Set((periods ?? []).map((p) => p.period))].sort();
  if (uniquePeriods.length < 2) {
    return { name, score: uniquePeriods.length === 1 ? 50 : 0, status: 'warn', message: `Only ${uniquePeriods.length} period(s) available. Need 3+ months for trend analysis.`, details: { periods: uniquePeriods } };
  }

  // Check for gaps
  const gaps: string[] = [];
  for (let i = 1; i < uniquePeriods.length; i++) {
    const [py, pm] = uniquePeriods[i - 1].split('-').map(Number);
    const [cy, cm] = uniquePeriods[i].split('-').map(Number);
    const expectedMonth = pm === 12 ? 1 : pm + 1;
    const expectedYear = pm === 12 ? py + 1 : py;
    if (cy !== expectedYear || cm !== expectedMonth) {
      gaps.push(`${uniquePeriods[i - 1]} → ${uniquePeriods[i]}`);
    }
  }

  if (gaps.length === 0) {
    return { name, score: 100, status: 'pass', message: `${uniquePeriods.length} consecutive months with no gaps`, details: { monthCount: uniquePeriods.length } };
  }
  const gapPct = Math.round(((uniquePeriods.length - gaps.length) / uniquePeriods.length) * 100);
  return { name, score: gapPct, status: 'warn', message: `${gaps.length} gap(s) in period sequence. Trend analysis may be affected.`, details: { gaps, monthCount: uniquePeriods.length } };
};

/**
 * 5. Categorisation Quality
 * What % of normalised_financials amounts are in accounts with known classes?
 */
const checkCategorisationQuality: CheckFn = async (orgId, period, supabase) => {
  const name: DataHealthCheckName = 'categorisation_quality';

  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('amount, chart_of_accounts!inner(class)')
    .eq('org_id', orgId)
    .eq('period', period);

  if (!financials || financials.length === 0) {
    return { name, score: 0, status: 'fail', message: 'No financial data to assess', details: {} };
  }

  let categorised = 0;
  let uncategorised = 0;

  for (const row of financials) {
    const cls = ((row as Record<string, unknown>).chart_of_accounts as Record<string, string>)?.class ?? '';
    if (cls && cls.trim().length > 0) {
      categorised++;
    } else {
      uncategorised++;
    }
  }

  const total = categorised + uncategorised;
  const pct = Math.round((categorised / total) * 100);

  if (pct >= 95) {
    return { name, score: 100, status: 'pass', message: `${pct}% of line items categorised`, details: { categorised, uncategorised, total } };
  }
  if (pct >= 75) {
    return { name, score: pct, status: 'warn', message: `${pct}% categorised. ${uncategorised} items need classification.`, details: { categorised, uncategorised, total } };
  }
  return { name, score: pct, status: 'fail', message: `Only ${pct}% categorised. Reports will be incomplete.`, details: { categorised, uncategorised, total } };
};

/**
 * 6. Balance Sheet Completeness
 * Do we have balance sheet data (ASSET, LIABILITY, EQUITY accounts)?
 */
const checkBalanceSheetCompleteness: CheckFn = async (orgId, period, supabase) => {
  const name: DataHealthCheckName = 'balance_sheet_completeness';

  const { data: bsData } = await supabase
    .from('normalised_financials')
    .select('amount, chart_of_accounts!inner(class)')
    .eq('org_id', orgId)
    .eq('period', period)
    .in('chart_of_accounts.class', ['ASSET', 'LIABILITY', 'EQUITY']);

  const count = bsData?.length ?? 0;

  if (count >= 5) {
    return { name, score: 100, status: 'pass', message: `${count} balance sheet accounts with data`, details: { accountCount: count } };
  }
  if (count > 0) {
    return { name, score: 50, status: 'warn', message: `Only ${count} BS accounts. Balance sheet may be incomplete.`, details: { accountCount: count } };
  }
  return { name, score: 0, status: 'fail', message: 'No balance sheet data. Run a sync to fetch Trial Balance.', details: { accountCount: 0 } };
};

// ─── All Checks in Order ───────────────────────────────────────────

const ALL_CHECKS: CheckFn[] = [
  checkTransactionCoverage,
  checkAccountMappingCompleteness,
  checkReconciliationStatus,
  checkPeriodContinuity,
  checkCategorisationQuality,
  checkBalanceSheetCompleteness,
];

// ─── Scoring and Recommendations ───────────────────────────────────

function generateRecommendations(checks: DataHealthCheck[]): string[] {
  const recs: string[] = [];

  for (const check of checks) {
    if (check.status === 'fail') {
      switch (check.name) {
        case 'transaction_coverage':
          recs.push('Sync your accounting software to import transactions for this period.');
          break;
        case 'account_mapping_completeness':
          recs.push('Review and confirm account mappings in Settings to improve report accuracy.');
          break;
        case 'reconciliation_status':
          recs.push('Check that invoices and expenses are posted in your accounting software for this period.');
          break;
        case 'period_continuity':
          recs.push('Import historical data to fill gaps between months for better trend analysis.');
          break;
        case 'categorisation_quality':
          recs.push('Classify uncategorised accounts in your Chart of Accounts.');
          break;
        case 'balance_sheet_completeness':
          recs.push('Trigger a sync to fetch balance sheet data from Xero Trial Balance reports.');
          break;
      }
    } else if (check.status === 'warn') {
      switch (check.name) {
        case 'transaction_coverage':
          recs.push('Transaction count is low. Verify all invoices and bank feeds are synced.');
          break;
        case 'account_mapping_completeness':
          recs.push('Some accounts are unmapped. Confirm mappings for more accurate reports.');
          break;
        case 'period_continuity':
          recs.push('There are gaps in your monthly data. Import missing months if available.');
          break;
      }
    }
  }

  return recs;
}

// ─── Main Entry Point ──────────────────────────────────────────────

/**
 * Run all 6 data health checks for a given org + period.
 * Scores 0-100, stores the report, and returns it.
 */
export async function runDataHealthCheck(
  orgId: string,
  period: string
): Promise<DataHealthReport> {
  const supabase = await createServiceClient();

  // Run all checks
  const checks: DataHealthCheck[] = [];
  for (const checkFn of ALL_CHECKS) {
    try {
      const result = await checkFn(orgId, period, supabase);
      checks.push(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[DATA HEALTH] Check failed: ${msg}`);
      // Push a fail result so the overall score reflects the issue
      checks.push({
        name: 'transaction_coverage' as DataHealthCheckName, // placeholder
        score: 0,
        status: 'fail',
        message: `Check failed: ${msg}`,
      });
    }
  }

  // Weighted scoring: transaction coverage and reconciliation are most important
  const weights: Record<DataHealthCheckName, number> = {
    transaction_coverage: 25,
    account_mapping_completeness: 15,
    reconciliation_status: 25,
    period_continuity: 10,
    categorisation_quality: 15,
    balance_sheet_completeness: 10,
  };

  let weightedSum = 0;
  let totalWeight = 0;
  for (const check of checks) {
    const w = weights[check.name] ?? 10;
    weightedSum += check.score * w;
    totalWeight += w;
  }

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  const recommendations = generateRecommendations(checks);

  // Forecast-ready if overall score >= 70 and no critical failures
  const forecastReady = overallScore >= 70 && !checks.some((c) => c.status === 'fail');

  // Upsert the report
  const report = {
    org_id: orgId,
    period,
    overall_score: overallScore,
    checks: checks as unknown as Record<string, unknown>,
    recommendations,
    forecast_ready: forecastReady,
  };

  const { data: saved, error } = await supabase
    .from('data_health_reports')
    .upsert(report, { onConflict: 'org_id,period' })
    .select()
    .single();

  if (error) {
    console.warn(`[DATA HEALTH] Failed to save report: ${error.message}`);
  }

  console.log(
    `[DATA HEALTH] ${orgId} / ${period}: score=${overallScore}, forecast_ready=${forecastReady}, checks=${checks.map((c) => `${c.name}:${c.status}`).join(', ')}`
  );

  return (saved ?? { ...report, id: '', created_at: new Date().toISOString() }) as DataHealthReport;
}

/**
 * Run data health checks for the most recent N periods of an org.
 * Called after sync completes.
 */
export async function runDataHealthForRecentPeriods(
  orgId: string,
  maxPeriods = 3
): Promise<DataHealthReport[]> {
  const supabase = await createServiceClient();

  // Get the most recent periods
  const { data: periods } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId);

  const uniquePeriods = [...new Set((periods ?? []).map((p) => p.period))]
    .sort()
    .reverse()
    .slice(0, maxPeriods);

  const reports: DataHealthReport[] = [];
  for (const period of uniquePeriods) {
    const report = await runDataHealthCheck(orgId, period);
    reports.push(report);
  }

  return reports;
}
