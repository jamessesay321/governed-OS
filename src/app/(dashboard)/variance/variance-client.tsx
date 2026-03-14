'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VarianceTable } from '@/components/variance/variance-table';
import { VarianceDetail } from '@/components/variance/variance-detail';
import { AIExplanationCard } from '@/components/variance/ai-explanation';
import type { VarianceReport, VarianceLine } from '@/lib/variance/engine';
import type { Role } from '@/types';
import { ROLE_HIERARCHY } from '@/types';

interface VarianceClientProps {
  orgId: string;
  periods: string[];
  defaultPeriod: string;
  role: string;
}

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
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

export function VarianceClient({
  orgId,
  periods,
  defaultPeriod,
  role,
}: VarianceClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const [report, setReport] = useState<VarianceReport | null>(null);
  const [selectedLine, setSelectedLine] = useState<VarianceLine | null>(null);
  const [loading, setLoading] = useState(false);

  const canViewDetails = hasMinRole(role as Role, 'viewer');

  const fetchVariance = useCallback(async (period: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/variance/${orgId}?period=${period}`
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
      fetchVariance(selectedPeriod);
    }
  }, [selectedPeriod, fetchVariance]);

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
          <h2 className="text-2xl font-bold">Variance Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Budget vs actual comparison with AI explanations
          </p>
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => {
            setSelectedPeriod(e.target.value);
            setSelectedLine(null);
          }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          {periods.map((p) => (
            <option key={p} value={p}>
              {new Date(p).toLocaleDateString('en-GB', {
                month: 'long',
                year: 'numeric',
              })}
            </option>
          ))}
        </select>
      </div>

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
              onSelectLine={canViewDetails ? setSelectedLine : undefined}
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
    </div>
  );
}
