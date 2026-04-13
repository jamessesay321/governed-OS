'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types (mirrors funnel-metrics.ts output)
// ---------------------------------------------------------------------------

interface FunnelStage {
  stage: string;
  count: number;
  value: number;
}

interface ConversionRates {
  consultationToOrder: number | null;
  consultationToDeal: number | null;
  dealToConfirmedOrder: number | null;
  orderToFullPayment: number | null;
}

interface FunnelData {
  summary: {
    stages: FunnelStage[];
    conversionRates: ConversionRates;
    totalUniqueBrides: number;
    droppedAfterConsultation: string[];
    awaitingPayment: string[];
    completedJourneys: number;
    avgDaysToConvert: number | null;
    monthlyConversions: {
      month: string;
      consultations: number;
      confirmedOrders: number;
      conversionRate: number | null;
    }[];
  };
  sources: Record<string, { connected: boolean; records: number }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(n: number | null): string {
  if (n === null) return '--';
  return `${Math.round(n * 100)}%`;
}

const STAGE_COLORS: Record<string, string> = {
  Consultation: 'bg-blue-500',
  'Deal Created': 'bg-indigo-500',
  'Order Confirmed': 'bg-violet-500',
  'Partially Paid': 'bg-amber-500',
  'Fully Paid': 'bg-green-500',
  Lost: 'bg-red-400',
};

export function BrideFunnelWidget() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/integrations/funnel')
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((d) => setData(d as FunnelData))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Bride Journey Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Bride Journey Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-xs text-muted-foreground">
            {error === '401' ? 'Sign in to view funnel' : 'Unable to load funnel data'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { summary, sources } = data;
  const maxCount = Math.max(...summary.stages.filter((s) => s.stage !== 'Lost').map((s) => s.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Bride Journey Funnel</CardTitle>
          <div className="flex gap-1">
            {Object.entries(sources).map(([name, info]) => (
              <Badge
                key={name}
                variant="outline"
                className={`text-[10px] ${info.connected ? 'border-green-300 text-green-700' : 'border-red-300 text-red-600'}`}
              >
                {name}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Funnel bars */}
        <div className="space-y-1.5">
          {summary.stages.filter((s) => s.stage !== 'Lost').map((stage) => {
            const widthPct = Math.max((stage.count / maxCount) * 100, 8);
            return (
              <div key={stage.stage} className="flex items-center gap-2">
                <span className="w-28 text-xs text-muted-foreground truncate">{stage.stage}</span>
                <div className="flex-1 relative h-6">
                  <div
                    className={`h-full rounded ${STAGE_COLORS[stage.stage] ?? 'bg-gray-400'} transition-all`}
                    style={{ width: `${widthPct}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-white">
                    {stage.count}
                  </span>
                </div>
                <span className="w-20 text-right text-xs text-muted-foreground">
                  {stage.value > 0 ? formatCurrency(stage.value) : ''}
                </span>
              </div>
            );
          })}
          {/* Lost row */}
          {summary.stages.filter((s) => s.stage === 'Lost').map((stage) => (
            <div key="lost" className="flex items-center gap-2 opacity-70">
              <span className="w-28 text-xs text-muted-foreground">Lost</span>
              <div className="flex-1 relative h-6">
                <div
                  className="h-full rounded bg-red-400"
                  style={{ width: `${Math.max((stage.count / maxCount) * 100, 8)}%` }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-white">
                  {stage.count}
                </span>
              </div>
              <span className="w-20 text-right text-xs text-muted-foreground">
                {stage.value > 0 ? formatCurrency(stage.value) : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Conversion rates */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Consultation → Order</p>
            <p className="text-lg font-bold">{formatPct(summary.conversionRates.consultationToOrder)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Days to Convert</p>
            <p className="text-lg font-bold">{summary.avgDaysToConvert != null ? `${Math.round(summary.avgDaysToConvert)}d` : '--'}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Awaiting Payment</p>
            <p className="text-lg font-bold">{summary.awaitingPayment.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fully Completed</p>
            <p className="text-lg font-bold text-green-600">{summary.completedJourneys}</p>
          </div>
        </div>

        {/* Dropped brides alert */}
        {summary.droppedAfterConsultation.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
            <p className="text-xs font-medium text-amber-800">
              {summary.droppedAfterConsultation.length} brides had consultations but no confirmed order
            </p>
            <p className="text-[10px] text-amber-600 mt-0.5 truncate">
              {summary.droppedAfterConsultation.slice(0, 5).join(', ')}
              {summary.droppedAfterConsultation.length > 5 && ` +${summary.droppedAfterConsultation.length - 5} more`}
            </p>
          </div>
        )}

        {/* Monthly trend (last 3 months) */}
        {summary.monthlyConversions.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Monthly Conversion</p>
            <div className="space-y-1">
              {summary.monthlyConversions.slice(-3).map((m) => (
                <div key={m.month} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{m.month}</span>
                  <span>{m.consultations} consults → {m.confirmedOrders} orders</span>
                  <span className="font-medium">{formatPct(m.conversionRate)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
