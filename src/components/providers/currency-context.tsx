'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { CurrencyConfig } from '@/lib/config/currencies';
import { getCurrencyConfig, CURRENCIES } from '@/lib/config/currencies';

interface CurrencyContextValue {
  currency: CurrencyConfig;
  setCurrencyCode: (code: string) => void;
  format: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  children,
  initialCurrency = 'GBP',
}: {
  children: React.ReactNode;
  initialCurrency?: string;
}) {
  const [currencyCode, setCurrencyCodeState] = useState(initialCurrency);

  const currency = useMemo(() => getCurrencyConfig(currencyCode), [currencyCode]);

  const setCurrencyCode = useCallback((code: string) => {
    const valid = CURRENCIES.find(c => c.code === code);
    if (valid) setCurrencyCodeState(code);
  }, []);

  const format = useCallback(
    (amount: number) =>
      new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount),
    [currency],
  );

  const value = useMemo(
    () => ({ currency, setCurrencyCode, format }),
    [currency, setCurrencyCode, format],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
