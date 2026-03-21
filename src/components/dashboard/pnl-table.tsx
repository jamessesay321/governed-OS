'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronRight } from 'lucide-react';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';
import type { PnLSummary, PnLSection } from '@/lib/financial/aggregate';

interface PnLTableProps {
  pnl: PnLSummary;
  onSectionClick?: (section: PnLSection) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function PnLTable({ pnl, onSectionClick }: PnLTableProps) {
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
            {/* Section header — clickable for drill-down */}
            <TableRow
              key={`section-${section.class}`}
              className={`bg-muted/50 ${onSectionClick ? 'cursor-pointer hover:bg-muted/80' : ''}`}
              onClick={() => onSectionClick?.(section)}
            >
              <TableCell colSpan={2} className="font-semibold">
                <span className="flex items-center gap-1">
                  {section.label}
                  {onSectionClick && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </span>
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
          <TableCell colSpan={2}><FinancialTooltip term="Gross Profit">Gross Profit</FinancialTooltip></TableCell>
          <TableCell className="text-right">
            {formatCurrency(pnl.grossProfit)}
          </TableCell>
        </TableRow>
        <TableRow className="font-bold text-lg">
          <TableCell colSpan={2}><FinancialTooltip term="Net Profit">Net Profit</FinancialTooltip></TableCell>
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
