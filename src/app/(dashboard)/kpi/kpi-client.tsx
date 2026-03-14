'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KPIGrid } from '@/components/kpi/kpi-grid';
import { KPIDetail } from '@/components/kpi/kpi-detail';
import type { CalculatedKPI } from '@/lib/kpi/format';
import type { KPISnapshot, Role } from '@/types';
import { ROLE_HIERARCHY } from '@/types';

interface KPIDashboardClientProps {
  orgId: string;
  periods: string[];
  defaultPeriod: string;
  role: string;
}

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export function KPIDashboardClient({
  orgId,
  periods,
  defaultPeriod,
  role,
}: KPIDashboardClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const [kpis, setKPIs] = useState<CalculatedKPI[]>([]);
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [kpiHistory, setKPIHistory] = useState<KPISnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const canRecalculate = hasMinRole(role as Role, 'advisor');

  const fetchKPIs = useCallback(async (period: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/kpi/${orgId}?period=${period}&type=universal`
      );
      if (res.ok) {
        const data = await res.json();
        setKPIs(data);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (selectedPeriod) {
      fetchKPIs(selectedPeriod);
    }
  }, [selectedPeriod, fetchKPIs]);

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      const res = await fetch(`/api/kpi/${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: selectedPeriod, type: 'universal' }),
      });
      if (res.ok) {
        const data = await res.json();
        setKPIs(data.kpis);
      }
    } finally {
      setRecalculating(false);
    }
  }

  async function handleSelectKPI(kpiKey: string) {
    setSelectedKPI(kpiKey);
    // Fetch history for detail view
    // For now, use empty array — history endpoint would be added
    setKPIHistory([]);
  }

  const selectedKPIData = kpis.find((k) => k.key === selectedKPI);

  if (periods.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">KPI Dashboard</h2>
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
          <h2 className="text-2xl font-bold">KPI Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Key performance indicators with sector benchmarks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
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
          {canRecalculate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={recalculating}
            >
              {recalculating ? 'Recalculating...' : 'Recalculate'}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Calculating KPIs...
        </div>
      ) : (
        <>
          <KPIGrid
            kpis={kpis}
            onSelect={handleSelectKPI}
          />

          {selectedKPIData && (
            <KPIDetail
              kpi={selectedKPIData}
              history={kpiHistory}
              onClose={() => setSelectedKPI(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
