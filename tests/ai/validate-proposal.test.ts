import { describe, it, expect } from 'vitest';
import { validateProposedChanges, detectConflicts } from '@/lib/ai/validate-proposal';
import type { ProposedAssumptionChange } from '@/types';

function makeChange(overrides: Partial<ProposedAssumptionChange> = {}): ProposedAssumptionChange {
  return {
    category: 'growth_rates',
    key: 'revenue_growth_rate',
    label: 'Revenue Growth Rate',
    type: 'percentage',
    current_value: 0.05,
    new_value: 0.1,
    reasoning: 'Increase growth',
    effective_from: '2024-01-01',
    ...overrides,
  };
}

describe('validateProposedChanges', () => {
  it('returns no warnings for valid proposals', () => {
    const changes = [makeChange({ new_value: 0.1 })];
    const warnings = validateProposedChanges(changes);
    expect(warnings).toEqual([]);
  });

  it('rejects more than 5 changes', () => {
    const changes = Array.from({ length: 6 }, (_, i) =>
      makeChange({ key: `key_${i}`, new_value: 0.01 * i })
    );
    const warnings = validateProposedChanges(changes);
    expect(warnings).toContainEqual(
      expect.objectContaining({ severity: 'error', message: expect.stringContaining('Maximum 5') })
    );
  });

  it('rejects variable_cost_rate > 1.0', () => {
    const changes = [makeChange({ key: 'variable_cost_rate', type: 'decimal', new_value: 1.5 })];
    const warnings = validateProposedChanges(changes);
    expect(warnings).toContainEqual(
      expect.objectContaining({ field: 'variable_cost_rate', severity: 'error' })
    );
  });

  it('rejects variable_cost_rate < 0', () => {
    const changes = [makeChange({ key: 'variable_cost_rate', type: 'decimal', new_value: -0.1 })];
    const warnings = validateProposedChanges(changes);
    expect(warnings).toContainEqual(
      expect.objectContaining({ field: 'variable_cost_rate', severity: 'error' })
    );
  });

  it('warns on revenue_growth_rate outside [-1.0, 10.0]', () => {
    const changes = [makeChange({ key: 'revenue_growth_rate', new_value: 15.0 })];
    const warnings = validateProposedChanges(changes);
    expect(warnings).toContainEqual(
      expect.objectContaining({ field: 'revenue_growth_rate', severity: 'warning' })
    );
  });

  it('warns on percentage type outside [-1.0, 1.0]', () => {
    const changes = [makeChange({ key: 'seasonality_factor', type: 'percentage', new_value: 2.0 })];
    const warnings = validateProposedChanges(changes);
    expect(warnings).toContainEqual(
      expect.objectContaining({ severity: 'warning', message: expect.stringContaining('Percentage') })
    );
  });

  it('warns on negative currency for fixed_costs', () => {
    const changes = [makeChange({ key: 'fixed_costs', type: 'currency', new_value: -500 })];
    const warnings = validateProposedChanges(changes);
    expect(warnings).toContainEqual(
      expect.objectContaining({ field: 'fixed_costs', severity: 'warning' })
    );
  });

  it('allows valid variable_cost_rate in [0, 1.0]', () => {
    const changes = [makeChange({ key: 'variable_cost_rate', type: 'decimal', new_value: 0.35 })];
    const warnings = validateProposedChanges(changes);
    expect(warnings).toEqual([]);
  });
});

describe('detectConflicts', () => {
  it('detects duplicate keys', () => {
    const changes = [
      makeChange({ key: 'revenue_growth_rate', new_value: 0.1 }),
      makeChange({ key: 'revenue_growth_rate', new_value: 0.2 }),
    ];
    const warnings = detectConflicts(changes);
    expect(warnings).toContainEqual(
      expect.objectContaining({ severity: 'error', message: expect.stringContaining('Duplicate') })
    );
  });

  it('detects contradictory revenue decline + cost increase', () => {
    const changes = [
      makeChange({ key: 'revenue_growth_rate', new_value: -0.1, current_value: 0.05 }),
      makeChange({ key: 'fixed_costs', type: 'currency', new_value: 10000, current_value: 5000 }),
    ];
    const warnings = detectConflicts(changes);
    expect(warnings).toContainEqual(
      expect.objectContaining({ severity: 'warning', message: expect.stringContaining('contradictory') })
    );
  });

  it('returns no warnings for non-contradictory changes', () => {
    const changes = [
      makeChange({ key: 'revenue_growth_rate', new_value: 0.1 }),
      makeChange({ key: 'fixed_costs', type: 'currency', new_value: 10000, current_value: 5000 }),
    ];
    const warnings = detectConflicts(changes);
    expect(warnings).toEqual([]);
  });
});
