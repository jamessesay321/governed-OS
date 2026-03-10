import { describe, it, expect } from 'vitest';
import {
  resolveAssumptionsForPeriod,
  generatePeriodTimeline,
  hashAssumptions,
  validateAssumptionCompleteness,
  filterByCategory,
} from '@/lib/scenarios/assumptions';
import { makeAssumptionInput } from './factories';

describe('resolveAssumptionsForPeriod', () => {
  it('resolves a single assumption for the period', () => {
    const assumptions = [
      makeAssumptionInput({ key: 'growth', value: 0.05, effective_from: '2024-01-01' }),
    ];
    const result = resolveAssumptionsForPeriod(assumptions, '2024-06-01');
    expect(result.get('growth')).toBe(0.05);
  });

  it('picks the latest effective_from when multiple match', () => {
    const assumptions = [
      makeAssumptionInput({ key: 'growth', value: 0.05, effective_from: '2024-01-01' }),
      makeAssumptionInput({ key: 'growth', value: 0.08, effective_from: '2024-04-01' }),
    ];
    const result = resolveAssumptionsForPeriod(assumptions, '2024-06-01');
    expect(result.get('growth')).toBe(0.08);
  });

  it('excludes assumptions not yet effective', () => {
    const assumptions = [
      makeAssumptionInput({ key: 'growth', value: 0.10, effective_from: '2025-01-01' }),
    ];
    const result = resolveAssumptionsForPeriod(assumptions, '2024-06-01');
    expect(result.has('growth')).toBe(false);
  });

  it('excludes assumptions past their effective_to', () => {
    const assumptions = [
      makeAssumptionInput({
        key: 'growth',
        value: 0.05,
        effective_from: '2024-01-01',
        effective_to: '2024-03-01',
      }),
    ];
    const result = resolveAssumptionsForPeriod(assumptions, '2024-06-01');
    expect(result.has('growth')).toBe(false);
  });

  it('includes assumptions where effective_to equals the period', () => {
    const assumptions = [
      makeAssumptionInput({
        key: 'growth',
        value: 0.05,
        effective_from: '2024-01-01',
        effective_to: '2024-06-01',
      }),
    ];
    const result = resolveAssumptionsForPeriod(assumptions, '2024-06-01');
    expect(result.get('growth')).toBe(0.05);
  });

  it('resolves multiple keys independently', () => {
    const assumptions = [
      makeAssumptionInput({ key: 'growth', value: 0.05 }),
      makeAssumptionInput({ key: 'cost_rate', value: 0.35 }),
    ];
    const result = resolveAssumptionsForPeriod(assumptions, '2024-06-01');
    expect(result.size).toBe(2);
    expect(result.get('growth')).toBe(0.05);
    expect(result.get('cost_rate')).toBe(0.35);
  });

  it('returns empty map when no assumptions match', () => {
    const result = resolveAssumptionsForPeriod([], '2024-06-01');
    expect(result.size).toBe(0);
  });
});

describe('generatePeriodTimeline', () => {
  it('generates periods from base start through base end plus forecast months', () => {
    const periods = generatePeriodTimeline('2024-01-01', '2024-03-01', 3);
    expect(periods).toEqual([
      '2024-01-01',
      '2024-02-01',
      '2024-03-01',
      '2024-04-01',
      '2024-05-01',
      '2024-06-01',
    ]);
  });

  it('handles single-month base period', () => {
    const periods = generatePeriodTimeline('2024-01-01', '2024-01-01', 2);
    expect(periods).toEqual([
      '2024-01-01',
      '2024-02-01',
      '2024-03-01',
    ]);
  });

  it('handles zero forecast months', () => {
    const periods = generatePeriodTimeline('2024-01-01', '2024-03-01', 0);
    expect(periods).toEqual([
      '2024-01-01',
      '2024-02-01',
      '2024-03-01',
    ]);
  });

  it('handles year boundary', () => {
    const periods = generatePeriodTimeline('2024-11-01', '2024-12-01', 2);
    expect(periods).toEqual([
      '2024-11-01',
      '2024-12-01',
      '2025-01-01',
      '2025-02-01',
    ]);
  });
});

describe('hashAssumptions', () => {
  it('produces a 64-character hex string', () => {
    const assumptions = [makeAssumptionInput()];
    const hash = hashAssumptions(assumptions);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces the same hash for the same inputs regardless of order', () => {
    const a = makeAssumptionInput({ key: 'a', value: 1 });
    const b = makeAssumptionInput({ key: 'b', value: 2 });
    const hash1 = hashAssumptions([a, b]);
    const hash2 = hashAssumptions([b, a]);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different values', () => {
    const hash1 = hashAssumptions([makeAssumptionInput({ value: 0.05 })]);
    const hash2 = hashAssumptions([makeAssumptionInput({ value: 0.10 })]);
    expect(hash1).not.toBe(hash2);
  });
});

describe('validateAssumptionCompleteness', () => {
  it('returns empty array when all required keys are present', () => {
    const assumptions = [
      makeAssumptionInput({ key: 'growth' }),
      makeAssumptionInput({ key: 'cost_rate' }),
    ];
    const missing = validateAssumptionCompleteness(assumptions, ['growth', 'cost_rate']);
    expect(missing).toEqual([]);
  });

  it('returns missing keys', () => {
    const assumptions = [makeAssumptionInput({ key: 'growth' })];
    const missing = validateAssumptionCompleteness(assumptions, ['growth', 'cost_rate', 'capex']);
    expect(missing).toEqual(['cost_rate', 'capex']);
  });

  it('returns all keys when assumptions array is empty', () => {
    const missing = validateAssumptionCompleteness([], ['a', 'b']);
    expect(missing).toEqual(['a', 'b']);
  });
});

describe('filterByCategory', () => {
  it('filters assumptions by category', () => {
    const assumptions = [
      makeAssumptionInput({ key: 'growth', category: 'growth_rates' }),
      makeAssumptionInput({ key: 'fixed', category: 'costs' }),
      makeAssumptionInput({ key: 'variable', category: 'costs' }),
    ];
    const costs = filterByCategory(assumptions, 'costs');
    expect(costs).toHaveLength(2);
    expect(costs.every((a) => a.category === 'costs')).toBe(true);
  });

  it('returns empty array when no matches', () => {
    const assumptions = [makeAssumptionInput({ category: 'growth_rates' })];
    const result = filterByCategory(assumptions, 'costs');
    expect(result).toEqual([]);
  });
});
