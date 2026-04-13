'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatting/currency';
import type {
  DebtFacility,
  DebtClassification,
  DebtCategory,
  CLASSIFICATION_CONFIG as ClassConfig,
  CATEGORY_LABELS as CatLabels,
} from '@/types/debt';

// ---------------------------------------------------------------------------
// Types for API response
// ---------------------------------------------------------------------------

interface DebtAPIResponse {
  facilities: DebtFacility[];
}

// ---------------------------------------------------------------------------
// Classification colours (inline to avoid importing non-serializable config)
// ---------------------------------------------------------------------------

const CLASSIFICATION_COLORS: Record<DebtClassification, { bg: string; text: string; bar: string }> = {
  bad: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
  okay: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  good: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  unclassified: { bg: 'bg-gray-50', text: 'text-gray-600', bar: 'bg-gray-400' },
};

const CATEGORY_DISPLAY: Record<DebtCategory, string> = {
  lender: 'Lenders',
  creditor: 'Creditors',
  director_loan: 'Director Loans',
  tax_statutory: 'Tax & Statutory',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DebtTrackerWidget() {
  const [facilities, setFacilities] = useState<DebtFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/debt')
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((d: DebtAPIResponse) => setFacilities(d.facilities ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Debt Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || facilities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Debt Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-xs text-muted-foreground">
            {error === '401' ? 'Sign in to view debt data' : 'No debt facilities found'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const active = facilities.filter((f) => f.status === 'active');
  const totalOutstanding = active.reduce((s, f) => s + (f.current_balance || 0), 0);
  const totalMonthly = active.reduce((s, f) => s + (f.monthly_repayment || 0), 0);

  // Classification breakdown
  const byClassification = (['bad', 'okay', 'good', 'unclassified'] as DebtClassification[]).map((cls) => {
    const group = active.filter((f) => f.classification === cls);
    return {
      classification: cls,
      count: group.length,
      balance: group.reduce((s, f) => s + (f.current_balance || 0), 0),
      monthly: group.reduce((s, f) => s + (f.monthly_repayment || 0), 0),
    };
  }).filter((g) => g.count > 0);

  // Category breakdown
  const byCategory = (['lender', 'creditor', 'director_loan', 'tax_statutory'] as DebtCategory[]).map((cat) => {
    const group = active.filter((f) => f.category === cat);
    return {
      category: cat,
      count: group.length,
      balance: group.reduce((s, f) => s + (f.current_balance || 0), 0),
      monthly: group.reduce((s, f) => s + (f.monthly_repayment || 0), 0),
    };
  }).filter((g) => g.count > 0);

  // Top 5 facilities by monthly repayment
  const topByMonthly = [...active]
    .sort((a, b) => (b.monthly_repayment || 0) - (a.monthly_repayment || 0))
    .slice(0, 5);

  // Risk flags
  const dailyRepayment = active.filter((f) => f.repayment_frequency === 'daily');
  const highAPR = active.filter((f) => (f.effective_apr ?? f.interest_rate) > 0.3);
  const actionRequired = active.filter((f) => f.action_required);
  const missingInfo = active.filter((f) => f.missing_info && f.missing_info.length > 0);

  const riskFlags: { label: string; count: number; severity: 'red' | 'amber' | 'blue' }[] = [];
  if (dailyRepayment.length > 0) riskFlags.push({ label: 'Daily repayment (cash drain)', count: dailyRepayment.length, severity: 'red' });
  if (highAPR.length > 0) riskFlags.push({ label: 'Effective APR > 30%', count: highAPR.length, severity: 'red' });
  if (actionRequired.length > 0) riskFlags.push({ label: 'Action required', count: actionRequired.length, severity: 'amber' });
  if (missingInfo.length > 0) riskFlags.push({ label: 'Missing information', count: missingInfo.length, severity: 'blue' });

  const maxBalance = Math.max(...byClassification.map((g) => g.balance), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Debt Tracker</CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {active.length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Outstanding</p>
            <p className="text-lg font-bold">{formatCurrencyCompact(totalOutstanding)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monthly Burn</p>
            <p className="text-lg font-bold text-red-600">{formatCurrencyCompact(totalMonthly)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Annual Cost</p>
            <p className="text-lg font-bold">{formatCurrencyCompact(totalMonthly * 12)}</p>
          </div>
        </div>

        {/* Classification breakdown bars */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">By Classification</p>
          {byClassification.map((group) => {
            const colors = CLASSIFICATION_COLORS[group.classification];
            const widthPct = Math.max((group.balance / maxBalance) * 100, 10);
            return (
              <div key={group.classification} className="flex items-center gap-2">
                <span className={`w-20 text-xs font-medium capitalize ${colors.text}`}>
                  {group.classification}
                </span>
                <div className="flex-1 relative h-5">
                  <div
                    className={`h-full rounded ${colors.bar} transition-all`}
                    style={{ width: `${widthPct}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold text-white">
                    {group.count}
                  </span>
                </div>
                <span className="w-16 text-right text-xs text-muted-foreground">
                  {formatCurrencyCompact(group.balance)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Top facilities by monthly cost */}
        <div className="pt-2 border-t">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Top Monthly Costs</p>
          <div className="space-y-1">
            {topByMonthly.map((f) => {
              const colors = CLASSIFICATION_COLORS[f.classification ?? 'unclassified'];
              return (
                <div key={f.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${colors.bar}`} />
                    <span className="truncate">{f.facility_name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-muted-foreground">{formatCurrency(f.current_balance)}</span>
                    <span className="font-medium w-16 text-right">
                      {formatCurrency(f.monthly_repayment)}/mo
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category split */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          {byCategory.map((cat) => (
            <div key={cat.category}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {CATEGORY_DISPLAY[cat.category]}
              </p>
              <p className="text-sm font-bold">{formatCurrencyCompact(cat.balance)}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatCurrencyCompact(cat.monthly)}/mo ({cat.count})
              </p>
            </div>
          ))}
        </div>

        {/* Risk flags */}
        {riskFlags.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t">
            {riskFlags.map((flag) => (
              <div
                key={flag.label}
                className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs ${
                  flag.severity === 'red'
                    ? 'border border-red-200 bg-red-50 text-red-800'
                    : flag.severity === 'amber'
                    ? 'border border-amber-200 bg-amber-50 text-amber-800'
                    : 'border border-blue-200 bg-blue-50 text-blue-800'
                }`}
              >
                <span className="font-medium">{flag.label}</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    flag.severity === 'red'
                      ? 'border-red-300 text-red-700'
                      : flag.severity === 'amber'
                      ? 'border-amber-300 text-amber-700'
                      : 'border-blue-300 text-blue-700'
                  }`}
                >
                  {flag.count}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
