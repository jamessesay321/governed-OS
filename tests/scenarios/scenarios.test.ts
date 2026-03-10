import { describe, it, expect } from 'vitest';
import { compareScenarios } from '@/lib/scenarios/scenarios';
import { makePeriodProjection } from './factories';

describe('compareScenarios', () => {
  it('calculates period-by-period deltas', () => {
    const base = {
      name: 'Base Case',
      projections: [
        makePeriodProjection({ period: '2024-01-01', revenue: 100000, netProfit: 10000, closingCash: 200000, grossMarginPct: 0.65, netMarginPct: 0.1, runwayMonths: 0 }),
        makePeriodProjection({ period: '2024-02-01', revenue: 110000, netProfit: 15000, closingCash: 215000, grossMarginPct: 0.66, netMarginPct: 0.1364, runwayMonths: 0 }),
      ],
    };
    const comparison = {
      name: 'Optimistic',
      projections: [
        makePeriodProjection({ period: '2024-01-01', revenue: 120000, netProfit: 20000, closingCash: 220000, grossMarginPct: 0.68, netMarginPct: 0.1667, runwayMonths: 0 }),
        makePeriodProjection({ period: '2024-02-01', revenue: 140000, netProfit: 30000, closingCash: 250000, grossMarginPct: 0.70, netMarginPct: 0.2143, runwayMonths: 0 }),
      ],
    };

    const result = compareScenarios(base, comparison);

    expect(result.baseName).toBe('Base Case');
    expect(result.comparisonName).toBe('Optimistic');
    expect(result.periodDeltas).toHaveLength(2);

    // First period deltas
    expect(result.periodDeltas[0].revenueDelta).toBe(20000);
    expect(result.periodDeltas[0].netProfitDelta).toBe(10000);
    expect(result.periodDeltas[0].closingCashDelta).toBe(20000);
  });

  it('returns summary totals', () => {
    const base = {
      name: 'Base',
      projections: [
        makePeriodProjection({ period: '2024-01-01', revenue: 100000, netProfit: -5000, closingCash: 195000, grossMarginPct: 0.65, netMarginPct: -0.05, runwayMonths: 10 }),
      ],
    };
    const comparison = {
      name: 'Growth',
      projections: [
        makePeriodProjection({ period: '2024-01-01', revenue: 150000, netProfit: 10000, closingCash: 210000, grossMarginPct: 0.70, netMarginPct: 0.0667, runwayMonths: 0 }),
      ],
    };

    const result = compareScenarios(base, comparison);

    expect(result.summaryRevenueDelta).toBe(50000);
    expect(result.summaryNetProfitDelta).toBe(15000);
    expect(result.summaryClosingCashDelta).toBe(15000);
  });

  it('identifies break-even periods', () => {
    const base = {
      name: 'Base',
      projections: [
        makePeriodProjection({ period: '2024-01-01', isBreakEven: false, netProfit: -5000, revenue: 100000, grossMarginPct: 0.65, netMarginPct: -0.05, closingCash: 195000, runwayMonths: 10 }),
        makePeriodProjection({ period: '2024-02-01', isBreakEven: true, netProfit: 1000, revenue: 110000, grossMarginPct: 0.66, netMarginPct: 0.009, closingCash: 196000, runwayMonths: 0 }),
      ],
    };
    const comparison = {
      name: 'Aggressive',
      projections: [
        makePeriodProjection({ period: '2024-01-01', isBreakEven: true, netProfit: 5000, revenue: 120000, grossMarginPct: 0.68, netMarginPct: 0.0417, closingCash: 205000, runwayMonths: 0 }),
      ],
    };

    const result = compareScenarios(base, comparison);

    expect(result.baseBreakEvenPeriod).toBe('2024-02-01');
    expect(result.comparisonBreakEvenPeriod).toBe('2024-01-01');
  });

  it('handles empty projections', () => {
    const result = compareScenarios(
      { name: 'Base', projections: [] },
      { name: 'Comp', projections: [] }
    );

    expect(result.periodDeltas).toHaveLength(0);
    expect(result.baseBreakEvenPeriod).toBeNull();
    expect(result.comparisonBreakEvenPeriod).toBeNull();
  });
});
