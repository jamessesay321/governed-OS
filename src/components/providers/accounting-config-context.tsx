'use client';

import { createContext, useContext, useMemo } from 'react';
import {
  DEFAULT_YEAR_END_MONTH,
  DEFAULT_YEAR_END_DAY,
  getFinancialYearStart,
  getFinancialYearEnd,
  getFinancialYearLabel,
  getCurrentFYStartPeriod,
  getYTDPeriods,
  getFinancialQuarter,
} from '@/lib/financial/periods';

// ─── Types ──────────────────────────────────────────────────────────

export interface AccountingConfigValue {
  /** Financial year-end month (1-12). December = calendar year. */
  yearEndMonth: number;
  /** Financial year-end day (1-31). */
  yearEndDay: number;
  /** Base currency code (e.g. 'GBP'). */
  baseCurrency: string;
  /** Whether org config has been loaded from Xero. */
  isConfigured: boolean;
}

export interface AccountingConfigHelpers extends AccountingConfigValue {
  /** FY start date for the current date. */
  fyStart: Date;
  /** FY end date for the current date. */
  fyEnd: Date;
  /** Human-readable FY label, e.g. "Apr 2025 - Mar 2026". */
  fyLabel: string;
  /** Current FY start as YYYY-MM-01 string. */
  fyStartPeriod: string;
  /** Filter periods to YTD within this FY. */
  getYTD: (periods: string[]) => string[];
  /** Get FY quarter info for a period string. */
  getQuarter: (period: string) => { quarter: number; label: string; year: number };
}

// ─── Context ────────────────────────────────────────────────────────

const AccountingConfigContext = createContext<AccountingConfigHelpers | null>(null);

// ─── Provider ───────────────────────────────────────────────────────

export function AccountingConfigProvider({
  children,
  yearEndMonth = DEFAULT_YEAR_END_MONTH,
  yearEndDay = DEFAULT_YEAR_END_DAY,
  baseCurrency = 'GBP',
  isConfigured = false,
}: {
  children: React.ReactNode;
  yearEndMonth?: number;
  yearEndDay?: number;
  baseCurrency?: string;
  isConfigured?: boolean;
}) {
  const value = useMemo<AccountingConfigHelpers>(() => {
    const now = new Date();
    const fyStart = getFinancialYearStart(now, yearEndMonth);
    const fyEnd = getFinancialYearEnd(now, yearEndMonth, yearEndDay);
    const fyLabel = getFinancialYearLabel(yearEndMonth);
    const fyStartPeriod = getCurrentFYStartPeriod(yearEndMonth);

    return {
      yearEndMonth,
      yearEndDay,
      baseCurrency,
      isConfigured,
      fyStart,
      fyEnd,
      fyLabel,
      fyStartPeriod,
      getYTD: (periods: string[]) => getYTDPeriods(periods, yearEndMonth),
      getQuarter: (period: string) => getFinancialQuarter(period, yearEndMonth),
    };
  }, [yearEndMonth, yearEndDay, baseCurrency, isConfigured]);

  return (
    <AccountingConfigContext.Provider value={value}>
      {children}
    </AccountingConfigContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────

/**
 * Access accounting config and FY-aware helpers.
 * Falls back to calendar year defaults if no provider wraps the tree.
 */
export function useAccountingConfig(): AccountingConfigHelpers {
  const ctx = useContext(AccountingConfigContext);
  if (ctx) return ctx;

  // Graceful fallback: calendar year defaults (no provider)
  const now = new Date();
  return {
    yearEndMonth: DEFAULT_YEAR_END_MONTH,
    yearEndDay: DEFAULT_YEAR_END_DAY,
    baseCurrency: 'GBP',
    isConfigured: false,
    fyStart: getFinancialYearStart(now, DEFAULT_YEAR_END_MONTH),
    fyEnd: getFinancialYearEnd(now, DEFAULT_YEAR_END_MONTH, DEFAULT_YEAR_END_DAY),
    fyLabel: getFinancialYearLabel(DEFAULT_YEAR_END_MONTH),
    fyStartPeriod: getCurrentFYStartPeriod(DEFAULT_YEAR_END_MONTH),
    getYTD: (periods: string[]) => getYTDPeriods(periods, DEFAULT_YEAR_END_MONTH),
    getQuarter: (period: string) => getFinancialQuarter(period, DEFAULT_YEAR_END_MONTH),
  };
}
