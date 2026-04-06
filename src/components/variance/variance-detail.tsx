'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPence } from '@/lib/formatting/currency';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { AIReasoning } from '@/components/ui/ai-reasoning';
import type { VarianceLine } from '@/lib/variance/engine';

interface VarianceDetailProps {
  line: VarianceLine;
  explanation?: string | null;
  onExplain?: () => void;
  onClose?: () => void;
}

// formatPence imported from @/lib/formatting/currency

function formatCategory(category: string): string {
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function VarianceDetail({ line, explanation, onExplain, onClose }: VarianceDetailProps) {
  const chartData = [
    { name: 'Budget', value: line.budget_pence / 100 },
    { name: 'Actual', value: line.actual_pence / 100 },
    { name: 'Variance', value: line.variance_pence / 100 },
  ];

  const colors = ['#6366f1', '#2563eb', line.direction === 'favourable' ? '#16a34a' : '#dc2626'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {formatCategory(line.category)}
            </CardTitle>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant={
                  line.direction === 'favourable'
                    ? 'default'
                    : line.direction === 'adverse'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {line.direction}
              </Badge>
              {line.is_material && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                  Material variance
                </Badge>
              )}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-md bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Budget</div>
            <div className="text-lg font-bold">{formatPence(line.budget_pence)}</div>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Actual</div>
            <div className="text-lg font-bold">{formatPence(line.actual_pence)}</div>
          </div>
          <div className="rounded-md bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Variance</div>
            <div
              className={`text-lg font-bold ${
                line.direction === 'favourable'
                  ? 'text-green-600'
                  : line.direction === 'adverse'
                  ? 'text-red-600'
                  : ''
              }`}
            >
              {formatPence(line.variance_pence)} ({(line.variance_percentage * 100).toFixed(1)}%)
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  new Intl.NumberFormat('en-GB', {
                    style: 'currency',
                    currency: 'GBP',
                    notation: 'compact',
                  }).format(v)
                }
              />
              <Tooltip
                formatter={(value: unknown) => [
                  new Intl.NumberFormat('en-GB', {
                    style: 'currency',
                    currency: 'GBP',
                  }).format(Number(value ?? 0)),
                ]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI explanation */}
        {explanation && (
          <AIReasoning
            reasoning={explanation}
            dataSources={[
              `Budget: ${formatPence(line.budget_pence)}`,
              `Actual: ${formatPence(line.actual_pence)}`,
              'Xero transaction data for the period',
            ]}
            confidence={line.is_material ? 'high' : 'medium'}
            triggerLabel="Why this variance?"
          />
        )}

        {/* AI explanation button (when no explanation loaded yet) */}
        {!explanation && line.is_material && onExplain && (
          <button
            onClick={onExplain}
            className="w-full rounded-md border border-dashed border-muted-foreground/30 p-3 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Get AI explanation for this variance
          </button>
        )}
      </CardContent>
    </Card>
  );
}
