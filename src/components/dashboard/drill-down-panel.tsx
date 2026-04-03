'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/formatting/currency';
import type { PnLRow, PnLSection } from '@/lib/financial/aggregate';

interface DrillDownPanelProps {
  section: PnLSection | null;
  period: string;
  orgId: string;
  onClose: () => void;
}

interface Transaction {
  id: string;
  date: string;
  reference: string;
  contact_name: string;
  description: string;
  amount: number;
  type: string;
}

export function DrillDownPanel({ section, period, orgId, onClose }: DrillDownPanelProps) {
  const [selectedRow, setSelectedRow] = useState<PnLRow | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Reset selected row when section changes
  useEffect(() => {
    setSelectedRow(null);
    setTransactions([]);
  }, [section]);

  async function handleRowClick(row: PnLRow) {
    setSelectedRow(row);
    setLoadingTx(true);
    try {
      // Fetch raw transactions for this account + period
      const res = await fetch(
        `/api/transactions/${orgId}?accountId=${row.accountId}&period=${period}`
      );
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions ?? []);
      }
    } catch {
      setTransactions([]);
    } finally {
      setLoadingTx(false);
    }
  }

  if (!section) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l bg-background shadow-xl sm:max-w-xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{section.label}</h3>
          {selectedRow && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{selectedRow.accountName}</span>
            </>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {!selectedRow ? (
          // Level 1: Category breakdown
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Account breakdown for {new Date(period).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
              <span className="font-semibold text-foreground">{formatCurrency(section.total)}</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Code</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right w-[60px]">Txns</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.rows.map((row) => (
                  <TableRow
                    key={row.accountId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(row)}
                  >
                    <TableCell className="text-muted-foreground text-xs">
                      {row.accountCode}
                    </TableCell>
                    <TableCell className="flex items-center gap-1">
                      {row.accountName}
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {row.transactionCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          // Level 2: Individual transactions
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedRow(null);
                setTransactions([]);
              }}
              className="text-xs"
            >
              ← Back to {section.label}
            </Button>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{selectedRow.accountName}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedRow.accountCode} · {selectedRow.transactionCount} transactions · {formatCurrency(selectedRow.amount)}
                </p>
              </CardHeader>
              <CardContent>
                {loadingTx ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Loading transactions...
                  </p>
                ) : transactions.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Transaction detail not yet available. Sync your Xero data to populate.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs">
                            {new Date(tx.date).toLocaleDateString('en-GB')}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{tx.contact_name || tx.description}</div>
                            {tx.reference && (
                              <div className="text-xs text-muted-foreground">{tx.reference}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(tx.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
