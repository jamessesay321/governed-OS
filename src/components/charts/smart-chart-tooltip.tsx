'use client';

interface SmartTooltipPayload {
  name: string;
  value: number;
  dataKey: string;
  payload: Record<string, unknown>;
}

interface SmartChartTooltipProps {
  active?: boolean;
  payload?: SmartTooltipPayload[];
  label?: string;
  /** Full chart data array to calculate period-over-period change */
  chartData?: Record<string, unknown>[];
  /** The key in chartData whose value we track for % change */
  valueKey?: string;
  /** Custom value formatter (e.g. currency format or percentage) */
  formatValue?: (v: number) => string;
  /** If true, values are percentages (append %) */
  isPercentage?: boolean;
}

function getChangeInfo(
  chartData: Record<string, unknown>[] | undefined,
  valueKey: string | undefined,
  currentLabel: string | undefined,
): { pctChange: number | null; prevValue: number | null } {
  if (!chartData || !valueKey || !currentLabel) return { pctChange: null, prevValue: null };

  // Find index of current data point by matching the label field
  // Charts use various label keys (period, label, etc.) so we check the first string field
  const labelKey = Object.keys(chartData[0] ?? {}).find(
    (k) => typeof (chartData[0] as Record<string, unknown>)[k] === 'string',
  );
  if (!labelKey) return { pctChange: null, prevValue: null };

  const idx = chartData.findIndex(
    (d) => (d as Record<string, unknown>)[labelKey] === currentLabel,
  );

  if (idx <= 0) return { pctChange: null, prevValue: null };

  const current = Number((chartData[idx] as Record<string, unknown>)[valueKey] ?? 0);
  const prev = Number((chartData[idx - 1] as Record<string, unknown>)[valueKey] ?? 0);

  if (prev === 0) return { pctChange: null, prevValue: prev };

  const pctChange = ((current - prev) / Math.abs(prev)) * 100;
  return { pctChange, prevValue: prev };
}

function isExpenseMetric(dataKey: string): boolean {
  const lower = dataKey.toLowerCase();
  return lower.includes('expense') || lower.includes('cost') || lower.includes('burn');
}

function getInsightLine(pctChange: number, dataKey: string): string {
  const abs = Math.abs(pctChange);
  const isIncrease = pctChange > 0;
  const expenseMode = isExpenseMetric(dataKey);

  // For expense metrics, a decrease is good and an increase is bad
  if (expenseMode) {
    if (isIncrease && abs > 20) return 'Sharp cost increase. Review spending urgently.';
    if (isIncrease && abs > 10) return 'Moderate cost rise. Worth investigating.';
    if (abs < 10) return 'Relatively stable performance';
    if (!isIncrease && abs > 10 && abs <= 20) return 'Steady cost improvement this period';
    if (!isIncrease && abs > 20) return 'Significant cost reduction. Well managed.';
    return 'Relatively stable performance';
  }

  // Normal metrics (revenue, profit, margins)
  if (isIncrease && abs > 20) return 'Significant growth. Review revenue drivers.';
  if (isIncrease && abs > 10) return 'Steady improvement in this period';
  if (abs < 10) return 'Relatively stable performance';
  if (!isIncrease && abs > 10 && abs <= 20) return 'Moderate decline. Worth investigating.';
  if (!isIncrease && abs > 20) return 'Sharp drop. Check for unusual items.';
  return 'Relatively stable performance';
}

function getArrow(pctChange: number): { symbol: string; color: string } {
  if (pctChange > 0.5) return { symbol: '\u2191', color: 'text-emerald-600' };
  if (pctChange < -0.5) return { symbol: '\u2193', color: 'text-rose-600' };
  return { symbol: '\u2192', color: 'text-slate-400' };
}

export function SmartChartTooltip({
  active,
  payload,
  label,
  chartData,
  valueKey,
  formatValue,
  isPercentage,
}: SmartChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const firstEntry = payload[0];
  const currentValue = Number(firstEntry.value ?? 0);
  const effectiveValueKey = valueKey ?? firstEntry.dataKey;

  const formatted = formatValue
    ? formatValue(currentValue)
    : isPercentage
      ? `${currentValue.toFixed(1)}%`
      : String(currentValue);

  const { pctChange } = getChangeInfo(chartData, effectiveValueKey, label);
  const arrow = pctChange !== null ? getArrow(pctChange) : null;
  const insight =
    pctChange !== null ? getInsightLine(pctChange, effectiveValueKey) : null;

  return (
    <div className="rounded-lg shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 min-w-[200px]">
      {/* Period label */}
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </p>

      {/* Current value */}
      <p className="text-base font-bold text-slate-900 dark:text-slate-100">
        {formatted}
      </p>

      {/* Period-over-period change */}
      {pctChange !== null && arrow && (
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-sm font-semibold ${arrow.color}`}>
            {arrow.symbol} {Math.abs(pctChange).toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400">vs prev period</span>
        </div>
      )}

      {/* AI-style insight line */}
      {insight && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic border-t border-slate-100 dark:border-slate-700 pt-1.5">
          {insight}
        </p>
      )}
    </div>
  );
}
