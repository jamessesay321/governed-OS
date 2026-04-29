/**
 * populate-from-prior.ts
 *
 * Pure helpers for the "Populate forecast from prior year + %" flow.
 *
 * Philosophy: we read ACTUAL data out of normalised_financials for a source
 * period range (typically the prior year), aggregate it into the same
 * assumption keys the model pipeline consumes, apply category-level
 * percentage uplift, and return the rows ready to be inserted into
 * assumption_values.
 *
 * This mirrors the shape used by seed-strategic-plan so runModelPipeline()
 * resolves the values correctly downstream.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type AssumptionCategory =
  | 'revenue_drivers'
  | 'pricing'
  | 'costs'
  | 'growth_rates'
  | 'headcount'
  | 'marketing'
  | 'capital'
  | 'custom';

export type AssumptionType =
  | 'percentage'
  | 'currency'
  | 'integer'
  | 'boolean'
  | 'decimal';

export type AssumptionSeed = {
  category: AssumptionCategory;
  key: string;
  label: string;
  type: AssumptionType;
  value: number;
  effective_from: string;
  effective_to: string | null;
};

/**
 * Category-level percentage uplift applied when populating.
 * Keys correspond loosely to the StandardCategory taxonomy on chart_of_accounts.
 *
 * `global` is the default uplift if a specific category override isn't set.
 */
export type CategoryOverrides = {
  global: number; // percent, e.g. 10 = +10%
  revenue?: number;
  cost_of_sales?: number;
  employee_costs?: number;
  other_overheads?: number;
  interest_and_finance?: number;
  depreciation?: number;
};

export type PopulateFromPriorInput = {
  /** Inclusive start of the source (historical) period, YYYY-MM-01 */
  sourceStart: string;
  /** Inclusive end of the source (historical) period, YYYY-MM-01 */
  sourceEnd: string;
  /** First period the forecast applies to, YYYY-MM-01 */
  targetStart: string;
  /** Category-level uplift */
  overrides: CategoryOverrides;
};

/**
 * Aggregated prior-year totals by StandardCategory bucket.
 * Exported so the API endpoint can echo these back to the UI for a "before/after"
 * preview in the wizard.
 */
export type PriorYearAggregates = {
  periodsFound: number;
  sourceRange: { start: string; end: string };
  revenue: number;
  otherIncome: number;
  costOfSales: number;
  employeeCosts: number;
  otherOverheads: number;
  interestAndFinance: number;
  depreciation: number;
  /** Counts of how many raw rows rolled into each bucket — useful to flag gaps */
  rowCounts: Record<string, number>;
};

/**
 * Query normalised_financials for the source period range and aggregate into
 * StandardCategory buckets.
 *
 * We join chart_of_accounts to classify each row by Xero class:
 *   REVENUE / OTHERINCOME  → revenue / otherIncome
 *   DIRECTCOSTS            → costOfSales
 *   EXPENSE / OVERHEADS    → employeeCosts | otherOverheads | interestAndFinance | depreciation
 *
 * The split between employeeCosts / otherOverheads / interestAndFinance / depreciation
 * is driven by chart_of_accounts.type (we treat 'EXPENSE' as other_overheads by default
 * and use account name/code heuristics for employee / interest / depreciation).
 */
export async function fetchPriorYearAggregates(
  supabase: SupabaseClient,
  orgId: string,
  sourceStart: string,
  sourceEnd: string
): Promise<PriorYearAggregates> {
  // Pull period/account_id/source so we can dedupe.
  // normalised_financials can hold multiple rows per (period, account_id) across
  // sources (xero raw, xero_pnl_report, xero_trial_balance, demo). For P&L
  // aggregation we want exactly ONE row per (period, account_id) with the most
  // authoritative source: xero_pnl_report > xero > demo.
  const { data: rawRows, error } = await supabase
    .from('normalised_financials')
    .select(
      'period, account_id, amount, source, chart_of_accounts!inner(code, name, class, type)'
    )
    .eq('org_id', orgId)
    .gte('period', sourceStart)
    .lte('period', sourceEnd)
    .neq('source', 'xero_trial_balance'); // balance sheet; not P&L

  if (error) {
    throw new Error(
      `Failed to fetch normalised_financials for aggregation: ${error.message}`
    );
  }

  // Dedupe by (period, account_id) — preferring the most authoritative source.
  const sourcePriority: Record<string, number> = {
    xero_pnl_report: 3,
    xero: 2,
    demo: 1,
  };
  const byKey = new Map<string, (typeof rawRows)[number]>();
  for (const row of rawRows ?? []) {
    const key = `${row.period}|${row.account_id}`;
    const existing = byKey.get(key);
    const curPri = sourcePriority[String(row.source ?? '')] ?? 0;
    const exPri = existing ? sourcePriority[String(existing.source ?? '')] ?? 0 : -1;
    if (!existing || curPri > exPri) {
      byKey.set(key, row);
    }
  }
  const rows = Array.from(byKey.values());

  const agg: PriorYearAggregates = {
    periodsFound: 0,
    sourceRange: { start: sourceStart, end: sourceEnd },
    revenue: 0,
    otherIncome: 0,
    costOfSales: 0,
    employeeCosts: 0,
    otherOverheads: 0,
    interestAndFinance: 0,
    depreciation: 0,
    rowCounts: {
      revenue: 0,
      otherIncome: 0,
      costOfSales: 0,
      employeeCosts: 0,
      otherOverheads: 0,
      interestAndFinance: 0,
      depreciation: 0,
      unclassified: 0,
    },
  };

  const seenPeriods = new Set<string>();

  for (const row of rows ?? []) {
    const amount = Number(row.amount) || 0;
    // Absolute value — normalised_financials stores costs as negative numbers
    // from the P&L report; we want positive totals when bucketing.
    const absAmount = Math.abs(amount);

    const acct = (row as unknown as { chart_of_accounts: { class: string; type: string; code: string; name: string } }).chart_of_accounts;
    const cls = (acct?.class || '').toUpperCase();
    const type = (acct?.type || '').toUpperCase();
    const name = (acct?.name || '').toLowerCase();
    const code = (acct?.code || '').toLowerCase();

    seenPeriods.add(row.period as string);

    if (cls === 'REVENUE') {
      agg.revenue += amount;
      agg.rowCounts.revenue += 1;
    } else if (cls === 'OTHERINCOME') {
      agg.otherIncome += amount;
      agg.rowCounts.otherIncome += 1;
    } else if (cls === 'DIRECTCOSTS' || type === 'DIRECTCOSTS') {
      agg.costOfSales += absAmount;
      agg.rowCounts.costOfSales += 1;
    } else if (cls === 'EXPENSE' || cls === 'OVERHEADS') {
      // Sub-classify expense rows via name/code heuristics.
      if (
        /wage|salary|salaries|payroll|pension|employer|staff|pay ?roll|nic|ni\b|employee/.test(
          name
        ) ||
        /^(47[0-9]|48[0-9])/.test(code) // common Xero UK payroll code ranges
      ) {
        agg.employeeCosts += absAmount;
        agg.rowCounts.employeeCosts += 1;
      } else if (/interest|bank charge|mca|merchant cash|finance fee|factoring/.test(name)) {
        agg.interestAndFinance += absAmount;
        agg.rowCounts.interestAndFinance += 1;
      } else if (/depreciation|amortisation|amortization/.test(name)) {
        agg.depreciation += absAmount;
        agg.rowCounts.depreciation += 1;
      } else {
        agg.otherOverheads += absAmount;
        agg.rowCounts.otherOverheads += 1;
      }
    } else {
      agg.rowCounts.unclassified += 1;
    }
  }

  agg.periodsFound = seenPeriods.size;
  return agg;
}

/**
 * Apply a category-level percentage uplift.
 * Uses overrides[category] if set, otherwise overrides.global.
 */
function uplift(amount: number, category: keyof CategoryOverrides | 'global', overrides: CategoryOverrides): number {
  const pct = overrides[category] ?? overrides.global ?? 0;
  return amount * (1 + pct / 100);
}

/**
 * Build the full assumption_values row-set for a "populate from prior year" scenario.
 *
 * IMPORTANT: the projection engine in `calculations.ts` reads a SPECIFIC set of
 * assumption keys: `revenue_growth_rate` (per-month decimal),
 * `variable_cost_rate` (decimal 0..1), `fixed_costs` (monthly £),
 * `finance_costs` (monthly £). Anything else is informational only.
 *
 * We therefore:
 * 1. Compute monthly averages from the aggregated prior-year totals
 * 2. Emit the engine-consumed keys with the correct units
 * 3. Also emit "informational" keys (baseline_revenue, etc.) so the audit trail
 *    on the scenario detail page makes sense to a user reading it.
 */
export function buildAssumptionSeeds(
  aggregates: PriorYearAggregates,
  input: PopulateFromPriorInput
): AssumptionSeed[] {
  const { overrides, targetStart } = input;
  const efFrom = targetStart;
  const efTo: string | null = null;

  // ── Compute monthly averages from prior-year aggregates ────────────
  // periodsFound counts how many distinct months had data; if it's 0, fall back
  // to 1 to avoid div/0 (and the route already short-circuits on empty actuals).
  const months = Math.max(1, aggregates.periodsFound);
  const monthlyRevenue = aggregates.revenue / months;
  const monthlyCogs = aggregates.costOfSales / months;
  const monthlyEmployee = aggregates.employeeCosts / months;
  const monthlyOverheads = aggregates.otherOverheads / months;
  const monthlyDepreciation = aggregates.depreciation / months;
  const monthlyInterest = aggregates.interestAndFinance / months;

  // Variable cost rate as a 0..1 ratio (engine multiplies revenue by this).
  const variableCostRate = monthlyRevenue > 0
    ? Math.max(0, Math.min(1, monthlyCogs / monthlyRevenue))
    : 0.35;

  // Fixed monthly opex = employee + other overheads + depreciation, uplifted.
  const fixedCostsMonthly =
    uplift(monthlyEmployee, 'employee_costs', overrides) +
    uplift(monthlyOverheads, 'other_overheads', overrides) +
    uplift(monthlyDepreciation, 'depreciation', overrides);

  // Finance costs monthly, uplifted.
  const financeCostsMonthly = uplift(monthlyInterest, 'interest_and_finance', overrides);

  // Annual revenue uplift (e.g. 10 = +10%) → per-MONTH decimal that compounds
  // to the annual figure over 12 months. Clamped to [-50%, +50%] to avoid
  // pathological values that would overflow numeric(15,2) on snapshots.
  const annualUpliftPct = overrides.revenue ?? overrides.global ?? 0;
  const annualUplift = Math.max(-50, Math.min(50, annualUpliftPct)) / 100;
  const monthlyGrowthDecimal = Math.pow(1 + annualUplift, 1 / 12) - 1;

  // Derive a COGS rate (%) for the informational seed, in case anyone reads it.
  const totalRevenue = aggregates.revenue || 1;
  const priorCogsRate = (aggregates.costOfSales / totalRevenue) * 100;

  const seeds: AssumptionSeed[] = [
    // ── ENGINE-CONSUMED KEYS (these actually drive the projection) ────
    {
      category: 'growth_rates',
      key: 'revenue_growth_rate',
      label: 'Revenue Growth Rate (per month, derived from annual uplift)',
      type: 'decimal',
      value: Number(monthlyGrowthDecimal.toFixed(6)),
      effective_from: efFrom,
      effective_to: efTo,
    },
    {
      category: 'costs',
      key: 'variable_cost_rate',
      label: 'Variable Cost Rate (Prior Year COGS / Revenue, decimal)',
      type: 'decimal',
      value: Number(variableCostRate.toFixed(4)),
      effective_from: efFrom,
      effective_to: efTo,
    },
    {
      category: 'costs',
      key: 'fixed_costs',
      label: 'Fixed Costs (Monthly: staff + overheads + depreciation, uplifted)',
      type: 'currency',
      value: Math.round(fixedCostsMonthly),
      effective_from: efFrom,
      effective_to: efTo,
    },
    {
      category: 'capital',
      key: 'finance_costs',
      label: 'Finance Costs (Monthly interest, uplifted)',
      type: 'currency',
      value: Math.round(financeCostsMonthly),
      effective_from: efFrom,
      effective_to: efTo,
    },

    // ── INFORMATIONAL KEYS (audit trail; not consumed by engine) ──────
    {
      category: 'revenue_drivers',
      key: 'baseline_revenue',
      label: 'Baseline Revenue (Prior Year total, uplifted)',
      type: 'currency',
      value: Math.round(uplift(aggregates.revenue, 'revenue', overrides)),
      effective_from: efFrom,
      effective_to: efTo,
    },
    {
      category: 'revenue_drivers',
      key: 'other_income',
      label: 'Other Income (Prior Year total, uplifted)',
      type: 'currency',
      value: Math.round(uplift(aggregates.otherIncome, 'revenue', overrides)),
      effective_from: efFrom,
      effective_to: efTo,
    },
    {
      category: 'costs',
      key: 'cogs_rate',
      label: 'COGS Rate (Prior Year %, informational)',
      type: 'percentage',
      value: Number(priorCogsRate.toFixed(2)),
      effective_from: efFrom,
      effective_to: efTo,
    },
    {
      category: 'costs',
      key: 'staff_costs_annual',
      label: 'Staff Costs (Prior Year annual total, uplifted)',
      type: 'currency',
      value: Math.round(uplift(aggregates.employeeCosts, 'employee_costs', overrides)),
      effective_from: efFrom,
      effective_to: efTo,
    },
    {
      category: 'costs',
      key: 'depreciation_annual',
      label: 'Depreciation (Prior Year annual total)',
      type: 'currency',
      value: Math.round(uplift(aggregates.depreciation, 'depreciation', overrides)),
      effective_from: efFrom,
      effective_to: efTo,
    },
  ];

  return seeds;
}

/**
 * Convenience: fetch aggregates AND build seeds in one call.
 */
export async function populateFromPrior(
  supabase: SupabaseClient,
  orgId: string,
  input: PopulateFromPriorInput
): Promise<{ aggregates: PriorYearAggregates; seeds: AssumptionSeed[] }> {
  const aggregates = await fetchPriorYearAggregates(
    supabase,
    orgId,
    input.sourceStart,
    input.sourceEnd
  );
  const seeds = buildAssumptionSeeds(aggregates, input);
  return { aggregates, seeds };
}
