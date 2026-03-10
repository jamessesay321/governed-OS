'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PnLSummary } from '@/lib/financial/aggregate';

interface PnLTableProps {
  pnl: PnLSummary;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function PnLTable({ pnl }: PnLTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Code</TableHead>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pnl.sections.map((section) => (
          <>
            {/* Section header */}
            <TableRow key={`section-${section.class}`} className="bg-muted/50">
              <TableCell colSpan={2} className="font-semibold">
                {section.label}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(section.total)}
              </TableCell>
            </TableRow>
            {/* Account rows */}
            {section.rows.map((row) => (
              <TableRow key={row.accountId}>
                <TableCell className="text-muted-foreground">
                  {row.accountCode}
                </TableCell>
                <TableCell>{row.accountName}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(row.amount)}
                </TableCell>
              </TableRow>
            ))}
          </>
        ))}

        {/* Summary rows */}
        <TableRow className="border-t-2 font-semibold">
          <TableCell colSpan={2}>Gross Profit</TableCell>
          <TableCell className="text-right">
            {formatCurrency(pnl.grossProfit)}
          </TableCell>
        </TableRow>
        <TableRow className="font-bold text-lg">
          <TableCell colSpan={2}>Net Profit</TableCell>
          <TableCell
            className={`text-right ${pnl.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatCurrency(pnl.netProfit)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
