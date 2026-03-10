import type { ProposedAssumptionChange } from '@/types';

export type ValidationWarning = {
  field: string;
  message: string;
  severity: 'error' | 'warning';
};

/**
 * Validate proposed assumption changes against business rules.
 * Pure function — no DB access, fully testable.
 */
export function validateProposedChanges(
  changes: ProposedAssumptionChange[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (changes.length > 5) {
    warnings.push({
      field: 'assumption_changes',
      message: 'Maximum 5 assumption changes per request',
      severity: 'error',
    });
  }

  for (const change of changes) {
    // variable_cost_rate must be in [0, 1.0]
    if (change.key === 'variable_cost_rate') {
      if (change.new_value < 0 || change.new_value > 1.0) {
        warnings.push({
          field: change.key,
          message: `variable_cost_rate must be between 0 and 1.0, got ${change.new_value}`,
          severity: 'error',
        });
      }
    }

    // revenue_growth_rate should be in [-1.0, 10.0]
    if (change.key === 'revenue_growth_rate') {
      if (change.new_value < -1.0 || change.new_value > 10.0) {
        warnings.push({
          field: change.key,
          message: `revenue_growth_rate should be between -1.0 and 10.0, got ${change.new_value}`,
          severity: 'warning',
        });
      }
    }

    // Percentage types clamped to [-1.0, 1.0]
    if (change.type === 'percentage') {
      if (change.new_value < -1.0 || change.new_value > 1.0) {
        warnings.push({
          field: change.key,
          message: `Percentage value for ${change.label} should be between -1.0 and 1.0, got ${change.new_value}`,
          severity: 'warning',
        });
      }
    }

    // Currency types must not be negative where nonsensical
    if (change.type === 'currency' && change.new_value < 0) {
      const nonsensicalNegativeKeys = ['fixed_costs', 'capital_expenditure'];
      if (nonsensicalNegativeKeys.includes(change.key)) {
        warnings.push({
          field: change.key,
          message: `${change.label} should not be negative, got ${change.new_value}`,
          severity: 'warning',
        });
      }
    }
  }

  return warnings;
}

/**
 * Detect conflicting changes within a single proposal.
 * Pure function — no DB access, fully testable.
 */
export function detectConflicts(
  changes: ProposedAssumptionChange[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Check for duplicate keys
  const keys = changes.map((c) => c.key);
  const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
  for (const dup of [...new Set(duplicates)]) {
    warnings.push({
      field: dup,
      message: `Duplicate key "${dup}" in the same request`,
      severity: 'error',
    });
  }

  // Check for contradictory changes
  const changeMap = new Map(changes.map((c) => [c.key, c]));

  const revenueGrowth = changeMap.get('revenue_growth_rate');
  const fixedCosts = changeMap.get('fixed_costs');

  // Negative revenue growth + increasing fixed costs is contradictory
  if (revenueGrowth && fixedCosts) {
    if (
      revenueGrowth.new_value < 0 &&
      fixedCosts.current_value !== null &&
      fixedCosts.new_value > fixedCosts.current_value
    ) {
      warnings.push({
        field: 'revenue_growth_rate+fixed_costs',
        message: 'Reducing revenue growth while increasing fixed costs may be contradictory',
        severity: 'warning',
      });
    }
  }

  return warnings;
}
