'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BenchmarkRatio {
  name: string;
  yourValue: number;
  industryAvg: number;
  unit: '%' | 'x' | 'days';
  higherIsBetter: boolean;
}

interface IndustryBenchmarkWidgetProps {
  ratios?: BenchmarkRatio[];
  industry?: string;
}

const PLACEHOLDER_RATIOS: BenchmarkRatio[] = [
  { name: 'Gross Margin', yourValue: 65, industryAvg: 55, unit: '%', higherIsBetter: true },
  { name: 'Net Margin', yourValue: 18, industryAvg: 12, unit: '%', higherIsBetter: true },
  { name: 'Current Ratio', yourValue: 1.65, industryAvg: 1.5, unit: 'x', higherIsBetter: true },
  { name: 'DSO', yourValue: 38, industryAvg: 45, unit: 'days', higherIsBetter: false },
  { name: 'Revenue Growth', yourValue: 18, industryAvg: 10, unit: '%', higherIsBetter: true },
];

function formatValue(value: number, unit: string): string {
  if (unit === 'x') return `${value.toFixed(2)}x`;
  if (unit === 'days') return `${value.toFixed(0)} days`;
  return `${value.toFixed(1)}%`;
}

function getStatus(
  yourValue: number,
  industryAvg: number,
  higherIsBetter: boolean
): 'above' | 'at' | 'below' {
  const diff = ((yourValue - industryAvg) / industryAvg) * 100;
  if (Math.abs(diff) < 5) return 'at';
  if (higherIsBetter) return diff > 0 ? 'above' : 'below';
  return diff < 0 ? 'above' : 'below';
}

const STATUS_STYLES = {
  above: 'bg-emerald-100 text-emerald-700',
  at: 'bg-amber-100 text-amber-700',
  below: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  above: 'Above avg',
  at: 'At avg',
  below: 'Below avg',
};

export function IndustryBenchmarkWidget({ ratios, industry = 'Professional Services' }: IndustryBenchmarkWidgetProps) {
  const items = ratios ?? PLACEHOLDER_RATIOS;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Industry Benchmark</CardTitle>
          <Badge variant="secondary" className="text-[10px]">{industry}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No benchmark data</p>
        ) : (
          <div className="space-y-2">
            {items.map((ratio) => {
              const status = getStatus(ratio.yourValue, ratio.industryAvg, ratio.higherIsBetter);
              return (
                <div
                  key={ratio.name}
                  className="flex items-center justify-between rounded px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{ratio.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Industry: {formatValue(ratio.industryAvg, ratio.unit)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-sm font-bold">{formatValue(ratio.yourValue, ratio.unit)}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-[10px] text-muted-foreground italic">
              Placeholder data. Industry benchmarks will auto-populate when available.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
