import type { AssumptionCategory } from '@/types';
import { createHash } from 'crypto';

// === Types ===

export type AssumptionInput = {
  key: string;
  category: AssumptionCategory;
  type: string;
  value: number;
  effective_from: string;
  effective_to: string | null;
};

export type ResolvedAssumptions = Map<string, number>;

// === Pure Functions ===

/**
 * Resolve all assumption values for a specific period date.
 * For each key, pick the value whose effective_from <= period
 * and (effective_to is null OR effective_to >= period).
 * If multiple match, use the one with the latest effective_from.
 */
export function resolveAssumptionsForPeriod(
  assumptions: AssumptionInput[],
  period: string
): ResolvedAssumptions {
  const resolved = new Map<string, number>();
  const latestFrom = new Map<string, string>();

  for (const a of assumptions) {
    if (a.effective_from > period) continue;
    if (a.effective_to !== null && a.effective_to < period) continue;

    const existingFrom = latestFrom.get(a.key);
    if (!existingFrom || a.effective_from > existingFrom) {
      resolved.set(a.key, a.value);
      latestFrom.set(a.key, a.effective_from);
    }
  }

  return resolved;
}

/**
 * Generate an array of period strings (YYYY-MM-01) from
 * baseStart through baseEnd + forecastHorizonMonths.
 */
export function generatePeriodTimeline(
  baseStart: string,
  baseEnd: string,
  forecastHorizonMonths: number
): string[] {
  const periods: string[] = [];
  const start = new Date(baseStart);
  const end = new Date(baseEnd);

  // Add forecast months beyond the base end
  const forecastEnd = new Date(end);
  forecastEnd.setMonth(forecastEnd.getMonth() + forecastHorizonMonths);

  const current = new Date(start);
  while (current <= forecastEnd) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    periods.push(`${year}-${month}-01`);
    current.setMonth(current.getMonth() + 1);
  }

  return periods;
}

/**
 * Compute a deterministic SHA-256 hash of a sorted assumptions array.
 * Used to verify that two model runs used identical inputs.
 */
export function hashAssumptions(assumptions: AssumptionInput[]): string {
  const sorted = [...assumptions].sort((a, b) => {
    const keyCompare = a.key.localeCompare(b.key);
    if (keyCompare !== 0) return keyCompare;
    return a.effective_from.localeCompare(b.effective_from);
  });

  const serialized = JSON.stringify(
    sorted.map((a) => ({
      key: a.key,
      value: a.value,
      effective_from: a.effective_from,
      effective_to: a.effective_to,
    }))
  );

  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Validate that all required assumption keys are present.
 * Returns array of missing keys.
 */
export function validateAssumptionCompleteness(
  assumptions: AssumptionInput[],
  requiredKeys: string[]
): string[] {
  const presentKeys = new Set(assumptions.map((a) => a.key));
  return requiredKeys.filter((key) => !presentKeys.has(key));
}

/**
 * Filter assumptions by category.
 */
export function filterByCategory(
  assumptions: AssumptionInput[],
  category: AssumptionCategory
): AssumptionInput[] {
  return assumptions.filter((a) => a.category === category);
}
