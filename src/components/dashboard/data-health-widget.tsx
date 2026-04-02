'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/components/providers/user-context';
import { ShieldCheck, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

type HealthCheck = {
  name: string;
  score: number;
  status: 'pass' | 'warn' | 'fail';
  message: string;
};

type HealthReport = {
  overall_score: number;
  period: string;
  checks: HealthCheck[];
  recommendations: string[];
  forecast_ready: boolean;
};

const CHECK_LABELS: Record<string, string> = {
  transaction_coverage: 'Transactions',
  account_mapping_completeness: 'Account Mapping',
  reconciliation_status: 'Reconciliation',
  period_continuity: 'Period Continuity',
  categorisation_quality: 'Categorisation',
  balance_sheet_completeness: 'Balance Sheet',
};

function ScoreRing({ score }: { score: number }) {
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
        {score}
      </span>
    </div>
  );
}

function StatusIcon({ status }: { status: 'pass' | 'warn' | 'fail' }) {
  if (status === 'pass') return <ShieldCheck className="h-3 w-3 text-emerald-500" />;
  if (status === 'warn') return <AlertTriangle className="h-3 w-3 text-amber-500" />;
  return <XCircle className="h-3 w-3 text-red-500" />;
}

export function DataHealthWidget() {
  const { orgId } = useUser();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch(`/api/data-health/${orgId}`);
        if (res.ok) {
          const data = await res.json();
          setReport(data);
        }
      } catch {
        // Silently fail - widget is non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchHealth();
  }, [orgId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Data Health</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Data Health</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Connect your accounting software and sync data to see your data quality score.
          </p>
        </CardContent>
      </Card>
    );
  }

  const checks = Array.isArray(report.checks) ? report.checks : [];
  const passCount = checks.filter((c) => c.status === 'pass').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;

  const periodLabel = (() => {
    try {
      const d = new Date(report.period);
      return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    } catch {
      return report.period;
    }
  })();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Data Health</CardTitle>
          <Badge variant="outline" className="text-[10px] font-normal">
            {periodLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score + summary row */}
        <div className="flex items-center gap-3">
          <ScoreRing score={report.overall_score} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {report.forecast_ready ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                  Forecast Ready
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                  Needs Attention
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">
                {passCount} pass, {warnCount} warn, {failCount} fail
              </span>
            </div>
            {report.recommendations.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {report.recommendations[0]}
              </p>
            )}
          </div>
        </div>

        {/* Check breakdown */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {checks.map((check) => (
            <div key={check.name} className="flex items-center gap-1.5">
              <StatusIcon status={check.status} />
              <span className="text-[10px] text-muted-foreground truncate">
                {CHECK_LABELS[check.name] ?? check.name}
              </span>
            </div>
          ))}
        </div>

        {/* Link to full health page */}
        <Link
          href="/integrations/health"
          className="block text-[10px] text-primary hover:underline"
        >
          View full report
        </Link>
      </CardContent>
    </Card>
  );
}
