'use client';

/**
 * Global period selection hook.
 *
 * Uses URL search params as the source of truth so period selection
 * persists across navigation, is bookmarkable, and supports back-button.
 *
 * URL schema:
 *   ?period=2025-06-01&mode=monthly&compare=none
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAccountingConfig } from '@/components/providers/accounting-config-context';
import {
  getFinancialQuarter,
  groupByFinancialQuarter,
  getFinancialYearStart,
} from '@/lib/financial/periods';

// ─── Types ──────────────────────────────────────────────────────────

export type PeriodMode = 'monthly' | 'quarterly' | 'annual';
export type ComparisonMode = 'none' | 'prior_period' | 'prior_year';

export interface GlobalPeriodState {
  /** The primary selected period (YYYY-MM-01). */
  period: string;
  /** Display mode: monthly, quarterly, or annual. */
  mode: PeriodMode;
  /** Comparison mode: none, prior period, or prior year. */
  compare: ComparisonMode;
  /** Expanded period list based on mode (single month, quarter months, or full year). */
  selectedPeriods: string[];
  /** The comparison period (null if compare === 'none'). */
  comparisonPeriod: string | null;
  /** All available periods from the org data. */
  availablePeriods: string[];
  /** FY label e.g. "Apr 2025 – Mar 2026". */
  fyLabel: string;
}

export interface GlobalPeriodActions {
  setPeriod: (period: string) => void;
  setMode: (mode: PeriodMode) => void;
  setCompare: (compare: ComparisonMode) => void;
  /** Navigate to the previous period (respects mode). */
  goBack: () => void;
  /** Navigate to the next period (respects mode). */
  goForward: () => void;
  /** Whether there's a previous period available. */
  canGoBack: boolean;
  /** Whether there's a next period available. */
  canGoForward: boolean;
}

// ─── Hook ──────────────────────────────────────────────────────────��

export function useGlobalPeriod(
  availablePeriods: string[],
): GlobalPeriodState & GlobalPeriodActions {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const config = useAccountingConfig();

  // Sorted ascending for navigation
  const sortedPeriods = useMemo(
    () => [...availablePeriods].sort(),
    [availablePeriods],
  );

  // Read from URL (with defaults)
  const periodParam = searchParams.get('period');
  const modeParam = searchParams.get('mode') as PeriodMode | null;
  const compareParam = searchParams.get('compare') as ComparisonMode | null;

  const mode: PeriodMode = modeParam ?? 'monthly';
  const compare: ComparisonMode = compareParam ?? 'none';

  // Default period: latest available
  const period = useMemo(() => {
    if (periodParam && sortedPeriods.includes(periodParam)) return periodParam;
    return sortedPeriods[sortedPeriods.length - 1] ?? '';
  }, [periodParam, sortedPeriods]);

  // Expand period by mode
  const selectedPeriods = useMemo(() => {
    if (!period || sortedPeriods.length === 0) return [];

    switch (mode) {
      case 'monthly':
        return [period];

      case 'quarterly': {
        const { label } = getFinancialQuarter(period, config.yearEndMonth);
        const groups = groupByFinancialQuarter(sortedPeriods, config.yearEndMonth);
        return groups.get(label) ?? [period];
      }

      case 'annual': {
        const d = new Date(period);
        const fyStart = getFinancialYearStart(d, config.yearEndMonth);
        const fyStartStr = `${fyStart.getFullYear()}-${String(fyStart.getMonth() + 1).padStart(2, '0')}-01`;
        // End month of FY
        const endMonth = config.yearEndMonth;
        const endYear = endMonth <= fyStart.getMonth() + 1
          ? fyStart.getFullYear() + 1
          : fyStart.getFullYear();
        const fyEndStr = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
        return sortedPeriods.filter((p) => p >= fyStartStr && p <= fyEndStr);
      }

      default:
        return [period];
    }
  }, [period, mode, sortedPeriods, config.yearEndMonth]);

  // Compute comparison period
  const comparisonPeriod = useMemo(() => {
    if (compare === 'none' || !period) return null;

    const d = new Date(period);
    if (compare === 'prior_period') {
      d.setMonth(d.getMonth() - 1);
    } else if (compare === 'prior_year') {
      d.setFullYear(d.getFullYear() - 1);
    }

    const target = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    // Return even if not in available periods (caller can check)
    return target;
  }, [period, compare]);

  // URL writer (shallow replace, no scroll)
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === 'none' && key === 'compare') {
          params.delete(key);
        } else if (value === 'monthly' && key === 'mode') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  // Navigation
  const periodIndex = sortedPeriods.indexOf(period);
  const canGoBack = periodIndex > 0;
  const canGoForward = periodIndex < sortedPeriods.length - 1;

  const setPeriod = useCallback(
    (p: string) => updateParams({ period: p }),
    [updateParams],
  );
  const setMode = useCallback(
    (m: PeriodMode) => updateParams({ mode: m }),
    [updateParams],
  );
  const setCompare = useCallback(
    (c: ComparisonMode) => updateParams({ compare: c }),
    [updateParams],
  );
  const goBack = useCallback(() => {
    if (canGoBack) updateParams({ period: sortedPeriods[periodIndex - 1] });
  }, [canGoBack, periodIndex, sortedPeriods, updateParams]);
  const goForward = useCallback(() => {
    if (canGoForward) updateParams({ period: sortedPeriods[periodIndex + 1] });
  }, [canGoForward, periodIndex, sortedPeriods, updateParams]);

  return {
    period,
    mode,
    compare,
    selectedPeriods,
    comparisonPeriod,
    availablePeriods: sortedPeriods,
    fyLabel: config.fyLabel,
    setPeriod,
    setMode,
    setCompare,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
  };
}
