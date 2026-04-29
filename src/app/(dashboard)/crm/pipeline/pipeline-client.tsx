'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatting/currency';
import { HorizonRow, type HorizonKey } from '@/components/kpi/horizon-row';
import {
  AlertTriangle, Skull, Clock, CheckCircle, ArrowRight,
  ExternalLink, Filter,
} from 'lucide-react';
import { useDrillDown } from '@/components/shared/drill-down-sheet';

// ---------------------------------------------------------------------------
// Types (mirrors the API response)
// ---------------------------------------------------------------------------

type StaleSeverity = 'warning' | 'stale' | 'dead';

interface StaleDeal {
  id: string;
  dealname: string;
  amount: number;
  stage: string;
  stageLabel: string;
  pipeline: string;
  daysInStage: number;
  daysSinceCreated: number;
  closedate: string | null;
  closedateOverdue: boolean;
  severity: StaleSeverity;
  suggestedAction: string;
}

interface StaleDealAnalysis {
  staleDeals: StaleDeal[];
  totalStaleValue: number;
  bySeverity: Record<StaleSeverity, { count: number; value: number }>;
  byStage: Array<{ stageLabel: string; count: number; value: number; avgDaysInStage: number }>;
  healthScore: number;
}

interface PipelineSummary {
  totalDeals: number;
  totalValue: number;
  weightedValue: number;
  avgDealSize: number;
}

interface PipelineData {
  staleAnalysis: StaleDealAnalysis;
  pipelineSummary: PipelineSummary;
  totalDeals: number;
}

interface StaleDealsResponse {
  sales: PipelineData;
  unconfirmed: PipelineData;
  meta: {
    totalDeals: number;
    totalStaleDeals: number;
    totalStaleValue: number;
    fetchedAt: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<StaleSeverity, {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: typeof AlertTriangle;
}> = {
  dead: { label: 'Dead', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: Skull },
  stale: { label: 'Stale', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
  warning: { label: 'Warning', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Clock },
};

function getHealthColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function getHealthBg(score: number): string {
  if (score >= 70) return 'bg-emerald-50 border-emerald-200';
  if (score >= 40) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PipelineClient() {
  const { openDrill } = useDrillDown();
  const [data, setData] = useState<StaleDealsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<StaleSeverity | 'all'>('all');
  const [filterPipeline, setFilterPipeline] = useState<'all' | 'sales' | 'unconfirmed'>('all');

  useEffect(() => {
    fetch('/api/integrations/hubspot/stale-deals')
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((d) => setData(d as StaleDealsResponse))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">Pipeline Health</h1>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">Pipeline Health</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-3" />
            <p className="text-muted-foreground">
              {error === '400' ? 'HubSpot is not connected. Configure HUBSPOT_ACCESS_TOKEN to enable pipeline tracking.' : `Failed to load: ${error}`}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Combine stale deals from both pipelines
  const allStale = [
    ...data.sales.staleAnalysis.staleDeals.map((d) => ({ ...d, pipelineName: 'Sales' })),
    ...data.unconfirmed.staleAnalysis.staleDeals.map((d) => ({ ...d, pipelineName: 'Unconfirmed' })),
  ];

  // Apply filters
  const filtered = allStale.filter((d) => {
    if (filterSeverity !== 'all' && d.severity !== filterSeverity) return false;
    if (filterPipeline === 'sales' && d.pipelineName !== 'Sales') return false;
    if (filterPipeline === 'unconfirmed' && d.pipelineName !== 'Unconfirmed') return false;
    return true;
  });

  const salesHealth = data.sales.staleAnalysis.healthScore;
  const unconfirmedHealth = data.unconfirmed.staleAnalysis.healthScore;
  const combinedHealth = Math.round((salesHealth + unconfirmedHealth) / 2);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline Health</h1>
        <p className="text-muted-foreground text-sm">
          Stale deal detection across both HubSpot pipelines. For Tanisha to review and action.
        </p>
      </div>

      {/* Time-horizon row — buckets stale deals by close date, with the
          stalled total on the right. */}
      {(() => {
        const allStaleDeals = [
          ...data.sales.staleAnalysis.staleDeals,
          ...data.unconfirmed.staleAnalysis.staleDeals,
        ];
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const dayMs = 86_400_000;
        const buckets = {
          today: { amount: 0, count: 0 },
          next_1_7: { amount: 0, count: 0 },
          next_8_30: { amount: 0, count: 0 },
        };
        for (const deal of allStaleDeals) {
          if (!deal.closedate) continue;
          const closeMs = new Date(deal.closedate).getTime();
          const daysUntil = Math.floor((closeMs - startOfToday) / dayMs);
          if (daysUntil === 0) {
            buckets.today.amount += deal.amount;
            buckets.today.count += 1;
          } else if (daysUntil >= 1 && daysUntil <= 7) {
            buckets.next_1_7.amount += deal.amount;
            buckets.next_1_7.count += 1;
          } else if (daysUntil >= 8 && daysUntil <= 30) {
            buckets.next_8_30.amount += deal.amount;
            buckets.next_8_30.count += 1;
          }
        }
        const stalledTotal = data.meta.totalStaleValue;
        const stalledCount = data.meta.totalStaleDeals;

        const horizonData = {
          today: { ...buckets.today, subtitle: 'Stale deals closing today' },
          next_1_7: { ...buckets.next_1_7, subtitle: 'Stale deals closing in a week' },
          next_8_30: { ...buckets.next_8_30, subtitle: 'Stale deals closing this month' },
          overdue_or_balance: {
            amount: stalledTotal,
            count: stalledCount,
            subtitle: 'Total deals flagged as stale or dead',
          },
        };

        const horizonClick = (key: HorizonKey) => {
          const bucketDeals = allStaleDeals.filter((deal) => {
            if (key === 'overdue_or_balance') return true;
            if (!deal.closedate) return false;
            const days = Math.floor((new Date(deal.closedate).getTime() - startOfToday) / dayMs);
            if (key === 'today') return days === 0;
            if (key === 'next_1_7') return days >= 1 && days <= 7;
            return days >= 8 && days <= 30;
          });
          openDrill({
            type: 'custom',
            title: 'Pipeline horizon',
            subtitle: `${bucketDeals.length} deal${bucketDeals.length === 1 ? '' : 's'} in this horizon`,
            rows: bucketDeals.length === 0
              ? [{ label: 'No deals in this horizon', value: '—' }]
              : bucketDeals.map((deal) => ({
                  label: deal.dealname || 'Unnamed Deal',
                  sublabel: `${deal.stageLabel} · ${deal.daysInStage}d in stage`,
                  value: formatCurrency(deal.amount),
                })),
          });
        };

        return (
          <HorizonRow
            variant="hubspot-pipeline"
            title="Deal close horizons"
            subtitle="Stale deals bucketed by close date · stalled = all flagged deals"
            data={horizonData}
            onCardClick={horizonClick}
          />
        );
      })()}

      {/* Health Score + Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Overall Health */}
        <Card className={`border ${getHealthBg(combinedHealth)}`}>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline Health</p>
            <p className={`text-4xl font-bold mt-1 ${getHealthColor(combinedHealth)}`}>
              {combinedHealth}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {combinedHealth >= 70 ? 'Healthy' : combinedHealth >= 40 ? 'Needs attention' : 'Critical'}
            </p>
          </CardContent>
        </Card>

        {/* Total Deals */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Deals</p>
            <p className="text-2xl font-bold mt-1">{data.meta.totalDeals}</p>
            <p className="text-xs text-muted-foreground">
              {data.meta.totalStaleDeals} need attention
            </p>
          </CardContent>
        </Card>

        {/* Stale Value at Risk */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Value at Risk</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {formatCurrencyCompact(data.meta.totalStaleValue)}
            </p>
            <p className="text-xs text-muted-foreground">stale deal value</p>
          </CardContent>
        </Card>

        {/* Dead Deals */}
        <Card className="border-red-100">
          <CardContent className="pt-5 pb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Dead Deals</p>
            <p className="text-2xl font-bold text-red-700 mt-1">
              {(data.sales.staleAnalysis.bySeverity.dead?.count ?? 0) +
                (data.unconfirmed.staleAnalysis.bySeverity.dead?.count ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrencyCompact(
                (data.sales.staleAnalysis.bySeverity.dead?.value ?? 0) +
                (data.unconfirmed.staleAnalysis.bySeverity.dead?.value ?? 0)
              )}
            </p>
          </CardContent>
        </Card>

        {/* Pipeline Value */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline Value</p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrencyCompact(
                data.sales.pipelineSummary.totalValue +
                data.unconfirmed.pipelineSummary.totalValue
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrencyCompact(
                data.sales.pipelineSummary.weightedValue +
                data.unconfirmed.pipelineSummary.weightedValue
              )} weighted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-pipeline health */}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { label: 'Sales Pipeline', d: data.sales, key: 'sales' as const },
          { label: 'Unconfirmed Orders', d: data.unconfirmed, key: 'unconfirmed' as const },
        ].map(({ label, d }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                <Badge
                  variant="outline"
                  className={`${getHealthColor(d.staleAnalysis.healthScore)} text-[10px]`}
                >
                  Health: {d.staleAnalysis.healthScore}/100
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-xs">
                <span>{d.totalDeals} deals</span>
                <span className="text-muted-foreground">|</span>
                <span>{formatCurrencyCompact(d.pipelineSummary.totalValue)} total</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-red-600">{d.staleAnalysis.staleDeals.length} stale</span>
              </div>
              {/* Stage breakdown */}
              {d.staleAnalysis.byStage.length > 0 && (
                <div className="mt-3 space-y-1">
                  {d.staleAnalysis.byStage.map((s) => (
                    <div key={s.stageLabel} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{s.stageLabel}</span>
                      <div className="flex items-center gap-2">
                        <span>{s.count} deals</span>
                        <span className="text-muted-foreground">avg {s.avgDaysInStage}d</span>
                        <span className="font-medium">{formatCurrencyCompact(s.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1">
          {(['all', 'dead', 'stale', 'warning'] as const).map((sev) => (
            <Button
              key={sev}
              variant={filterSeverity === sev ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setFilterSeverity(sev)}
            >
              {sev === 'all' ? `All (${allStale.length})` :
                `${sev.charAt(0).toUpperCase() + sev.slice(1)} (${allStale.filter((d) => d.severity === sev).length})`}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 border-l pl-3">
          {(['all', 'sales', 'unconfirmed'] as const).map((pip) => (
            <Button
              key={pip}
              variant={filterPipeline === pip ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setFilterPipeline(pip)}
            >
              {pip === 'all' ? 'Both Pipelines' : pip === 'sales' ? 'Sales' : 'Unconfirmed'}
            </Button>
          ))}
        </div>
      </div>

      {/* Stale Deals Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Stale Deals ({filtered.length})
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {formatCurrency(filtered.reduce((s, d) => s + d.amount, 0))} at risk
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium text-emerald-700">Pipeline looks healthy</p>
              <p className="text-xs text-muted-foreground mt-1">
                No stale deals match the current filters
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((deal) => {
                const cfg = SEVERITY_CONFIG[deal.severity];
                const Icon = cfg.icon;
                return (
                  <div
                    key={deal.id}
                    className={`rounded-lg border ${cfg.border} ${cfg.bg} p-3`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.text}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">
                              {deal.dealname || 'Unnamed Deal'}
                            </span>
                            <Badge variant="outline" className={`${cfg.text} ${cfg.border} text-[10px]`}>
                              {cfg.label}
                            </Badge>
                            {'pipelineName' in deal && (
                              <Badge variant="secondary" className="text-[10px]">
                                {(deal as { pipelineName: string }).pipelineName}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span>{deal.stageLabel}</span>
                            <span>{deal.daysInStage}d in stage</span>
                            <span>{deal.daysSinceCreated}d total age</span>
                            {deal.closedateOverdue && (
                              <span className="text-red-600 font-medium">Close date overdue</span>
                            )}
                          </div>
                          <p className={`text-xs mt-1.5 ${cfg.text}`}>
                            <ArrowRight className="inline h-3 w-3 mr-1" />
                            {deal.suggestedAction}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{formatCurrency(deal.amount)}</p>
                        <a
                          href={`https://app.hubspot.com/contacts/deals/${deal.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 mt-1"
                        >
                          Open in HubSpot <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
