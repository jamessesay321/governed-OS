import { describe, it, expect } from 'vitest';
import {
  projectRevenue,
  projectCosts,
  calcGrossMargin,
  calcContributionMargin,
  projectCashFlow,
  calcBurnRate,
  calcRunway,
  calcBreakEven,
  generateFullProjection,
} from '@/lib/scenarios/calculations';
import {
  makeRevenueInput,
  makeCostInput,
  makeCashFlowInput,
  makeActualsSeries,
  makePeriodProjection,
} from './factories';

describe('projectRevenue', () => {
  it('applies growth rate and seasonality to base revenue', () => {
    const result = projectRevenue(makeRevenueInput());
    // 100000 * (1 + 0.05) * 1.0 = 105000
    expect(result).toBe(105000);
  });

  it('applies seasonality factor', () => {
    const result = projectRevenue(makeRevenueInput({ seasonalityFactor: 1.2 }));
    // 100000 * 1.05 * 1.2 = 126000
    expect(result).toBe(126000);
  });

  it('handles zero growth rate', () => {
    const result = projectRevenue(makeRevenueInput({ growthRate: 0 }));
    expect(result).toBe(100000);
  });

  it('handles negative growth rate', () => {
    const result = projectRevenue(makeRevenueInput({ growthRate: -0.1 }));
    // 100000 * 0.9 * 1.0 = 90000
    expect(result).toBe(90000);
  });
});

describe('projectCosts', () => {
  it('calculates fixed costs plus variable costs', () => {
    const result = projectCosts(makeCostInput({
      fixedCosts: 10000,
      variableCostRate: 0.3,
      projectedRevenue: 100000,
    }));
    // 10000 + (100000 * 0.3) = 40000
    expect(result).toBe(40000);
  });

  it('returns only variable costs when fixed costs are zero', () => {
    const result = projectCosts(makeCostInput({
      fixedCosts: 0,
      variableCostRate: 0.35,
      projectedRevenue: 105000,
    }));
    // 105000 * 0.35 = 36750
    expect(result).toBe(36750);
  });

  it('returns only fixed costs when variable rate is zero', () => {
    const result = projectCosts(makeCostInput({
      fixedCosts: 20000,
      variableCostRate: 0,
      projectedRevenue: 100000,
    }));
    expect(result).toBe(20000);
  });
});

describe('calcGrossMargin', () => {
  it('calculates gross margin percentage', () => {
    const result = calcGrossMargin(100000, 35000);
    expect(result).toBe(0.65);
  });

  it('returns 0 when revenue is zero', () => {
    expect(calcGrossMargin(0, 0)).toBe(0);
  });

  it('handles negative margin', () => {
    const result = calcGrossMargin(50000, 75000);
    expect(result).toBe(-0.5);
  });
});

describe('calcContributionMargin', () => {
  it('calculates contribution margin percentage', () => {
    const result = calcContributionMargin(100000, 30000);
    expect(result).toBe(0.7);
  });

  it('returns 0 when revenue is zero', () => {
    expect(calcContributionMargin(0, 0)).toBe(0);
  });
});

describe('projectCashFlow', () => {
  it('calculates cash flow with standard terms', () => {
    const result = projectCashFlow(makeCashFlowInput());
    expect(result.cashIn).toBeGreaterThan(0);
    expect(result.cashOut).toBeGreaterThan(0);
    expect(result.closingCash).toBe(result.netCashFlow + 200000);
  });

  it('adjusts for receivables days', () => {
    const fast = projectCashFlow(makeCashFlowInput({ receivablesDays: 0 }));
    const slow = projectCashFlow(makeCashFlowInput({ receivablesDays: 60 }));
    expect(fast.cashIn).toBeGreaterThan(slow.cashIn);
  });

  it('adjusts for payables days', () => {
    const fast = projectCashFlow(makeCashFlowInput({ payablesDays: 0 }));
    const slow = projectCashFlow(makeCashFlowInput({ payablesDays: 60 }));
    expect(fast.cashOut).toBeGreaterThan(slow.cashOut);
  });

  it('includes capital expenditure in cash out', () => {
    const withCapex = projectCashFlow(makeCashFlowInput({ capitalExpenditure: 10000 }));
    const withoutCapex = projectCashFlow(makeCashFlowInput({ capitalExpenditure: 0 }));
    expect(withCapex.cashOut).toBe(withoutCapex.cashOut + 10000);
  });

  it('clamps collection rate between 0 and 1', () => {
    const result = projectCashFlow(makeCashFlowInput({ receivablesDays: 200 }));
    expect(result.cashIn).toBe(0);
  });
});

describe('calcBurnRate', () => {
  it('returns positive burn rate for negative cash flow', () => {
    expect(calcBurnRate(-5000)).toBe(5000);
  });

  it('returns 0 for positive cash flow', () => {
    expect(calcBurnRate(5000)).toBe(0);
  });

  it('returns 0 for zero cash flow', () => {
    expect(calcBurnRate(0)).toBe(0);
  });
});

describe('calcRunway', () => {
  it('calculates months of runway', () => {
    expect(calcRunway(100000, 10000)).toBe(10);
  });

  it('returns 0 when burn rate is zero', () => {
    expect(calcRunway(100000, 0)).toBe(0);
  });

  it('returns 0 when cash is zero', () => {
    expect(calcRunway(0, 10000)).toBe(0);
  });

  it('returns 0 when cash is negative', () => {
    expect(calcRunway(-5000, 10000)).toBe(0);
  });
});

describe('calcBreakEven', () => {
  it('finds the first profitable period', () => {
    const projections = [
      makePeriodProjection({ period: '2024-01-01', netProfit: -10000 }),
      makePeriodProjection({ period: '2024-02-01', netProfit: -5000 }),
      makePeriodProjection({ period: '2024-03-01', netProfit: 2000 }),
    ];
    const result = calcBreakEven(projections);
    expect(result.monthsToBreakEven).toBe(2);
    expect(result.breakEvenPeriod).toBe('2024-03-01');
  });

  it('returns null when no break-even reached', () => {
    const projections = [
      makePeriodProjection({ period: '2024-01-01', netProfit: -10000 }),
      makePeriodProjection({ period: '2024-02-01', netProfit: -5000 }),
    ];
    const result = calcBreakEven(projections);
    expect(result.monthsToBreakEven).toBeNull();
    expect(result.breakEvenPeriod).toBeNull();
  });

  it('estimates required revenue from last period costs', () => {
    const projections = [
      makePeriodProjection({
        period: '2024-01-01',
        costOfSales: 30000,
        operatingExpenses: 50000,
        netProfit: -10000,
      }),
    ];
    const result = calcBreakEven(projections);
    expect(result.revenueRequired).toBe(80000);
  });
});

describe('generateFullProjection', () => {
  it('uses actuals for historical periods', () => {
    const actuals = makeActualsSeries(3);
    const assumptions = new Map<string, number>([
      ['revenue_growth_rate', 0.05],
      ['seasonality_factor', 1],
      ['variable_cost_rate', 0.35],
      ['fixed_costs', 0],
      ['receivables_days', 30],
      ['payables_days', 30],
      ['capital_expenditure', 0],
    ]);
    const periods = ['2024-01-01', '2024-02-01', '2024-03-01'];

    const result = generateFullProjection(actuals, assumptions, periods);
    expect(result).toHaveLength(3);
    expect(result[0].revenue).toBe(100000);
    expect(result[1].revenue).toBe(105000);
    expect(result[2].revenue).toBe(110000);
  });

  it('projects forward for future periods', () => {
    const actuals = makeActualsSeries(1);
    const assumptions = new Map<string, number>([
      ['revenue_growth_rate', 0.1],
      ['seasonality_factor', 1],
      ['variable_cost_rate', 0.35],
      ['fixed_costs', 50000],
      ['receivables_days', 30],
      ['payables_days', 30],
      ['capital_expenditure', 0],
    ]);
    const periods = ['2024-01-01', '2024-02-01', '2024-03-01'];

    const result = generateFullProjection(actuals, assumptions, periods);
    expect(result).toHaveLength(3);
    // First period is actuals
    expect(result[0].revenue).toBe(100000);
    // Second period is projected: 100000 * 1.1 = 110000
    expect(result[1].revenue).toBe(110000);
    // Third period: 110000 * 1.1 = 121000
    expect(result[2].revenue).toBe(121000);
  });

  it('calculates all derived metrics', () => {
    const actuals = [makeActualsSeries(1)[0]];
    const assumptions = new Map<string, number>([
      ['revenue_growth_rate', 0.05],
      ['seasonality_factor', 1],
      ['variable_cost_rate', 0.35],
      ['fixed_costs', 50000],
      ['receivables_days', 30],
      ['payables_days', 30],
      ['capital_expenditure', 0],
    ]);
    const periods = ['2024-01-01', '2024-02-01'];

    const result = generateFullProjection(actuals, assumptions, periods);
    const projected = result[1];

    expect(projected.revenue).toBe(105000);
    expect(projected.grossProfit).toBe(projected.revenue - projected.costOfSales);
    expect(projected.netProfit).toBe(projected.grossProfit - projected.operatingExpenses);
    expect(projected.closingCash).toBeDefined();
    expect(typeof projected.burnRate).toBe('number');
    expect(typeof projected.runwayMonths).toBe('number');
    expect(typeof projected.isBreakEven).toBe('boolean');
  });

  it('handles empty actuals', () => {
    const assumptions = new Map<string, number>([
      ['revenue_growth_rate', 0.05],
      ['seasonality_factor', 1],
      ['variable_cost_rate', 0.35],
      ['fixed_costs', 0],
      ['receivables_days', 30],
      ['payables_days', 30],
      ['capital_expenditure', 0],
    ]);
    const periods = ['2024-01-01'];

    const result = generateFullProjection([], assumptions, periods);
    expect(result).toHaveLength(1);
    expect(result[0].revenue).toBe(0); // No base revenue
  });

  it('chains cash balances across periods', () => {
    const actuals = makeActualsSeries(1);
    const assumptions = new Map<string, number>([
      ['revenue_growth_rate', 0.05],
      ['seasonality_factor', 1],
      ['variable_cost_rate', 0.35],
      ['fixed_costs', 50000],
      ['receivables_days', 30],
      ['payables_days', 30],
      ['capital_expenditure', 0],
    ]);
    const periods = ['2024-01-01', '2024-02-01', '2024-03-01'];

    const result = generateFullProjection(actuals, assumptions, periods);
    // Closing cash of period 1 feeds into opening cash of period 2
    // Period 2's closing feeds into period 3
    expect(result[2].closingCash).toBeDefined();
    expect(typeof result[2].closingCash).toBe('number');
  });
});
