'use client';

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { formatKPIValue } from '@/lib/kpi/format';
import type { CalculatedKPI, KPICategory, KPIImportance } from '@/lib/kpi/format';
import { cn } from '@/lib/utils';
import { Check, X, TrendingUp, TrendingDown, Minus, Circle } from 'lucide-react';

type KPITableProps = {
  kpis: CalculatedKPI[];
  onSelectKPI: (kpi: CalculatedKPI) => void;
  selectedKPIKey?: string;
  currencyCode?: string;
};

/** Category display configuration */
const CATEGORY_CONFIG: Record<
  KPICategory,
  { letter: string; label: string; bg: string; text: string }
> = {
  profitability: {
    letter: 'A',
    label: 'PROFITABILITY',
    bg: 'bg-blue-100 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
  },
  activity: {
    letter: 'B',
    label: 'ACTIVITY',
    bg: 'bg-emerald-100 dark:bg-emerald-950',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  efficiency: {
    letter: 'C',
    label: 'EFFICIENCY',
    bg: 'bg-purple-100 dark:bg-purple-950',
    text: 'text-purple-700 dark:text-purple-300',
  },
  asset_usage: {
    letter: 'D',
    label: 'ASSET USAGE',
    bg: 'bg-orange-100 dark:bg-orange-950',
    text: 'text-orange-700 dark:text-orange-300',
  },
  liquidity: {
    letter: 'E',
    label: 'LIQUIDITY',
    bg: 'bg-red-100 dark:bg-red-950',
    text: 'text-red-700 dark:text-red-300',
  },
  coverage: {
    letter: 'F',
    label: 'COVERAGE',
    bg: 'bg-amber-100 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-300',
  },
};

/** Category display order */
const CATEGORY_ORDER: KPICategory[] = [
  'profitability',
  'activity',
  'efficiency',
  'asset_usage',
  'liquidity',
  'coverage',
];

/** Importance badge configuration */
const IMPORTANCE_CONFIG: Record<
  KPIImportance,
  { label: string; className: string }
> = {
  critical: {
    label: 'Critical',
    className:
      'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  },
  high: {
    label: 'High',
    className:
      'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  },
  medium: {
    label: 'Medium',
    className:
      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
  low: {
    label: 'Low',
    className:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
};

/**
 * Determine pass/fail status by comparing value against target.
 * Returns 'pass' if within target, 'fail' if not, 'critical' if severely off, 'none' if no target.
 */
function getPassFail(
  kpi: CalculatedKPI
): 'pass' | 'fail' | 'critical' | 'none' {
  const target = kpi.default_target;
  if (target === null || kpi.value === null) return 'none';

  const value = kpi.value;

  if (kpi.higher_is_better) {
    if (value >= target) return 'pass';
    // Critical if more than 30% below target
    if (value < target * 0.7) return 'critical';
    return 'fail';
  } else {
    if (value <= target) return 'pass';
    // Critical if more than 30% above target
    if (value > target * 1.3) return 'critical';
    return 'fail';
  }
}

/**
 * Calculate percentage difference from target.
 * Positive = favourable, Negative = unfavourable.
 */
function getVsTarget(kpi: CalculatedKPI): number | null {
  const target = kpi.default_target;
  if (target === null || target === 0 || kpi.value === null) return null;

  const diff = kpi.value - target;
  const pct = (diff / Math.abs(target)) * 100;

  // For metrics where lower is better, flip the sign for display
  return kpi.higher_is_better ? pct : -pct;
}

/**
 * Determine if a trend is good, bad, or neutral based on the KPI direction.
 */
function isTrendGood(kpi: CalculatedKPI): boolean | null {
  if (kpi.trend_direction === 'flat') return null;
  return kpi.higher_is_better
    ? kpi.trend_direction === 'up'
    : kpi.trend_direction === 'down';
}

/** Group KPIs by category in display order */
function groupByCategory(
  kpis: CalculatedKPI[]
): { category: KPICategory; kpis: CalculatedKPI[] }[] {
  const groups = new Map<KPICategory, CalculatedKPI[]>();

  for (const kpi of kpis) {
    const cat = kpi.category;
    if (!groups.has(cat)) {
      groups.set(cat, []);
    }
    groups.get(cat)!.push(kpi);
  }

  return CATEGORY_ORDER.filter((cat) => groups.has(cat)).map((cat) => ({
    category: cat,
    kpis: groups.get(cat)!,
  }));
}

export function KPITable({
  kpis,
  onSelectKPI,
  selectedKPIKey,
  currencyCode = 'GBP',
}: KPITableProps) {
  if (kpis.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">
          No KPI data available. Connect your accounting data first.
        </p>
      </div>
    );
  }

  const grouped = groupByCategory(kpis);

  return (
    <div className="space-y-6">
      {grouped.map(({ category, kpis: categoryKpis }) => {
        const config = CATEGORY_CONFIG[category];
        return (
          <div key={category} className="rounded-lg border bg-card overflow-hidden">
            {/* Category header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
              <span
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold',
                  config.bg,
                  config.text
                )}
              >
                {config.letter}
              </span>
              <span className="text-sm font-semibold tracking-wide text-foreground">
                {config.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {categoryKpis.length} metric{categoryKpis.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[240px]">Metric</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-center w-[60px]">Status</TableHead>
                  <TableHead className="text-center w-[60px]">Trend</TableHead>
                  <TableHead className="text-right">vs Target</TableHead>
                  <TableHead className="text-center">Importance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryKpis.map((kpi) => {
                  const passFail = getPassFail(kpi);
                  const vsTarget = getVsTarget(kpi);
                  const trendGood = isTrendGood(kpi);
                  const isSelected = kpi.key === selectedKPIKey;

                  return (
                    <TableRow
                      key={kpi.key}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isSelected && 'bg-muted/60 dark:bg-muted/40'
                      )}
                      onClick={() => onSelectKPI(kpi)}
                    >
                      {/* Metric name */}
                      <TableCell>
                        <div>
                          <span className="font-medium text-foreground">
                            {kpi.label}
                          </span>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                            {kpi.plainEnglish}
                          </p>
                        </div>
                      </TableCell>

                      {/* Result */}
                      <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                        {formatKPIValue(kpi.value, kpi.format, currencyCode)}
                      </TableCell>

                      {/* Target */}
                      <TableCell className="text-right font-mono text-sm text-muted-foreground tabular-nums">
                        {kpi.default_target !== null
                          ? formatKPIValue(kpi.default_target, kpi.format, currencyCode)
                          : (<span className="text-muted-foreground/50">--</span>)}
                      </TableCell>

                      {/* Pass/Fail status */}
                      <TableCell className="text-center">
                        <PassFailIndicator status={passFail} />
                      </TableCell>

                      {/* Trend */}
                      <TableCell className="text-center">
                        <TrendIndicator
                          direction={kpi.trend_direction}
                          isGood={trendGood}
                        />
                      </TableCell>

                      {/* vs Target */}
                      <TableCell className="text-right">
                        {vsTarget !== null ? (
                          <span
                            className={cn(
                              'text-sm font-mono tabular-nums',
                              vsTarget > 0
                                ? 'text-green-600 dark:text-green-400'
                                : vsTarget < 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {vsTarget > 0 ? '+' : ''}
                            {vsTarget.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 text-sm">--</span>
                        )}
                      </TableCell>

                      {/* Importance */}
                      <TableCell className="text-center">
                        <ImportanceBadge importance={kpi.importance} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </div>
  );
}

/** Green checkmark, red X, or red dot indicator */
function PassFailIndicator({ status }: { status: 'pass' | 'fail' | 'critical' | 'none' }) {
  switch (status) {
    case 'pass':
      return (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        </span>
      );
    case 'fail':
      return (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
          <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
        </span>
      );
    case 'critical':
      return (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
          <Circle className="h-3 w-3 fill-red-600 text-red-600 dark:fill-red-400 dark:text-red-400" />
        </span>
      );
    case 'none':
      return (
        <span className="text-muted-foreground/50 text-sm">--</span>
      );
  }
}

/** Trend arrow: green up, red down, amber sideways */
function TrendIndicator({
  direction,
  isGood,
}: {
  direction: 'up' | 'down' | 'flat';
  isGood: boolean | null;
}) {
  switch (direction) {
    case 'up':
      return (
        <TrendingUp
          className={cn(
            'h-4 w-4 mx-auto',
            isGood
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          )}
        />
      );
    case 'down':
      return (
        <TrendingDown
          className={cn(
            'h-4 w-4 mx-auto',
            isGood
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          )}
        />
      );
    case 'flat':
      return (
        <Minus className="h-4 w-4 mx-auto text-amber-500 dark:text-amber-400" />
      );
  }
}

/** Text badge for importance level */
function ImportanceBadge({ importance }: { importance: KPIImportance }) {
  const config = IMPORTANCE_CONFIG[importance];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
