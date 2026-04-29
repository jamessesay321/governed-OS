'use client';

/**
 * use-persistent-report-state.ts
 *
 * Thin wrapper around useState that persists a ReportControlsState value
 * to localStorage under a page-scoped key. Used by the three Financials
 * pages (Income Statement, Balance Sheet, Cash Flow) so a user's chosen
 * view (Annual / Quarterly / Monthly) and selected periods are remembered
 * across visits.
 *
 * Keys:
 *   governed-os:report:{pageKey}        — the persisted state
 *
 * SSR-safe: only reads localStorage after mount (avoids hydration mismatch).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReportControlsState } from '@/components/financial/report-controls';

const STORAGE_NS = 'governed-os:report:';

type PersistedShape = Pick<
  ReportControlsState,
  'periodMode' | 'selectedPeriods' | 'comparisonMode' | 'viewMode'
>;

function keyFor(pageKey: string) {
  return `${STORAGE_NS}${pageKey}`;
}

/**
 * Load a persisted state partial from localStorage.
 * Returns null if nothing stored, storage unavailable, or payload is malformed.
 */
function loadPersisted(pageKey: string): PersistedShape | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(keyFor(pageKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.selectedPeriods)
    ) {
      return null;
    }
    return {
      periodMode: parsed.periodMode ?? 'annual',
      selectedPeriods: parsed.selectedPeriods ?? [],
      comparisonMode: parsed.comparisonMode ?? 'none',
      viewMode: parsed.viewMode ?? 'summary',
    };
  } catch {
    return null;
  }
}

function savePersisted(pageKey: string, state: ReportControlsState) {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedShape = {
      periodMode: state.periodMode,
      selectedPeriods: state.selectedPeriods,
      comparisonMode: state.comparisonMode,
      viewMode: state.viewMode,
    };
    window.localStorage.setItem(keyFor(pageKey), JSON.stringify(payload));
  } catch {
    // quota exceeded or private mode — fail silently
  }
}

/**
 * useState that auto-persists ReportControlsState to localStorage.
 *
 * Intentionally DOES NOT read from localStorage during initial render
 * (would cause SSR/hydration mismatch). Instead, after mount, if a
 * persisted payload exists we hydrate + re-filter its selectedPeriods
 * against the current availablePeriods (so stale periods aren't kept).
 *
 * @param pageKey       unique identifier for this page (e.g. 'cash-flow')
 * @param initial       the server-computed default state
 * @param availablePeriods — current set of periods available in data
 */
export function usePersistentReportState(
  pageKey: string,
  initial: ReportControlsState,
  availablePeriods: string[]
): [ReportControlsState, (state: ReportControlsState) => void] {
  const [state, setStateInternal] = useState<ReportControlsState>(initial);
  const hydratedRef = useRef(false);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const persisted = loadPersisted(pageKey);
    if (!persisted) return;

    // Intersect persisted periods with what's currently available.
    // If every persisted period is still available, use them as-is.
    // Otherwise, keep the defaults but at least restore the mode + viewMode.
    const validPersistedPeriods = persisted.selectedPeriods.filter((p) =>
      availablePeriods.includes(p)
    );

    if (validPersistedPeriods.length > 0) {
      setStateInternal((prev) => ({
        ...prev,
        periodMode: persisted.periodMode,
        selectedPeriods: validPersistedPeriods,
        comparisonMode: persisted.comparisonMode,
        viewMode: persisted.viewMode,
      }));
    } else {
      setStateInternal((prev) => ({
        ...prev,
        periodMode: persisted.periodMode,
        comparisonMode: persisted.comparisonMode,
        viewMode: persisted.viewMode,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  const setState = useCallback(
    (next: ReportControlsState) => {
      setStateInternal(next);
      savePersisted(pageKey, next);
    },
    [pageKey]
  );

  return [state, setState];
}
