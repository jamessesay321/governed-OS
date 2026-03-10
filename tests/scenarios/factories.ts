import type {
  AssumptionCategory,
  AssumptionType,
  ModelSnapshot,
  UnitEconomicsSnapshot,
} from '@/types';
import type {
  RevenueProjectionInput,
  CostProjectionInput,
  CashFlowInput,
  ActualsInput,
  PeriodProjection,
} from '@/lib/scenarios/calculations';

// === Assumption Input (used by pure engine functions) ===

export type AssumptionInput = {
  key: string;
  category: AssumptionCategory;
  type: AssumptionType;
  value: number;
  effective_from: string;
  effective_to: string | null;
};

export function makeAssumptionInput(
  overrides: Partial<AssumptionInput> = {}
): AssumptionInput {
  return {
    key: 'revenue_growth_rate',
    category: 'revenue_drivers',
    type: 'percentage',
    value: 0.05,
    effective_from: '2024-01-01',
    effective_to: null,
    ...overrides,
  };
}

// === Actuals Factories ===

export function makeActualsInput(
  overrides: Partial<ActualsInput> = {}
): ActualsInput {
  return {
    period: '2024-01-01',
    revenue: 100000,
    cost_of_sales: 35000,
    operating_expenses: 50000,
    cash_balance: 200000,
    ...overrides,
  };
}

export function makeActualsSeries(months: number = 3): ActualsInput[] {
  return Array.from({ length: months }, (_, i) => {
    const month = String(i + 1).padStart(2, '0');
    return makeActualsInput({
      period: `2024-${month}-01`,
      revenue: 100000 + i * 5000,
      cost_of_sales: 35000 + i * 1000,
      operating_expenses: 50000,
      cash_balance: 200000 + i * 10000,
    });
  });
}

// === Projection Input Factories ===

export function makeRevenueInput(
  overrides: Partial<RevenueProjectionInput> = {}
): RevenueProjectionInput {
  return {
    baseRevenue: 100000,
    growthRate: 0.05,
    seasonalityFactor: 1.0,
    ...overrides,
  };
}

export function makeCostInput(
  overrides: Partial<CostProjectionInput> = {}
): CostProjectionInput {
  return {
    baseCosts: 35000,
    fixedCosts: 0,
    variableCostRate: 0.35,
    projectedRevenue: 105000,
    ...overrides,
  };
}

export function makeCashFlowInput(
  overrides: Partial<CashFlowInput> = {}
): CashFlowInput {
  return {
    revenue: 105000,
    costOfSales: 36750,
    operatingExpenses: 50000,
    openingCash: 200000,
    receivablesDays: 30,
    payablesDays: 30,
    capitalExpenditure: 0,
    ...overrides,
  };
}

// === Segment Input (used by unit economics engine) ===

export type SegmentInput = {
  segmentKey: string;
  segmentLabel: string;
  unitsSold: number;
  revenuePerUnit: number;
  variableCostPerUnit: number;
  acquisitionSpend: number;
  customersAcquired: number;
  avgCustomerLifespanMonths: number;
  avgRevenuePerCustomerPerMonth: number;
};

export function makeSegmentInput(
  overrides: Partial<SegmentInput> = {}
): SegmentInput {
  return {
    segmentKey: 'product-a',
    segmentLabel: 'Product A',
    unitsSold: 1000,
    revenuePerUnit: 50,
    variableCostPerUnit: 20,
    acquisitionSpend: 10000,
    customersAcquired: 200,
    avgCustomerLifespanMonths: 24,
    avgRevenuePerCustomerPerMonth: 50,
    ...overrides,
  };
}

// === Output Factories ===

export function makePeriodProjection(
  overrides: Partial<PeriodProjection> = {}
): PeriodProjection {
  return {
    period: '2024-01-01',
    revenue: 100000,
    costOfSales: 35000,
    grossProfit: 65000,
    grossMarginPct: 0.65,
    operatingExpenses: 40000,
    netProfit: 25000,
    netMarginPct: 0.25,
    cashIn: 95000,
    cashOut: 70000,
    netCashFlow: 25000,
    closingCash: 275000,
    burnRate: 0,
    runwayMonths: 0,
    isBreakEven: true,
    ...overrides,
  };
}

// === Model Snapshot (from DB) ===

export function makeModelSnapshot(
  overrides: Partial<ModelSnapshot> = {}
): ModelSnapshot {
  return {
    id: 'snap-1',
    org_id: 'org-1',
    model_version_id: 'mv-1',
    scenario_id: 'sc-1',
    period: '2024-01-01',
    revenue: 100000,
    cost_of_sales: 35000,
    gross_profit: 65000,
    gross_margin_pct: 0.65,
    operating_expenses: 40000,
    net_profit: 25000,
    net_margin_pct: 0.25,
    cash_in: 95000,
    cash_out: 70000,
    net_cash_flow: 25000,
    closing_cash: 275000,
    burn_rate: 0,
    runway_months: 0,
    is_break_even: true,
    created_at: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}

// === Unit Economics Snapshot (from DB) ===

export function makeUnitEconomicsSnapshot(
  overrides: Partial<UnitEconomicsSnapshot> = {}
): UnitEconomicsSnapshot {
  return {
    id: 'ue-1',
    org_id: 'org-1',
    model_version_id: 'mv-1',
    scenario_id: 'sc-1',
    period: '2024-01-01',
    segment_key: 'product-a',
    segment_label: 'Product A',
    units_sold: 1000,
    revenue_per_unit: 50,
    variable_cost_per_unit: 20,
    contribution_per_unit: 30,
    contribution_margin_pct: 0.6,
    total_revenue: 50000,
    total_variable_cost: 20000,
    total_contribution: 30000,
    cac: 50,
    ltv: 1200,
    ltv_cac_ratio: 24,
    created_at: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}
