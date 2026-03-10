'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KPICards } from '@/components/dashboard/kpi-cards';
import { PnLTable } from '@/components/dashboard/pnl-table';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { SyncStatus } from '@/components/dashboard/sync-status';
import type { PnLSummary } from '@/lib/financial/aggregate';
import type { Role } from '@/types';
import { ROLE_HIERARCHY } from '@/types';

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

interface DashboardClientProps {
  periods: string[];
  defaultPeriod: string;
  pnlByPeriod: Record<string, PnLSummary>;
  connected: boolean;
  lastSync: {
    status: string;
    recordsSynced: number;
    startedAt: string;
    completedAt: string | null;
    error: string | null;
  } | null;
  role: string;
}

export function DashboardClient({
  periods,
  defaultPeriod,
  pnlByPeriod,
  connected,
  lastSync,
  role,
}: DashboardClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const pnl = pnlByPeriod[selectedPeriod];

  const userRole = role as Role;
  const canSync = hasMinRole(userRole, 'advisor');
  const canConnect = hasMinRole(userRole, 'admin');

  if (!pnl || periods.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dashboard</h2>
        </div>

        <SyncStatus
          connected={connected}
          lastSync={lastSync}
          canSync={canSync}
          canConnect={canConnect}
        />

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">
              {connected
                ? 'No financial data yet. Trigger a sync to pull data from Xero.'
                : 'Connect your Xero account to get started.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <PeriodSelector
          periods={periods}
          selected={selectedPeriod}
          onChange={setSelectedPeriod}
        />
      </div>

      <KPICards
        revenue={pnl.revenue}
        grossProfit={pnl.grossProfit}
        expenses={pnl.expenses}
        netProfit={pnl.netProfit}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profit & Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <PnLTable pnl={pnl} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <SyncStatus
            connected={connected}
            lastSync={lastSync}
            canSync={canSync}
            canConnect={canConnect}
          />
        </div>
      </div>
    </div>
  );
}
