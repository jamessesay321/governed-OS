'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDrillDown } from '@/components/shared/drill-down-sheet';
import { formatCurrency, formatPercent, chartAxisFormatter } from '@/lib/formatting/currency';
import type { PnLSummary } from '@/lib/financial/aggregate';

interface WaterfallChartProps {
  pnl: PnLSummary;
}

interface WaterfallBar {
  name: string;
  /** Plain-English label shown below the bar */
  semanticLabel: string;
  value: number;
  displayValue: number;
  start: number;
  type: 'positive' | 'negative' | 'total';
  /** Which P&L section class this bar maps to (for drill-down) */
  sectionClass?: string;
}

function buildWaterfallData(pnl: PnLSummary): WaterfallBar[] {
  const data: WaterfallBar[] = [];

  // Revenue (full bar)
  data.push({
    name: 'Revenue',
    semanticLabel: 'What you earned',
    value: pnl.revenue,
    displayValue: pnl.revenue,
    start: 0,
    type: 'total',
    sectionClass: 'REVENUE',
  });

  // Cost of Sales (subtract)
  data.push({
    name: 'Cost of Sales',
    semanticLabel: 'Direct delivery costs',
    value: -pnl.costOfSales,
    displayValue: pnl.costOfSales,
    start: pnl.revenue - pnl.costOfSales,
    type: 'negative',
    sectionClass: 'DIRECTCOSTS',
  });

  // Gross Profit (subtotal)
  const gpMargin = pnl.revenue > 0 ? formatPercent((pnl.grossProfit / pnl.revenue) * 100) : '0%';
  data.push({
    name: 'Gross Profit',
    semanticLabel: `${gpMargin} margin`,
    value: pnl.grossProfit,
    displayValue: pnl.grossProfit,
    start: 0,
    type: 'total',
  });

  // Operating Expenses (subtract)
  data.push({
    name: 'Overheads',
    semanticLabel: 'Running the business',
    value: -pnl.expenses,
    displayValue: pnl.expenses,
    start: pnl.grossProfit - pnl.expenses,
    type: 'negative',
    sectionClass: 'EXPENSE',
  });

  // Net Profit (final total)
  const npMargin = pnl.revenue > 0 ? formatPercent((pnl.netProfit / pnl.revenue) * 100) : '0%';
  data.push({
    name: 'Net Profit',
    semanticLabel: `${npMargin} kept`,
    value: pnl.netProfit,
    displayValue: pnl.netProfit,
    start: 0,
    type: pnl.netProfit >= 0 ? 'total' : 'negative',
  });

  return data;
}

function getBarColor(type: 'positive' | 'negative' | 'total'): string {
  switch (type) {
    case 'positive':
      return '#16a34a'; // green-600
    case 'negative':
      return '#dc2626'; // red-600
    case 'total':
      return '#6b7280'; // gray-500
  }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WaterfallBar }> }) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <p className="text-sm font-medium">{data.name}</p>
      <p className="text-[10px] text-muted-foreground">{data.semanticLabel}</p>
      <p className={`text-sm font-bold mt-1 ${data.type === 'negative' ? 'text-red-600' : 'text-foreground'}`}>
        {data.type === 'negative' ? '-' : ''}{formatCurrency(Math.abs(data.displayValue))}
      </p>
      {data.sectionClass && (
        <p className="text-[10px] text-primary mt-1">Click to drill down</p>
      )}
    </div>
  );
}

/** Custom X-axis tick with semantic label */
function CustomXTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string; index: number }; data?: WaterfallBar[] }) {
  // This is a workaround — recharts doesn't pass custom data to ticks,
  // so we use the bar name only. Semantic labels are shown via the tooltip.
  if (!payload || x === undefined || y === undefined) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        fill="#6b7280"
        fontSize={11}
        fontWeight={500}
      >
        {payload.value}
      </text>
    </g>
  );
}

export function WaterfallChart({ pnl }: WaterfallChartProps) {
  const data = buildWaterfallData(pnl);
  const { openDrill } = useDrillDown();

  if (pnl.revenue === 0) return null;

  function handleBarClick(bar: WaterfallBar) {
    if (!bar.sectionClass) return;

    const section = pnl.sections.find((s) => s.class === bar.sectionClass);
    if (!section) return;

    openDrill({
      type: 'pnl_section',
      section: {
        label: section.label,
        class: section.class,
        total: section.total,
        rows: section.rows,
      },
      period: pnl.period,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Revenue to Net Profit Bridge</CardTitle>
          <span className="text-[10px] text-muted-foreground">Click a bar to drill down</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 10, left: 10, bottom: 30 }}
              onClick={(state: Record<string, unknown>) => {
                const payload = state?.activePayload as Array<{ payload: WaterfallBar }> | undefined;
                if (payload?.[0]) {
                  handleBarClick(payload[0].payload);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={<CustomXTick />}
                tickLine={false}
              />
              <YAxis
                tickFormatter={chartAxisFormatter()}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#e5e7eb" />

              {/* Invisible base bar (creates floating effect) */}
              <Bar dataKey="start" stackId="waterfall" fill="transparent" />

              {/* Visible bar segment */}
              <Bar
                dataKey="displayValue"
                stackId="waterfall"
                radius={[3, 3, 0, 0]}
                className="cursor-pointer"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={getBarColor(entry.type)}
                    className={entry.sectionClass ? 'cursor-pointer' : ''}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Semantic labels below the chart */}
        <div className="flex justify-around mt-1 px-2">
          {data.map((bar) => (
            <div key={bar.name} className="text-center" style={{ flex: 1 }}>
              <p className="text-[10px] text-muted-foreground leading-tight">{bar.semanticLabel}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
