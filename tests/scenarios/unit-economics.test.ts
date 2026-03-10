import { describe, it, expect } from 'vitest';
import {
  calcSegmentEconomics,
  calcCAC,
  calcLTV,
  calcLTVCACRatio,
  generateUnitEconomics,
  compareSegmentEconomics,
} from '@/lib/scenarios/unit-economics';
import { makeSegmentInput } from './factories';

describe('calcCAC', () => {
  it('calculates cost per acquired customer', () => {
    expect(calcCAC(10000, 200)).toBe(50);
  });

  it('returns 0 when no customers acquired', () => {
    expect(calcCAC(10000, 0)).toBe(0);
  });
});

describe('calcLTV', () => {
  it('calculates lifetime value', () => {
    expect(calcLTV(50, 24)).toBe(1200);
  });

  it('returns 0 for zero lifespan', () => {
    expect(calcLTV(50, 0)).toBe(0);
  });
});

describe('calcLTVCACRatio', () => {
  it('calculates LTV:CAC ratio', () => {
    expect(calcLTVCACRatio(1200, 50)).toBe(24);
  });

  it('returns 0 when CAC is zero', () => {
    expect(calcLTVCACRatio(1200, 0)).toBe(0);
  });
});

describe('calcSegmentEconomics', () => {
  it('calculates all segment metrics', () => {
    const result = calcSegmentEconomics(makeSegmentInput());

    expect(result.segmentKey).toBe('product-a');
    expect(result.contributionPerUnit).toBe(30); // 50 - 20
    expect(result.contributionMarginPct).toBe(0.6); // 30/50
    expect(result.totalRevenue).toBe(50000); // 1000 * 50
    expect(result.totalVariableCost).toBe(20000); // 1000 * 20
    expect(result.totalContribution).toBe(30000); // 1000 * 30
    expect(result.cac).toBe(50); // 10000 / 200
    expect(result.ltv).toBe(1200); // 50 * 24
    expect(result.ltvCacRatio).toBe(24); // 1200 / 50
  });

  it('handles zero revenue per unit', () => {
    const result = calcSegmentEconomics(makeSegmentInput({ revenuePerUnit: 0 }));
    expect(result.contributionMarginPct).toBe(0);
  });
});

describe('generateUnitEconomics', () => {
  it('generates summary across multiple segments', () => {
    const segments = [
      makeSegmentInput({ segmentKey: 'a', segmentLabel: 'A', unitsSold: 100, revenuePerUnit: 50 }),
      makeSegmentInput({ segmentKey: 'b', segmentLabel: 'B', unitsSold: 200, revenuePerUnit: 30 }),
    ];

    const result = generateUnitEconomics(segments, '2024-01-01');

    expect(result.period).toBe('2024-01-01');
    expect(result.segments).toHaveLength(2);
    expect(result.totalRevenue).toBe(11000); // 100*50 + 200*30
    expect(result.totalContribution).toBeGreaterThan(0);
    expect(result.weightedContributionMargin).toBeGreaterThan(0);
  });

  it('handles empty segments', () => {
    const result = generateUnitEconomics([], '2024-01-01');
    expect(result.totalRevenue).toBe(0);
    expect(result.weightedContributionMargin).toBe(0);
  });
});

describe('compareSegmentEconomics', () => {
  it('calculates deltas between baseline and comparison', () => {
    const baseline = [calcSegmentEconomics(makeSegmentInput({ revenuePerUnit: 50 }))];
    const comparison = [calcSegmentEconomics(makeSegmentInput({ revenuePerUnit: 60 }))];

    const deltas = compareSegmentEconomics(baseline, comparison);
    expect(deltas).toHaveLength(1);
    expect(deltas[0].revenuePerUnitDelta).toBe(10);
  });

  it('handles new segments in comparison', () => {
    const baseline = [calcSegmentEconomics(makeSegmentInput({ segmentKey: 'a' }))];
    const comparison = [
      calcSegmentEconomics(makeSegmentInput({ segmentKey: 'a' })),
      calcSegmentEconomics(makeSegmentInput({ segmentKey: 'b', segmentLabel: 'B' })),
    ];

    const deltas = compareSegmentEconomics(baseline, comparison);
    expect(deltas).toHaveLength(2);
    const newSegment = deltas.find((d) => d.segmentKey === 'b');
    expect(newSegment).toBeDefined();
  });
});
