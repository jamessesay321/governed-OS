'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface AlertSummaryData {
  critical: number;
  warning: number;
  info: number;
  recentAlerts: { id: string; label: string; severity: string; triggeredAt: string }[];
}

interface AlertSummaryWidgetProps {
  data?: AlertSummaryData;
}

const SEVERITY_CONFIG: Record<string, { icon: typeof Info; bg: string; text: string }> = {
  critical: { icon: AlertCircle, bg: 'bg-red-100', text: 'text-red-700' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-100', text: 'text-amber-700' },
  info: { icon: Info, bg: 'bg-blue-100', text: 'text-blue-700' },
};

export function AlertSummaryWidget({ data: propData }: AlertSummaryWidgetProps) {
  const [data, setData] = useState<AlertSummaryData | null>(propData ?? null);
  const [loading, setLoading] = useState(!propData);

  useEffect(() => {
    if (propData) return;
    let cancelled = false;

    async function fetchAlerts() {
      try {
        const res = await fetch('/api/kpi/alerts');
        if (res.ok) {
          const json = await res.json();
          const rules = json.rules as { id: string; metric_label: string; severity: string; enabled: boolean; created_at: string }[];
          const enabled = rules.filter((r) => r.enabled);
          const summary: AlertSummaryData = {
            critical: enabled.filter((r) => r.severity === 'critical').length,
            warning: enabled.filter((r) => r.severity === 'warning').length,
            info: enabled.filter((r) => r.severity === 'info').length,
            recentAlerts: enabled.slice(0, 3).map((r) => ({
              id: r.id,
              label: r.metric_label,
              severity: r.severity,
              triggeredAt: r.created_at,
            })),
          };
          if (!cancelled) setData(summary);
        }
      } catch {
        // Silently fail — widget is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAlerts();
    return () => { cancelled = true; };
  }, [propData]);

  const totalAlerts = data ? data.critical + data.warning + data.info : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Alert Summary</CardTitle>
          <Link href="/dashboard/alerts" className="text-xs text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Loading alerts...</p>
        ) : !data || totalAlerts === 0 ? (
          <div className="py-4 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-xs text-muted-foreground">No active alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Severity counts */}
            <div className="grid grid-cols-3 gap-2">
              {(['critical', 'warning', 'info'] as const).map((sev) => {
                const config = SEVERITY_CONFIG[sev];
                const Icon = config.icon;
                const count = data[sev];
                return (
                  <div
                    key={sev}
                    className={`flex flex-col items-center rounded-lg px-2 py-2 ${config.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${config.text}`} />
                    <span className={`text-lg font-bold ${config.text}`}>{count}</span>
                    <span className={`text-[10px] capitalize ${config.text}`}>{sev}</span>
                  </div>
                );
              })}
            </div>

            {/* Recent alerts */}
            {data.recentAlerts.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Recent</p>
                {data.recentAlerts.map((alert) => {
                  const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
                  const SevIcon = sev.icon;
                  return (
                    <div key={alert.id} className="flex items-center gap-2 text-xs">
                      <SevIcon className={`h-3 w-3 shrink-0 ${sev.text}`} />
                      <span className="truncate">{alert.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
