'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KPICards } from '@/components/dashboard/kpi-cards';
import { PnLTable } from '@/components/dashboard/pnl-table';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { SyncStatus } from '@/components/dashboard/sync-status';
import { NarrativeSummary } from '@/components/dashboard/narrative-summary';
import { DataFreshness } from '@/components/dashboard/data-freshness';
import { DrillDownPanel } from '@/components/dashboard/drill-down-panel';
import { WaterfallChart } from '@/components/dashboard/waterfall-chart';
import { VariancePanel } from '@/components/dashboard/variance-panel';
import { RoadmapWidget } from '@/components/dashboard/roadmap-widget';
import { ProposalWidget } from '@/components/dashboard/proposal-widget';
import { Celebration } from '@/components/ui/celebration';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Target, Sparkles, FileText, PieChart } from 'lucide-react';
import Link from 'next/link';
import type { PnLSummary, PnLSection } from '@/lib/financial/aggregate';
import type { Role } from '@/types';
import { ROLE_HIERARCHY } from '@/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const QUICK_ACTIONS = [
  { label: 'View P&L', href: '/financials', icon: PieChart },
  { label: 'Check KPIs', href: '/kpi', icon: Target },
  { label: 'Run Scenario', href: '/scenarios', icon: TrendingUp },
  { label: 'Generate Report', href: '/reports', icon: FileText },
  { label: 'Ask AI', href: '/intelligence', icon: Sparkles },
];

function getContextualInsight(pnl?: PnLSummary, previousPnl?: PnLSummary | null): string | null {
  if (!pnl || !previousPnl) return null;
  if (pnl.revenue > 0 && previousPnl.revenue > 0) {
    const change = ((pnl.revenue - previousPnl.revenue) / previousPnl.revenue) * 100;
    if (change > 0) return `Your revenue is up ${change.toFixed(0)}% this period. Nice work.`;
    if (change < -5) return `Revenue dipped ${Math.abs(change).toFixed(0)}% this period. Worth a closer look.`;
  }
  if (pnl.netProfit > 0 && previousPnl.netProfit <= 0) return 'You moved into profit this period. Great momentum.';
  if (pnl.grossProfit > 0 && previousPnl.grossProfit > 0) {
    const gpMargin = (pnl.grossProfit / pnl.revenue) * 100;
    if (gpMargin > 60) return `Gross margin is strong at ${gpMargin.toFixed(0)}%. Keep it up.`;
  }
  return null;
}

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

interface DashboardClientProps {
  orgId: string;
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
  displayName: string;
}

export function DashboardClient({
  orgId,
  periods,
  defaultPeriod,
  pnlByPeriod,
  connected,
  lastSync,
  role,
  displayName,
}: DashboardClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const [drillSection, setDrillSection] = useState<PnLSection | null>(null);
  const [showVariance, setShowVariance] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const pnl = pnlByPeriod[selectedPeriod];

  // Celebrate on first visit (once per session)
  useEffect(() => {
    const key = 'dashboard-celebrated';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      setShowCelebration(true);
    }
  }, []);

  // Get previous period P&L for trend comparison
  const periodIdx = periods.indexOf(selectedPeriod);
  const previousPeriod = periodIdx < periods.length - 1 ? periods[periodIdx + 1] : null;
  const previousPnl = previousPeriod ? pnlByPeriod[previousPeriod] : null;

  const userRole = role as Role;
  const canSync = hasMinRole(userRole, 'advisor');
  const canConnect = hasMinRole(userRole, 'admin');

  const firstName = displayName?.split(' ')[0] || 'there';

  if (!pnl || periods.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{getGreeting()}, {firstName}</h2>
          <p className="text-sm text-muted-foreground mt-1">Here&apos;s your financial overview.</p>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <RoadmapWidget />
          <ProposalWidget />
        </div>
      </div>
    );
  }

  function handleSectionClick(section: PnLSection) {
    setDrillSection(section);
  }

  const insight = getContextualInsight(pnl, previousPnl);

  return (
    <div className="space-y-6">
      <Celebration trigger={showCelebration} />

      {/* Greeting + Period */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{getGreeting()}, {firstName}</h2>
          {insight && (
            <p className="text-sm text-muted-foreground mt-0.5">{insight}</p>
          )}
          <DataFreshness lastSyncAt={lastSync?.completedAt ?? null} />
        </div>
        <div className="flex items-center gap-2">
          {previousPnl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVariance(true)}
            >
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              Variance
            </Button>
          )}
          <PeriodSelector
            periods={periods}
            selected={selectedPeriod}
            onChange={setSelectedPeriod}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        ))}
      </div>

      {/* Narrative Summary:AI-generated insight leads the dashboard */}
      <NarrativeSummary orgId={orgId} period={selectedPeriod} />

      {/* KPI Cards with trend comparison */}
      <KPICards
        revenue={pnl.revenue}
        grossProfit={pnl.grossProfit}
        expenses={pnl.expenses}
        netProfit={pnl.netProfit}
        previousRevenue={previousPnl?.revenue}
        previousGrossProfit={previousPnl?.grossProfit}
        previousExpenses={previousPnl?.expenses}
        previousNetProfit={previousPnl?.netProfit}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* P&L Table with clickable sections */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profit & Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <PnLTable pnl={pnl} onSectionClick={handleSectionClick} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <SyncStatus
            connected={connected}
            lastSync={lastSync}
            canSync={canSync}
            canConnect={canConnect}
          />
          <RoadmapWidget />
          <ProposalWidget />
        </div>
      </div>

      {/* Waterfall Chart:Revenue to Net Profit bridge */}
      <WaterfallChart pnl={pnl} />

      {/* Drill-down slide-in panel */}
      {drillSection && (
        <DrillDownPanel
          section={drillSection}
          period={selectedPeriod}
          orgId={orgId}
          onClose={() => setDrillSection(null)}
        />
      )}

      {/* Variance analysis slide-in panel */}
      {showVariance && (
        <VariancePanel
          metric="overview"
          currentPnl={pnl}
          previousPnl={previousPnl}
          orgId={orgId}
          onClose={() => setShowVariance(false)}
        />
      )}
    </div>
  );
}
