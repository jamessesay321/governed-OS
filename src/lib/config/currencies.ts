export interface CurrencyConfig {
  code: string;        // ISO 4217
  symbol: string;      // £, $, €, etc.
  name: string;        // "British Pound"
  locale: string;      // "en-GB"
  flag: string;        // emoji flag
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'GBP', symbol: '\u00a3', name: 'British Pound', locale: 'en-GB', flag: '\ud83c\uddec\ud83c\udde7' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', flag: '\ud83c\uddfa\ud83c\uddf8' },
  { code: 'EUR', symbol: '\u20ac', name: 'Euro', locale: 'de-DE', flag: '\ud83c\uddea\ud83c\uddfa' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA', flag: '\ud83c\udde8\ud83c\udde6' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', flag: '\ud83c\udde6\ud83c\uddfa' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ', flag: '\ud83c\uddf3\ud83c\uddff' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA', flag: '\ud83c\uddff\ud83c\udde6' },
  { code: 'NGN', symbol: '\u20a6', name: 'Nigerian Naira', locale: 'en-NG', flag: '\ud83c\uddf3\ud83c\uddec' },
  { code: 'INR', symbol: '\u20b9', name: 'Indian Rupee', locale: 'en-IN', flag: '\ud83c\uddee\ud83c\uddf3' },
  { code: 'AED', symbol: '\u062f.\u0625', name: 'UAE Dirham', locale: 'ar-AE', flag: '\ud83c\udde6\ud83c\uddea' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', flag: '\ud83c\uddf8\ud83c\uddec' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH', flag: '\ud83c\udde8\ud83c\udded' },
];

export function getCurrencyConfig(code: string): CurrencyConfig {
  return CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0];
}

export function formatCurrency(amount: number, currencyCode: string = 'GBP'): string {
  const config = getCurrencyConfig(currencyCode);
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
