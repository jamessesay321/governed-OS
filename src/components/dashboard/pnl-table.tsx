'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';
import { formatCurrency, formatPercent } from '@/lib/formatting/currency';
import type { PnLSummary, PnLSection } from '@/lib/financial/aggregate';

interface PnLTableProps {
  pnl: PnLSummary;
  onSectionClick?: (section: PnLSection) => void;
  onAccountClick?: (accountId: string, accountCode: string, accountName: string, sectionClass: string, amount: number) => void;
}

/**
 * Calculate the percentage a row amount represents of its section total.
 * Returns the percentage as a number (e.g. 98.7).
 * Uses absolute values so it works for both revenue and cost sections.
 */
function pctOfSection(rowAmount: number, sectionTotal: number): number {
  if (sectionTotal === 0) return 0;
  return (Math.abs(rowAmount) / Math.abs(sectionTotal)) * 100;
}

/**
 * Verify that section rows sum to 100.0% (within rounding tolerance).
 * Returns the actual sum percentage and whether it balances.
 */
function checkSectionBalance(section: PnLSection): { sumPct: number; balanced: boolean } {
  const rowSum = section.rows.reduce((acc, r) => acc + r.amount, 0);
  // Round to 2dp to handle floating point
  const diff = Math.abs(Math.round((rowSum - section.total) * 100) / 100);
  const sumPct = section.total !== 0
    ? (Math.abs(rowSum) / Math.abs(section.total)) * 100
    : section.rows.length === 0 ? 100 : 0;
  return { sumPct: Math.round(sumPct * 10) / 10, balanced: diff < 0.02 };
}

export function PnLTable({ pnl, onSectionClick, onAccountClick }: PnLTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Code</TableHead>
          <TableHead>Account</TableHead>
          <TableHead className="text-right w-[60px]">%</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pnl.sections.map((section) => {
          const balance = checkSectionBalance(section);
          return (
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
                <TableCell className="text-right text-xs text-muted-foreground">
                  {section.rows.length > 0 && balance.balanced && (
                    <span className="inline-flex items-center gap-0.5 text-green-600" title="All line items sum to 100% of section total">
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(section.total)}
                </TableCell>
              </TableRow>
              {/* Account rows with % of section */}
              {section.rows.map((row) => {
                const pct = pctOfSection(row.amount, section.total);
                return (
                  <TableRow
                    key={row.accountId}
                    className={onAccountClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={() => onAccountClick?.(row.accountId, row.accountCode, row.accountName, section.class, row.amount)}
                  >
                    <TableCell className="text-muted-foreground text-xs">
                      {row.accountCode}
                    </TableCell>
                    <TableCell>{row.accountName}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                      {pct >= 0.1 ? formatPercent(pct) : '<0.1%'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        {formatCurrency(row.amount)}
                        {onAccountClick && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Section balance check footer */}
              {section.rows.length > 1 && (
                <TableRow key={`balance-${section.class}`} className="border-b">
                  <TableCell colSpan={2} className="text-xs text-muted-foreground py-1 pl-6">
                    {section.rows.length} accounts
                  </TableCell>
                  <TableCell className="text-right text-xs py-1 tabular-nums">
                    <span className={balance.balanced ? 'text-green-600' : 'text-red-600'}>
                      {formatPercent(balance.sumPct)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground py-1">
                    {balance.balanced ? 'Reconciled' : 'Check'}
                  </TableCell>
                </TableRow>
              )}
            </>
          );
        })}

        {/* Summary rows */}
        <TableRow className="border-t-2 font-semibold">
          <TableCell colSpan={3}><FinancialTooltip term="Gross Profit">Gross Profit</FinancialTooltip></TableCell>
          <TableCell className="text-right">
            {formatCurrency(pnl.grossProfit)}
          </TableCell>
        </TableRow>
        <TableRow className="font-bold text-lg">
          <TableCell colSpan={3}><FinancialTooltip term="Net Profit">Net Profit</FinancialTooltip></TableCell>
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
