'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PeriodSelectorProps {
  periods: string[];
  selected: string;
  onChange: (period: string) => void;
}

function formatPeriod(period: string): string {
  const date = new Date(period);
  return date.toLocaleDateString('en-AU', { year: 'numeric', month: 'long' });
}

export function PeriodSelector({
  periods,
  selected,
  onChange,
}: PeriodSelectorProps) {
  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent>
        {periods.map((period) => (
          <SelectItem key={period} value={period}>
            {formatPeriod(period)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
