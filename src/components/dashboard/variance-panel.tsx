'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatting/currency';
import type { PnLSummary } from '@/lib/financial/aggregate';

interface VariancePanelProps {
  metric: string;
  currentPnl: PnLSummary;
  previousPnl: PnLSummary | null;
  orgId: string;
  onClose: () => void;
}

interface VarianceRow {
  label: string;
  current: number;
  previous: number;
  variance: number;
  variancePercent: number;
  isFavourable: boolean;
}

function buildVarianceRows(current: PnLSummary, previous: PnLSummary): VarianceRow[] {
  const rows: VarianceRow[] = [];

  // Revenue lines
  const currentRevenueSection = current.sections.find(s => s.class === 'REVENUE');
  const previousRevenueSection = previous.sections.find(s => s.class === 'REVENUE');

  if (currentRevenueSection && previousRevenueSection) {
    for (const row of currentRevenueSection.rows) {
      const prevRow = previousRevenueSection.rows.find(r => r.accountCode === row.accountCode);
      const prev = prevRow?.amount ?? 0;
      const variance = row.amount - prev;
      rows.push({
        label: row.accountName,
        current: row.amount,
        previous: prev,
        variance,
        variancePercent: prev !== 0 ? (variance / Math.abs(prev)) * 100 : 0,
        isFavourable: variance > 0, // Revenue up is good
      });
    }
  }

  // Cost lines (COGS + Expenses)
  for (const cls of ['DIRECTCOSTS', 'EXPENSE', 'OVERHEADS'] as const) {
    const currentSection = current.sections.find(s => s.class === cls);
    const previousSection = previous.sections.find(s => s.class === cls);

    if (currentSection && previousSection) {
      for (const row of currentSection.rows) {
        const prevRow = previousSection.rows.find(r => r.accountCode === row.accountCode);
        const prev = prevRow?.amount ?? 0;
        const variance = row.amount - prev;
        rows.push({
          label: row.accountName,
          current: row.amount,
          previous: prev,
          variance,
          variancePercent: prev !== 0 ? (variance / Math.abs(prev)) * 100 : 0,
          isFavourable: variance < 0, // Costs down is good
        });
      }
    }
  }

  // Sort by absolute variance magnitude (largest impact first)
  return rows.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
}

export function VariancePanel({ currentPnl, previousPnl, orgId, onClose }: VariancePanelProps) {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  if (!previousPnl) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l bg-background shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
          <h3 className="font-semibold">Variance Analysis</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No previous period data for comparison.</p>
        </div>
      </div>
    );
  }

  const rows = buildVarianceRows(currentPnl, previousPnl);
  const materialRows = rows.filter(r => Math.abs(r.variance) > 0);

  // Fetch AI explanation for material variances
  useEffect(() => {
    if (materialRows.length === 0) return;
    setLoadingAi(true);

    const topVariances = materialRows.slice(0, 5).map(r => ({
      account: r.label,
      current: r.current,
      previous: r.previous,
      variance: r.variance,
      favourable: r.isFavourable,
    }));

    fetch(`/api/variance/${orgId}?period=${currentPnl.period}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variances: topVariances }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.explanation) setAiExplanation(data.explanation);
      })
      .catch(() => {})
      .finally(() => setLoadingAi(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPnl.period, orgId]);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l bg-background shadow-xl sm:max-w-xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
        <div>
          <h3 className="font-semibold">Variance Analysis</h3>
          <p className="text-xs text-muted-foreground">
            {new Date(currentPnl.period).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} vs {new Date(previousPnl.period).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* AI Explanation */}
        {(loadingAi || aiExplanation) && (
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="py-3">
              {loadingAi ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 animate-pulse text-blue-500" />
                  <span>Analysing variances...</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <p className="text-sm leading-relaxed">{aiExplanation}</p>
                  </div>
                  <button
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="ml-6 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showReasoning ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    AI-generated analysis
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-lg font-bold">{formatCurrency(currentPnl.revenue)}</p>
              <p className={`text-xs ${currentPnl.revenue >= previousPnl.revenue ? 'text-green-600' : 'text-red-600'}`}>
                {currentPnl.revenue >= previousPnl.revenue ? '↑' : '↓'} {formatCurrency(Math.abs(currentPnl.revenue - previousPnl.revenue))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-xs text-muted-foreground">Gross Profit</p>
              <p className="text-lg font-bold">{formatCurrency(currentPnl.grossProfit)}</p>
              <p className={`text-xs ${currentPnl.grossProfit >= previousPnl.grossProfit ? 'text-green-600' : 'text-red-600'}`}>
                {currentPnl.grossProfit >= previousPnl.grossProfit ? '↑' : '↓'} {formatCurrency(Math.abs(currentPnl.grossProfit - previousPnl.grossProfit))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p className="text-lg font-bold">{formatCurrency(currentPnl.netProfit)}</p>
              <p className={`text-xs ${currentPnl.netProfit >= previousPnl.netProfit ? 'text-green-600' : 'text-red-600'}`}>
                {currentPnl.netProfit >= previousPnl.netProfit ? '↑' : '↓'} {formatCurrency(Math.abs(currentPnl.netProfit - previousPnl.netProfit))}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Variance bars sorted by magnitude */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Line-by-line variances</h4>
          {materialRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No material variances detected.</p>
          ) : (
            materialRows.map((row) => {
              const maxVariance = Math.max(...materialRows.map(r => Math.abs(r.variance)));
              const barWidth = maxVariance > 0 ? (Math.abs(row.variance) / maxVariance) * 100 : 0;

              return (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{row.label}</span>
                    <span className={`shrink-0 font-medium ${row.isFavourable ? 'text-green-600' : 'text-red-600'}`}>
                      {row.variance > 0 ? '+' : ''}{formatCurrency(row.variance)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full transition-all ${row.isFavourable ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Previous: {formatCurrency(row.previous)}</span>
                    <span>Current: {formatCurrency(row.current)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
