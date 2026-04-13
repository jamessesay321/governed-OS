'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatting/currency';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types (mirrors trunk-show-roi.ts output)
// ---------------------------------------------------------------------------

interface TrunkShowEvent {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  consultations: number;
  convertedBrides: string[];
  attributedRevenue: number;
  spend: number;
  roi: number | null;
}

interface TrunkShowTotals {
  totalEvents: number;
  totalConsultations: number;
  totalConvertedBrides: number;
  totalAttributedRevenue: number;
  totalSpend: number;
  overallROI: number | null;
  avgRevenuePerShow: number;
  avgConsultationsPerShow: number;
  conversionRate: number | null;
}

interface UpcomingShow {
  name: string;
  date: string;
  type: string;
  location: string;
}

interface TrunkShowROIData {
  events: TrunkShowEvent[];
  totals: TrunkShowTotals;
  upcoming: UpcomingShow[];
  sources: Record<string, { connected: boolean }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPct(n: number | null): string {
  if (n === null) return '--';
  return `${Math.round(n)}%`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TrunkShowROIWidget() {
  const [data, setData] = useState<TrunkShowROIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/integrations/trunk-show-roi')
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((d) => setData(d as TrunkShowROIData))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Trunk Show ROI</CardTitle>
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
          <CardTitle className="text-sm font-semibold">Trunk Show ROI</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-xs text-muted-foreground">
            {error === '401' ? 'Sign in to view show data' : 'Unable to load trunk show data'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { totals, events, upcoming } = data;
  const recentEvents = events.slice(0, 4);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Trunk Show ROI</CardTitle>
          <Link
            href="/trunk-shows"
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Full analysis →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Spend</p>
            <p className="text-lg font-bold">{formatCurrencyCompact(totals.totalSpend)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Attributed Revenue</p>
            <p className="text-lg font-bold text-emerald-600">
              {formatCurrencyCompact(totals.totalAttributedRevenue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overall ROI</p>
            <p className={`text-lg font-bold ${
              totals.overallROI !== null && totals.overallROI > 0 ? 'text-emerald-600' :
              totals.overallROI !== null && totals.overallROI < 0 ? 'text-red-600' : ''
            }`}>
              {formatPct(totals.overallROI)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversion</p>
            <p className="text-lg font-bold">
              {formatPct(totals.conversionRate !== null ? totals.conversionRate * 100 : null)}
            </p>
          </div>
        </div>

        {/* Per-show avg */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Shows</p>
            <p className="text-sm font-bold">{totals.totalEvents}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg/Show</p>
            <p className="text-sm font-bold">{formatCurrencyCompact(totals.avgRevenuePerShow)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Consults</p>
            <p className="text-sm font-bold">{Math.round(totals.avgConsultationsPerShow)}</p>
          </div>
        </div>

        {/* Recent shows */}
        {recentEvents.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
              Recent Shows
            </p>
            <div className="space-y-1">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                      event.roi !== null && event.roi > 0 ? 'bg-emerald-500' :
                      event.roi !== null && event.roi < 0 ? 'bg-red-500' :
                      'bg-gray-400'
                    }`} />
                    <span className="truncate">{event.name}</span>
                    <span className="text-muted-foreground shrink-0">{formatDate(event.startDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-muted-foreground">{event.consultations} consults</span>
                    <span className="font-medium">{formatCurrencyCompact(event.attributedRevenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming shows */}
        {upcoming.length > 0 && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-2">
            <p className="text-xs font-medium text-blue-800">
              {upcoming.length} upcoming trunk show consultation{upcoming.length !== 1 ? 's' : ''}
            </p>
            <p className="text-[10px] text-blue-600 mt-0.5">
              Next: {upcoming[0].name} — {formatDate(upcoming[0].date)}
              {upcoming[0].location ? ` at ${upcoming[0].location}` : ''}
            </p>
          </div>
        )}

        {/* No data state */}
        {totals.totalEvents === 0 && upcoming.length === 0 && (
          <div className="py-2 text-center">
            <p className="text-xs text-muted-foreground">
              No trunk show events detected. Shows are identified by appointment type/location keywords in Acuity.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
