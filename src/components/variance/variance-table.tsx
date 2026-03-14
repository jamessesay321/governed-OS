'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { VarianceReport, VarianceLine } from '@/lib/variance/engine';

interface VarianceTableProps {
  report: VarianceReport;
  onSelectLine?: (line: VarianceLine) => void;
}

function formatPence(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pounds);
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function VarianceTable({ report, onSelectLine }: VarianceTableProps) {
  if (report.lines.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No budget data found for this period. Set up budget lines to see variance analysis.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Budget</TableHead>
          <TableHead className="text-right">Actual</TableHead>
          <TableHead className="text-right">Variance</TableHead>
          <TableHead className="text-right">%</TableHead>
          <TableHead className="text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.lines.map((line) => (
          <TableRow
            key={line.category}
            className={`cursor-pointer ${
              line.is_material ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
            }`}
            onClick={() => onSelectLine?.(line)}
          >
            <TableCell className="font-medium">
              {formatCategory(line.category)}
              {line.is_material && (
                <Badge
                  variant="outline"
                  className="ml-2 border-yellow-500 text-yellow-700 text-[10px]"
                >
                  Material
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              {formatPence(line.budget_pence)}
            </TableCell>
            <TableCell className="text-right">
              {formatPence(line.actual_pence)}
            </TableCell>
            <TableCell
              className={`text-right font-medium ${
                line.direction === 'favourable'
                  ? 'text-green-600'
                  : line.direction === 'adverse'
                  ? 'text-red-600'
                  : ''
              }`}
            >
              {formatPence(line.variance_pence)}
            </TableCell>
            <TableCell
              className={`text-right ${
                line.direction === 'favourable'
                  ? 'text-green-600'
                  : line.direction === 'adverse'
                  ? 'text-red-600'
                  : ''
              }`}
            >
              {(line.variance_percentage * 100).toFixed(1)}%
            </TableCell>
            <TableCell className="text-center">
              <Badge
                variant={
                  line.direction === 'favourable'
                    ? 'default'
                    : line.direction === 'adverse'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {line.direction === 'favourable'
                  ? 'Favourable'
                  : line.direction === 'adverse'
                  ? 'Adverse'
                  : 'On Target'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}

        {/* Total row */}
        <TableRow className="border-t-2 font-bold">
          <TableCell>Total</TableCell>
          <TableCell className="text-right">
            {formatPence(report.total_budget_pence)}
          </TableCell>
          <TableCell className="text-right">
            {formatPence(report.total_actual_pence)}
          </TableCell>
          <TableCell
            className={`text-right ${
              report.total_variance_pence >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatPence(report.total_variance_pence)}
          </TableCell>
          <TableCell />
          <TableCell />
        </TableRow>
      </TableBody>
    </Table>
  );
}
