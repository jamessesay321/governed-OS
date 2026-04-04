'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FinancialTooltip } from '@/components/ui/financial-tooltip';
import { VarianceTable } from '@/components/variance/variance-table';
import { VarianceDetail } from '@/components/variance/variance-detail';
import { AIExplanationCard } from '@/components/variance/ai-explanation';
import { VisualiseButton } from '@/components/ui/visualise-button';
import { formatPence } from '@/lib/formatting/currency';
import { useGlobalPeriodContext } from '@/components/providers/global-period-provider';
import { useDrillDown } from '@/components/shared/drill-down-sheet';
import { ChallengeButton } from '@/components/shared/challenge-panel';
import { CrossRef } from '@/components/shared/in-page-link';
import { NarrativeSummary } from '@/components/dashboard/narrative-summary';
import { DataFreshness } from '@/components/dashboard/data-freshness';
import type { VarianceReport, VarianceLine } from '@/lib/variance/engine';
import type { Role } from '@/types';
import { ROLE_HIERARCHY } from '@/types';

type CompareMode = 'budget' | 'prev_month' | 'prev_quarter' | 'prev_year';

const COMPARE_LABELS: Record<CompareMode, string> = {
  budget: 'Budget',
  prev_month: 'Previous Month',
  prev_quarter: 'Previous Quarter',
  prev_year: 'Same Month Last Year',
};

interface VarianceClientProps {
  orgId: string;
  periods: string[];
  defaultPeriod: string;
  role: string;
  lastSync: { completedAt: string | null };
}

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

// formatPence imported from @/lib/formatting/currency

export function VarianceClient({
  orgId,
  periods,
  defaultPeriod,
  role,
  lastSync,
}: VarianceClientProps) {
  const { period: globalPeriod, compare: globalCompare } = useGlobalPeriodContext();
  // Use global period as primary, fall back to prop for initial load
  const [selectedPeriod, setSelectedPeriod] = useState(globalPeriod || defaultPeriod);
  const [compareMode, setCompareMode] = useState<CompareMode>('budget');
  const [report, setReport] = useState<VarianceReport | null>(null);
  const [selectedLine, setSelectedLine] = useState<VarianceLine | null>(null);
  const [loading, setLoading] = useState(false);

  const canViewDetails = hasMinRole(role as Role, 'viewer');
  const { openDrill } = useDrillDown();

  function handleVarianceLineClick(line: VarianceLine) {
    setSelectedLine(line);
    // Also open drill-down sheet with variance context
    openDrill({
      type: 'variance',
      metric: line.category.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      current: line.actual_pence / 100,
      previous: line.budget_pence / 100,
      period: selectedPeriod,
    });
  }

  // Sync from global period selector when it changes
  const prevGlobalPeriodRef = useRef(globalPeriod);
  useEffect(() => {
    if (globalPeriod && globalPeriod !== prevGlobalPeriodRef.current) {
      prevGlobalPeriodRef.current = globalPeriod;
      setSelectedPeriod(globalPeriod);
    }
  }, [globalPeriod]);

  const fetchVariance = useCallback(async (period: string, compare: CompareMode) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/variance/${orgId}?period=${period}&compare=${compare}`
      );
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (selectedPeriod) {
      fetchVariance(selectedPeriod, compareMode);
    }
  }, [selectedPeriod, compareMode, fetchVariance]);

  if (periods.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Variance Analysis</h2>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No financial data available. Connect your Xero account and sync data first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            <FinancialTooltip term="Variance" orgId={orgId}>Variance Analysis</FinancialTooltip>
          </h2>
          <p className="text-sm text-muted-foreground">
            {COMPARE_LABELS[compareMode]} comparison with AI explanations
          </p>
          <DataFreshness lastSyncAt={lastSync.completedAt} />
        </div>
        <div className="flex items-center gap-3">
          <ChallengeButton
            page="variance"
            metricLabel="Variance Analysis"
            period={selectedPeriod}
          />
          <VisualiseButton context="variance" />
          {/* Compare mode selector */}
          <div className="flex flex-col items-end gap-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Compare to
            </label>
            <select
              value={compareMode}
              onChange={(e) => {
                setCompareMode(e.target.value as CompareMode);
                setSelectedLine(null);
              }}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              {(Object.keys(COMPARE_LABELS) as CompareMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {COMPARE_LABELS[mode]}
                </option>
              ))}
            </select>
          </div>
          {/* Period selection now handled by global period selector in layout */}
        </div>
      </div>

      {/* AI Narrative Summary */}
      <NarrativeSummary
        orgId={orgId}
        period={selectedPeriod}
        narrativeEndpoint="narrative/variance"
      />

      {/* Summary cards */}
      {report && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Budget
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPence(report.total_budget_pence)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPence(report.total_actual_pence)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Variance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  report.total_variance_pence >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {formatPence(report.total_variance_pence)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Material Variances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {report.material_variances.length}
                </span>
                {report.material_variances.length > 0 && (
                  <Badge variant="destructive">Action needed</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Variance table */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Calculating variances...
        </div>
      ) : report ? (
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <VarianceTable
              report={report}
              onSelectLine={canViewDetails ? handleVarianceLineClick : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No budget data found. Set up budget lines to see variance analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detail view */}
      {selectedLine && (
        <VarianceDetail
          line={selectedLine}
          onClose={() => setSelectedLine(null)}
        />
      )}

      {/* Cross-references */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Related:</span>
        <CrossRef href="/financials/income-statement" label="Income Statement" />
        <CrossRef href="/financials/budget" label="Budget Overview" />
        <CrossRef href="/kpi" label="KPI Dashboard" />
        <CrossRef href="/dashboard/profitability" label="Profitability" />
      </div>
    </div>
  );
}
