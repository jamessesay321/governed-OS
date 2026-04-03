/**
 * Unified currency & number formatting for Advisory OS.
 *
 * SINGLE SOURCE OF TRUTH — every component that displays a monetary value,
 * percentage, or formatted number MUST import from here. No local
 * formatCurrency / formatPence / formatBalance functions allowed.
 *
 * Respects the organisation's base currency from Xero config.
 * Default: GBP / en-GB (Alonuko).
 */

import { getCurrencyConfig, type CurrencyConfig } from '@/lib/config/currencies';

// ---------------------------------------------------------------------------
// Currency formatting
// ---------------------------------------------------------------------------

/**
 * Format a monetary amount using the org's currency.
 *
 * Rules (from data-visualization-design skill):
 * - 0 decimals for whole amounts: £60,000
 * - 2 decimals only when fractional pence/cents exist: £60,000.50
 * - Thousands separators always
 * - Negative: (£5,200) with optional prefix
 *
 * @param amount  The amount in major units (pounds, not pence)
 * @param currencyCode  ISO 4217 code (default 'GBP')
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'GBP',
): string {
  const config = getCurrencyConfig(currencyCode);
  const hasFraction = amount % 1 !== 0;

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(amount);
}

/**
 * Format an amount stored in pence/cents → display in major units.
 * Most Xero-synced values and proposal prices are stored in pence.
 */
export function formatPence(
  pence: number,
  currencyCode: string = 'GBP',
): string {
  return formatCurrency(pence / 100, currencyCode);
}

/**
 * Compact currency for chart axes and KPI cards.
 * £1,200,000 → £1.2M | £45,000 → £45K | £800 → £800
 */
export function formatCurrencyCompact(
  amount: number,
  currencyCode: string = 'GBP',
): string {
  const config = getCurrencyConfig(currencyCode);

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * Format a balance that may be stored in pence, with explicit sign handling.
 * Used for bank account balances where negative = liability.
 */
export function formatBalance(
  balanceInPence: number,
  currencyCode: string = 'GBP',
): string {
  const major = balanceInPence / 100;
  return formatCurrency(major, currencyCode);
}

// ---------------------------------------------------------------------------
// Percentage formatting
// ---------------------------------------------------------------------------

/**
 * Format a percentage value.
 * - Input as decimal (0.423) or whole number (42.3) — caller specifies.
 * - Output: "42.3%" (1 decimal max, no trailing zeros)
 *
 * @param value       The percentage value
 * @param isDecimal   If true, multiply by 100 first (default false)
 */
export function formatPercent(
  value: number,
  isDecimal: boolean = false,
): string {
  const pct = isDecimal ? value * 100 : value;
  // Remove trailing zeros: 42.0% → 42%, 42.3% stays
  const formatted = pct.toFixed(1);
  return `${formatted.replace(/\.0$/, '')}%`;
}

// ---------------------------------------------------------------------------
// Generic number formatting
// ---------------------------------------------------------------------------

/**
 * Format a plain number with thousands separators.
 * No currency symbol. Used for counts, scores, etc.
 */
export function formatNumber(
  value: number,
  locale: string = 'en-GB',
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Chart axis formatter (returns a function for Recharts tickFormatter)
// ---------------------------------------------------------------------------

/**
 * Returns a tick formatter for Recharts Y-axes.
 * Uses compact notation: £1.2M, £45K, etc.
 */
export function chartAxisFormatter(
  currencyCode: string = 'GBP',
): (value: number) => string {
  return (value: number) => formatCurrencyCompact(value, currencyCode);
}

/**
 * Returns a tooltip formatter for Recharts.
 * Uses full currency formatting: £1,200,000
 */
export function chartTooltipFormatter(
  currencyCode: string = 'GBP',
): (value: number) => string {
  return (value: number) => formatCurrency(value, currencyCode);
}

// ---------------------------------------------------------------------------
// Re-export currency config for convenience
// ---------------------------------------------------------------------------

export { getCurrencyConfig, type CurrencyConfig };
