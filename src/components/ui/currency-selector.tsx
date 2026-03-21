'use client';

import { CURRENCIES } from '@/lib/config/currencies';
import { useCurrency } from '@/components/providers/currency-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function CurrencySelector() {
  const { currency, setCurrencyCode } = useCurrency();

  return (
    <Select value={currency.code} onValueChange={setCurrencyCode}>
      <SelectTrigger size="sm" className="w-auto gap-1.5">
        <SelectValue>
          <span className="mr-1">{currency.flag}</span>
          <span>{currency.code}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {CURRENCIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <span className="mr-2">{c.flag}</span>
            <span className="font-medium">{c.code}</span>
            <span className="text-muted-foreground ml-2 text-xs">{c.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
