import { describe, it, expect } from 'vitest';
import {
  detectMarginCompression,
  detectRevenueAnomalies,
  flagRunwayRisk,
  detectBurnAcceleration,
  flagPoorUnitEconomics,
  runAllAnalyses,
} from '@/lib/ai/analysis';
import { makeModelSnapshot, makeUnitEconomicsSnapshot } from './factories';

describe('detectMarginCompression', () => {
  it('detects margin declining beyond threshold', () => {
    const snapshots = [
      makeModelSnapshot({ id: 's1', period: '2024-01-01', gross_margin_pct: 0.65 }),
      makeModelSnapshot({ id: 's2', period: '2024-02-01', gross_margin_pct: 0.60 }),
      makeModelSnapshot({ id: 's3', period: '2024-03-01', gross_margin_pct: 0.55 }),
    ];
    const result = detectMarginCompression(snapshots, 0.05);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('risk');
    expect(result!.title).toBe('Margin Compression Detected');
  });

  it('returns null when margin drop is within threshold', () => {
    const snapshots = [
      makeModelSnapshot({ period: '2024-01-01', gross_margin_pct: 0.65 }),
      makeModelSnapshot({ period: '2024-02-01', gross_margin_pct: 0.63 }),
    ];
    const result = detectMarginCompression(snapshots, 0.05);
    expect(result).toBeNull();
  });

  it('returns null with fewer than 2 snapshots', () => {
    expect(detectMarginCompression([makeModelSnapshot()], 0.05)).toBeNull();
  });
});

describe('detectRevenueAnomalies', () => {
  it('detects revenue significantly above/below mean', () => {
    const snapshots = [
      makeModelSnapshot({ id: 's1', period: '2024-01-01', revenue: 100000 }),
      makeModelSnapshot({ id: 's2', period: '2024-02-01', revenue: 102000 }),
      makeModelSnapshot({ id: 's3', period: '2024-03-01', revenue: 98000 }),
      makeModelSnapshot({ id: 's4', period: '2024-04-01', revenue: 101000 }),
      makeModelSnapshot({ id: 's5', period: '2024-05-01', revenue: 99000 }),
      makeModelSnapshot({ id: 's6', period: '2024-06-01', revenue: 100500 }),
      makeModelSnapshot({ id: 's7', period: '2024-07-01', revenue: 500000 }), // anomaly
    ];
    const results = detectRevenueAnomalies(snapshots, 2);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].type).toBe('anomaly');
  });

  it('returns empty when all values are within range', () => {
    const snapshots = [
      makeModelSnapshot({ period: '2024-01-01', revenue: 100000 }),
      makeModelSnapshot({ period: '2024-02-01', revenue: 101000 }),
      makeModelSnapshot({ period: '2024-03-01', revenue: 99000 }),
    ];
    const results = detectRevenueAnomalies(snapshots, 2);
    expect(results).toHaveLength(0);
  });

  it('returns empty with fewer than 3 snapshots', () => {
    expect(detectRevenueAnomalies([makeModelSnapshot()], 2)).toHaveLength(0);
  });
});

describe('flagRunwayRisk', () => {
  it('flags when runway is below threshold', () => {
    const snapshots = [
      makeModelSnapshot({ id: 's1', period: '2024-01-01', burn_rate: 20000, runway_months: 4, closing_cash: 80000 }),
    ];
    const result = flagRunwayRisk(snapshots, 6);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('risk');
  });

  it('returns null when runway is above threshold', () => {
    const snapshots = [
      makeModelSnapshot({ period: '2024-01-01', burn_rate: 10000, runway_months: 12, closing_cash: 120000 }),
    ];
    const result = flagRunwayRisk(snapshots, 6);
    expect(result).toBeNull();
  });

  it('returns null when not burning cash', () => {
    const snapshots = [
      makeModelSnapshot({ period: '2024-01-01', burn_rate: 0 }),
    ];
    const result = flagRunwayRisk(snapshots, 6);
    expect(result).toBeNull();
  });
});

describe('detectBurnAcceleration', () => {
  it('detects accelerating burn rate', () => {
    const snapshots = [
      makeModelSnapshot({ id: 's1', period: '2024-01-01', burn_rate: 10000 }),
      makeModelSnapshot({ id: 's2', period: '2024-02-01', burn_rate: 12000 }),
      makeModelSnapshot({ id: 's3', period: '2024-03-01', burn_rate: 15000 }),
      makeModelSnapshot({ id: 's4', period: '2024-04-01', burn_rate: 18000 }),
    ];
    const result = detectBurnAcceleration(snapshots);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('risk');
  });

  it('returns null when burn rate is stable', () => {
    const snapshots = [
      makeModelSnapshot({ period: '2024-01-01', burn_rate: 10000 }),
      makeModelSnapshot({ period: '2024-02-01', burn_rate: 10000 }),
      makeModelSnapshot({ period: '2024-03-01', burn_rate: 10000 }),
    ];
    const result = detectBurnAcceleration(snapshots);
    expect(result).toBeNull();
  });

  it('returns null with fewer than 3 snapshots', () => {
    expect(detectBurnAcceleration([makeModelSnapshot()])).toBeNull();
  });
});

describe('flagPoorUnitEconomics', () => {
  it('flags segments below LTV:CAC threshold', () => {
    const ue = [
      makeUnitEconomicsSnapshot({ id: 'ue1', ltv_cac_ratio: 2, segment_label: 'Product A', cac: 100, ltv: 200 }),
    ];
    const results = flagPoorUnitEconomics(ue, 3);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('risk');
  });

  it('does not flag segments above threshold', () => {
    const ue = [
      makeUnitEconomicsSnapshot({ ltv_cac_ratio: 5 }),
    ];
    const results = flagPoorUnitEconomics(ue, 3);
    expect(results).toHaveLength(0);
  });

  it('does not flag when ratio is zero', () => {
    const ue = [
      makeUnitEconomicsSnapshot({ ltv_cac_ratio: 0 }),
    ];
    const results = flagPoorUnitEconomics(ue, 3);
    expect(results).toHaveLength(0);
  });
});

describe('runAllAnalyses', () => {
  it('combines results from all analysis functions', () => {
    const snapshots = [
      makeModelSnapshot({ id: 's1', period: '2024-01-01', gross_margin_pct: 0.65, revenue: 100000, burn_rate: 10000, runway_months: 4, closing_cash: 40000 }),
      makeModelSnapshot({ id: 's2', period: '2024-02-01', gross_margin_pct: 0.55, revenue: 100000, burn_rate: 12000, runway_months: 3, closing_cash: 36000 }),
      makeModelSnapshot({ id: 's3', period: '2024-03-01', gross_margin_pct: 0.45, revenue: 100000, burn_rate: 15000, runway_months: 2, closing_cash: 30000 }),
    ];
    const ue = [
      makeUnitEconomicsSnapshot({ id: 'ue1', ltv_cac_ratio: 1.5, segment_label: 'Product A', cac: 100, ltv: 150 }),
    ];

    const results = runAllAnalyses(snapshots, ue);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((r) => r.type && r.title && r.body && r.confidenceScore > 0)).toBe(true);
  });

  it('returns empty when no issues found', () => {
    const snapshots = [
      makeModelSnapshot({ gross_margin_pct: 0.65, burn_rate: 0, runway_months: 0 }),
    ];
    const results = runAllAnalyses(snapshots, []);
    expect(results).toHaveLength(0);
  });
});
