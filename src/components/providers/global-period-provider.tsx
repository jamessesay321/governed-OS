'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { Suspense } from 'react';
import {
  useGlobalPeriod,
  type GlobalPeriodState,
  type GlobalPeriodActions,
} from '@/lib/hooks/use-global-period';

// ─── Context ────────────────────────────────────────────────────────

type GlobalPeriodContextValue = GlobalPeriodState & GlobalPeriodActions;

const GlobalPeriodContext = createContext<GlobalPeriodContextValue | null>(null);

// ─── Provider (inner) ───────────────────────────────────────────────

function GlobalPeriodProviderInner({
  availablePeriods,
  children,
}: {
  availablePeriods: string[];
  children: ReactNode;
}) {
  const value = useGlobalPeriod(availablePeriods);

  return (
    <GlobalPeriodContext.Provider value={value}>
      {children}
    </GlobalPeriodContext.Provider>
  );
}

// ─── Provider (exported — wraps with Suspense for useSearchParams) ──

/**
 * Client-component wrapper for the global period context.
 * Must be wrapped in Suspense because useSearchParams() requires it
 * in Next.js App Router.
 */
export function GlobalPeriodProvider({
  availablePeriods,
  children,
}: {
  availablePeriods: string[];
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <GlobalPeriodProviderInner availablePeriods={availablePeriods}>
        {children}
      </GlobalPeriodProviderInner>
    </Suspense>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────

/**
 * Access global period state and actions from any client component
 * within the dashboard layout.
 */
export function useGlobalPeriodContext(): GlobalPeriodContextValue {
  const ctx = useContext(GlobalPeriodContext);
  if (!ctx) {
    throw new Error(
      'useGlobalPeriodContext must be used within <GlobalPeriodProvider>',
    );
  }
  return ctx;
}

/**
 * Optional version that returns null if no provider exists.
 * Useful for components that may render outside the dashboard.
 */
export function useGlobalPeriodOptional(): GlobalPeriodContextValue | null {
  return useContext(GlobalPeriodContext);
}
