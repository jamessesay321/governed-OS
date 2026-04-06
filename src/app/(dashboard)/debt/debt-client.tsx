'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingDown,
  Calendar,
  CreditCard,
  Building2,
  Users,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Zap,
  ChevronDown,
  ChevronRight,
  Landmark,
  Banknote,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type {
  DebtFacility,
  DebtSummary,
  DebtClassification,
  FacilityType,
} from '@/types/debt';
import { CLASSIFICATION_CONFIG, FACILITY_TYPE_LABELS } from '@/types/debt';

interface DebtClientProps {
  facilities: DebtFacility[];
  summary: DebtSummary;
  hasData: boolean;
  orgId: string;
}

type ViewTab = 'overview' | 'facilities' | 'timeline' | 'refinance';
type FacilityFilter = 'all' | 'business' | 'director' | 'creditor' | 'mca';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ClassificationIcon({ classification }: { classification: DebtClassification }) {
  switch (classification) {
    case 'good':
      return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    case 'okay':
      return <AlertCircle className="h-5 w-5 text-amber-600" />;
    case 'bad':
      return <XCircle className="h-5 w-5 text-red-600" />;
    default:
      return <HelpCircle className="h-5 w-5 text-gray-400" />;
  }
}

function FacilityTypeIcon({ type }: { type: FacilityType }) {
  switch (type) {
    case 'mca':
      return <Zap className="h-4 w-4" />;
    case 'credit_card':
      return <CreditCard className="h-4 w-4" />;
    case 'director_loan':
      return <Users className="h-4 w-4" />;
    case 'government_loan':
      return <Landmark className="h-4 w-4" />;
    case 'creditor_plan':
      return <FileText className="h-4 w-4" />;
    case 'secured_loan':
      return <Shield className="h-4 w-4" />;
    default:
      return <Building2 className="h-4 w-4" />;
  }
}

// ============================================================
// Summary Cards
// ============================================================
function SummaryCards({ summary }: { summary: DebtSummary }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Outstanding</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(summary.total_outstanding)}</p>
        <p className="mt-1 text-xs text-gray-500">{summary.active_count} active facilities</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Monthly Repayments</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(summary.total_monthly_repayment)}</p>
        <p className="mt-1 text-xs text-gray-500">{formatCurrency(summary.total_annual_cost)}/year</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Weighted Avg Rate</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{formatRate(summary.weighted_average_rate)}</p>
        <p className="mt-1 text-xs text-red-600">Highest: {summary.highest_rate_facility}</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Next Maturity</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {summary.next_maturity ? formatDate(summary.next_maturity.date) : '--'}
        </p>
        <p className="mt-1 text-xs text-gray-500 truncate">
          {summary.next_maturity?.facility ?? 'No maturities scheduled'}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Classification Breakdown Bar
// ============================================================
function ClassificationBar({ summary }: { summary: DebtSummary }) {
  const total = summary.good_total + summary.okay_total + summary.bad_total;
  if (total === 0) return null;

  const goodPct = (summary.good_total / total) * 100;
  const okayPct = (summary.okay_total / total) * 100;
  const badPct = (summary.bad_total / total) * 100;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Debt Health Classification</h3>
        <p className="text-xs text-gray-500">{formatCurrency(total)} total classified</p>
      </div>
      {/* Stacked bar */}
      <div className="flex h-4 overflow-hidden rounded-full">
        {goodPct > 0 && (
          <div className="bg-emerald-500 transition-all" style={{ width: `${goodPct}%` }} />
        )}
        {okayPct > 0 && (
          <div className="bg-amber-400 transition-all" style={{ width: `${okayPct}%` }} />
        )}
        {badPct > 0 && (
          <div className="bg-red-500 transition-all" style={{ width: `${badPct}%` }} />
        )}
      </div>
      <div className="mt-3 flex justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-gray-600">Good {formatCurrency(summary.good_total)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="text-gray-600">Okay {formatCurrency(summary.okay_total)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-gray-600">Bad {formatCurrency(summary.bad_total)}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Debt Composition Split
// ============================================================
function DebtComposition({ summary }: { summary: DebtSummary }) {
  const segments = [
    { label: 'Business Loans', amount: summary.business_loans_total, color: 'bg-blue-500', icon: Building2 },
    { label: 'MCAs', amount: summary.mca_total, color: 'bg-orange-500', icon: Zap },
    { label: 'Director Loans', amount: summary.director_loans_total, color: 'bg-purple-500', icon: Users },
    { label: 'Creditor Plans', amount: summary.creditor_plans_total, color: 'bg-gray-500', icon: FileText },
  ].filter((s) => s.amount > 0);

  const total = segments.reduce((s, seg) => s + seg.amount, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Debt Composition</h3>
      <div className="space-y-3">
        {segments.map((seg) => {
          const pct = total > 0 ? (seg.amount / total) * 100 : 0;
          const Icon = seg.icon;
          return (
            <div key={seg.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 text-gray-700">
                  <Icon className="h-3.5 w-3.5" />
                  {seg.label}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{formatCurrency(seg.amount)}</span>
                  <span className="text-gray-400">{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', seg.color)} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Facility Card
// ============================================================
function FacilityCard({ facility }: { facility: DebtFacility }) {
  const [expanded, setExpanded] = useState(false);
  const config = CLASSIFICATION_CONFIG[facility.classification];
  const rate = Number(facility.effective_apr ?? facility.interest_rate ?? 0);
  const balance = Number(facility.current_balance);
  const monthly = Number(facility.monthly_repayment);
  const isPaidOff = facility.status === 'paid_off';

  return (
    <div className={cn(
      'rounded-xl border bg-white transition-all',
      isPaidOff ? 'border-gray-200 opacity-60' : config.borderColor,
    )}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <ClassificationIcon classification={facility.classification} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 text-sm truncate">{facility.facility_name}</h4>
            {isPaidOff && (
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-gray-100 text-gray-500 rounded-full">
                Paid Off
              </span>
            )}
            {facility.refinance_eligible && (
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-blue-50 text-blue-600 rounded-full">
                Refinance
              </span>
            )}
            {facility.has_debenture && (
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-red-50 text-red-600 rounded-full">
                Debenture
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
            <FacilityTypeIcon type={facility.facility_type} />
            {FACILITY_TYPE_LABELS[facility.facility_type]}
            {facility.lender && ` \u00B7 ${facility.lender}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-900">{formatCurrency(balance)}</p>
          {monthly > 0 && (
            <p className="text-xs text-gray-500">{formatCurrencyFull(monthly)}/mo</p>
          )}
        </div>
        <div className="ml-2">
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Original Amount</p>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(Number(facility.original_amount))}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Interest / APR</p>
              <p className={cn('text-sm font-medium', rate > 0.5 ? 'text-red-600' : rate > 0.1 ? 'text-amber-600' : 'text-gray-900')}>
                {rate > 0 ? formatRate(rate) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Maturity</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(facility.maturity_date)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Frequency</p>
              <p className="text-sm font-medium text-gray-900 capitalize">
                {facility.repayment_frequency.replace('_', '-')}
              </p>
            </div>
          </div>

          {/* MCA specific */}
          {facility.sweep_percentage && (
            <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
              <p className="text-xs font-medium text-orange-800">
                MCA Sweep: {facility.sweep_percentage}% of {facility.sweep_source ?? 'income'} payments
              </p>
              <p className="text-[10px] text-orange-600 mt-0.5">
                Variable repayment — no fixed monthly amount. Repaid when income is earned.
              </p>
            </div>
          )}

          {/* Director loan specific */}
          {facility.director_name && (
            <div className="rounded-lg bg-purple-50 border border-purple-100 p-3">
              <p className="text-xs font-medium text-purple-800">
                Director: {facility.director_name}
              </p>
              {facility.payment_day && (
                <p className="text-[10px] text-purple-600 mt-0.5">
                  DD on {facility.payment_day}th of month
                </p>
              )}
            </div>
          )}

          {/* Secured */}
          {facility.secured && facility.collateral_description && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
              <p className="text-xs font-medium text-blue-800 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                Secured: {facility.collateral_description}
              </p>
            </div>
          )}

          {/* Refinance notes */}
          {facility.refinance_notes && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Refinance Notes</p>
              <p className="text-xs text-gray-700">{facility.refinance_notes}</p>
            </div>
          )}

          {/* General notes */}
          {facility.notes && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Notes</p>
              <p className="text-xs text-gray-600">{facility.notes}</p>
            </div>
          )}

          {/* Statement access */}
          {facility.statement_access && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <FileText className="h-3.5 w-3.5" />
              Statement access: {facility.statement_access}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Payment Timeline
// ============================================================
function PaymentTimeline({ facilities }: { facilities: DebtFacility[] }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = 2026;

  // For each month, sum monthly repayments of active facilities
  const monthlyData = months.map((month, idx) => {
    const period = `${year}-${String(idx + 1).padStart(2, '0')}`;
    let total = 0;
    const breakdown: { name: string; amount: number; classification: DebtClassification }[] = [];

    for (const f of facilities) {
      if (f.status !== 'active') continue;
      const monthly = Number(f.monthly_repayment);
      if (monthly <= 0) continue;

      // Check if facility is active in this month
      const start = f.start_date ? new Date(f.start_date) : new Date('2020-01-01');
      const end = f.maturity_date ? new Date(f.maturity_date) : new Date('2030-12-31');
      const monthDate = new Date(`${year}-${String(idx + 1).padStart(2, '0')}-15`);

      if (monthDate >= start && monthDate <= end) {
        total += monthly;
        breakdown.push({ name: f.facility_name, amount: monthly, classification: f.classification });
      }
    }

    return { month, period, total, breakdown };
  });

  const maxTotal = Math.max(...monthlyData.map((m) => m.total), 1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">2026 Monthly Repayment Timeline</h3>
      <div className="flex items-end gap-2 h-48">
        {monthlyData.map((m) => {
          const heightPct = (m.total / maxTotal) * 100;
          const isPast = new Date(`2026-${months.indexOf(m.month) + 1}-28`) < new Date();
          return (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="w-full flex flex-col justify-end h-40">
                <div
                  className={cn(
                    'w-full rounded-t-md transition-all',
                    isPast ? 'bg-gray-300' : 'bg-blue-500 group-hover:bg-blue-600',
                  )}
                  style={{ height: `${Math.max(heightPct, 2)}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 font-medium">{m.month}</span>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-900 text-white rounded-lg p-3 text-xs min-w-48 shadow-lg">
                  <p className="font-semibold mb-1">{m.month} {year}: {formatCurrency(m.total)}</p>
                  {m.breakdown.slice(0, 5).map((b, i) => (
                    <div key={i} className="flex justify-between gap-3 text-gray-300">
                      <span className="truncate">{b.name}</span>
                      <span className="shrink-0">{formatCurrency(b.amount)}</span>
                    </div>
                  ))}
                  {m.breakdown.length > 5 && (
                    <p className="text-gray-400 mt-1">+{m.breakdown.length - 5} more</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Maturity Timeline
// ============================================================
function MaturityTimeline({ facilities }: { facilities: DebtFacility[] }) {
  const withMaturity = facilities
    .filter((f) => f.maturity_date && f.status === 'active')
    .sort((a, b) => new Date(a.maturity_date!).getTime() - new Date(b.maturity_date!).getTime());

  if (withMaturity.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Maturity Schedule</h3>
      <div className="space-y-2">
        {withMaturity.map((f) => {
          const daysLeft = Math.ceil(
            (new Date(f.maturity_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          const isUrgent = daysLeft < 60;
          const isSoon = daysLeft < 180;

          return (
            <div
              key={f.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                isUrgent ? 'border-red-200 bg-red-50' : isSoon ? 'border-amber-200 bg-amber-50' : 'border-gray-100',
              )}
            >
              <Calendar className={cn('h-4 w-4 shrink-0', isUrgent ? 'text-red-600' : isSoon ? 'text-amber-600' : 'text-gray-400')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{f.facility_name}</p>
                <p className="text-xs text-gray-500">{formatDate(f.maturity_date)} &middot; {formatCurrency(Number(f.current_balance))}</p>
              </div>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                isUrgent ? 'bg-red-100 text-red-700' : isSoon ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600',
              )}>
                {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Refinance Scenario Summary (Creative UK Plan from spreadsheet)
// ============================================================
function RefinancePlan() {
  const plan = {
    source: 'Creative UK',
    total_funding: 500000,
    allocation: [
      { item: 'IWOCA', amount: 20000, action: 'Clear' },
      { item: 'Director Loans (DLA)', amount: 140000, action: 'Clear' },
      { item: 'Capital on Tap', amount: 50000, action: 'Clear full balance' },
      { item: 'BizCap & MaxCap', amount: 40000, action: '2 months remaining' },
      { item: 'New Working Capital', amount: 60000, action: 'June requirement' },
    ],
    total_repay: 310000,
    balance_for_investing: 190000,
    remaining_post_refinance: [
      { item: 'Shopify MCA', amount: 150000 },
      { item: 'New Creative UK Loan', amount: 500000 },
      { item: 'BBL', amount: 12748 },
      { item: 'Funding Circle', amount: 35185 },
    ],
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Refinance Plan: Creative UK</h3>
        <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-blue-50 text-blue-600 rounded-full">
          Proposed
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-blue-600">Funding</p>
          <p className="text-lg font-bold text-blue-800">{formatCurrency(plan.total_funding)}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-emerald-600">Debt Clearance</p>
          <p className="text-lg font-bold text-emerald-800">{formatCurrency(plan.total_repay)}</p>
        </div>
        <div className="rounded-lg bg-purple-50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-purple-600">For Investment</p>
          <p className="text-lg font-bold text-purple-800">{formatCurrency(plan.balance_for_investing)}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs font-medium text-gray-700 mb-2">Allocation Plan</p>
        {plan.allocation.map((item) => (
          <div key={item.item} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-gray-700">{item.item}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
              <span className="text-gray-400">{item.action}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-700 mb-2">Remaining Debt Post-Refinance</p>
        {plan.remaining_post_refinance.map((item) => (
          <div key={item.item} className="flex justify-between text-xs py-0.5">
            <span className="text-gray-600">{item.item}</span>
            <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between text-xs py-1 mt-1 border-t border-gray-100 font-semibold">
          <span className="text-gray-900">Total Post-Refinance</span>
          <span className="text-gray-900">
            {formatCurrency(plan.remaining_post_refinance.reduce((s, i) => s + i.amount, 0))}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 p-3">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> Lenders typically require 1.5x DSCR (if repaying 100k, need 150k in EBITDA/profit).
          Sigma declined. Capify declined - still waiting back. Portman lending under review.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Empty State
// ============================================================
function EmptyState({ orgId }: { orgId: string }) {
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/debt/seed', { method: 'POST' });
      const data = await res.json();
      if (data.seeded || data.facilities) {
        setSeeded(true);
        window.location.reload();
      }
    } catch (err) {
      console.error('Seed failed:', err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl text-center py-20">
      <Banknote className="mx-auto h-12 w-12 text-gray-300" />
      <h2 className="mt-4 text-lg font-semibold text-gray-900">Debt Command Centre</h2>
      <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
        Track all business loans, MCAs, director loans, and creditor plans in one place.
        Monitor costs, classify debt health, and plan your refinancing strategy.
      </p>
      <button
        onClick={handleSeed}
        disabled={seeding || seeded}
        className={cn(
          'mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-colors',
          seeded
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-gray-900 text-white hover:bg-gray-800',
        )}
      >
        {seeding ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Seeding debt data...
          </>
        ) : seeded ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Seeded! Refreshing...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Load Alonuko Debt Data
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================
// Main Client
// ============================================================
export function DebtClient({ facilities, summary, hasData, orgId }: DebtClientProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [filter, setFilter] = useState<FacilityFilter>('all');

  const filteredFacilities = useMemo(() => {
    switch (filter) {
      case 'business':
        return facilities.filter((f) =>
          ['term_loan', 'unsecured_loan', 'secured_loan', 'credit_card', 'overdraft', 'government_loan'].includes(f.facility_type)
        );
      case 'director':
        return facilities.filter((f) => f.facility_type === 'director_loan');
      case 'creditor':
        return facilities.filter((f) => f.facility_type === 'creditor_plan');
      case 'mca':
        return facilities.filter((f) => f.facility_type === 'mca');
      default:
        return facilities;
    }
  }, [facilities, filter]);

  // Group by classification
  const byClassification = useMemo(() => {
    const groups: Record<DebtClassification, DebtFacility[]> = {
      bad: [],
      okay: [],
      good: [],
      unclassified: [],
    };
    for (const f of filteredFacilities) {
      groups[f.classification].push(f);
    }
    return groups;
  }, [filteredFacilities]);

  if (!hasData) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debt Command Centre</h1>
          <p className="mt-1 text-sm text-gray-500">
            Full visibility across all business debt, director loans, and creditor arrangements
          </p>
        </div>
        <EmptyState orgId={orgId} />
      </div>
    );
  }

  const tabs: { id: ViewTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'facilities', label: `Facilities (${facilities.length})` },
    { id: 'timeline', label: 'Timeline' },
    { id: 'refinance', label: 'Refinance' },
  ];

  const filterTabs: { id: FacilityFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: facilities.length },
    {
      id: 'business',
      label: 'Business Loans',
      count: facilities.filter((f) =>
        ['term_loan', 'unsecured_loan', 'secured_loan', 'credit_card', 'overdraft', 'government_loan'].includes(f.facility_type)
      ).length,
    },
    { id: 'director', label: 'Director Loans', count: facilities.filter((f) => f.facility_type === 'director_loan').length },
    { id: 'mca', label: 'MCAs', count: facilities.filter((f) => f.facility_type === 'mca').length },
    { id: 'creditor', label: 'Creditor Plans', count: facilities.filter((f) => f.facility_type === 'creditor_plan').length },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Debt Command Centre</h1>
        <p className="mt-1 text-sm text-gray-500">
          Full visibility across all business debt, director loans, and creditor arrangements
        </p>
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={summary} />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ClassificationBar summary={summary} />
          <DebtComposition summary={summary} />
          <div className="lg:col-span-2">
            <PaymentTimeline facilities={facilities} />
          </div>
          <MaturityTimeline facilities={facilities} />
          <RefinancePlan />
        </div>
      )}

      {activeTab === 'facilities' && (
        <div className="space-y-4">
          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {filterTabs.map((ft) => (
              <button
                key={ft.id}
                onClick={() => setFilter(ft.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  filter === ft.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {ft.label} ({ft.count})
              </button>
            ))}
          </div>

          {/* Grouped by classification */}
          {(['bad', 'okay', 'good', 'unclassified'] as DebtClassification[]).map((cls) => {
            const group = byClassification[cls];
            if (group.length === 0) return null;
            const config = CLASSIFICATION_CONFIG[cls];
            const groupTotal = group.reduce((s, f) => s + Number(f.current_balance), 0);

            return (
              <div key={cls}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', cls === 'bad' ? 'bg-red-500' : cls === 'okay' ? 'bg-amber-400' : cls === 'good' ? 'bg-emerald-500' : 'bg-gray-300')} />
                  <h3 className="text-sm font-semibold text-gray-900">
                    {config.label} Debt
                  </h3>
                  <span className="text-xs text-gray-500">{formatCurrency(groupTotal)} across {group.length} facilities</span>
                </div>
                <div className="space-y-2">
                  {group.map((f) => (
                    <FacilityCard key={f.id} facility={f} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="space-y-6">
          <PaymentTimeline facilities={facilities} />
          <MaturityTimeline facilities={facilities} />

          {/* Payment Calendar */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Upcoming Payments</h3>
            <div className="divide-y divide-gray-100">
              {facilities
                .filter((f) => f.status === 'active' && Number(f.monthly_repayment) > 0)
                .sort((a, b) => Number(b.monthly_repayment) - Number(a.monthly_repayment))
                .map((f) => (
                  <div key={f.id} className="flex items-center gap-3 py-3">
                    <ClassificationIcon classification={f.classification} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{f.facility_name}</p>
                      <p className="text-xs text-gray-500">
                        {f.repayment_frequency.replace('_', ' ')}
                        {f.payment_day ? ` on ${f.payment_day}th` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrencyFull(Number(f.monthly_repayment))}</p>
                      <p className="text-[10px] text-gray-400 uppercase">{f.repayment_frequency}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'refinance' && (
        <div className="space-y-6">
          <RefinancePlan />

          {/* Refinance Priority List */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Refinance Priority Order</h3>
            <div className="space-y-2">
              {facilities
                .filter((f) => f.refinance_eligible)
                .sort((a, b) => (a.refinance_priority ?? 99) - (b.refinance_priority ?? 99))
                .map((f, idx) => {
                  const rate = Number(f.effective_apr ?? f.interest_rate ?? 0);
                  return (
                    <div key={f.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                      <span className="h-6 w-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{f.facility_name}</p>
                        <p className="text-xs text-gray-500">{f.refinance_notes}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(f.current_balance))}</p>
                        {rate > 0 && (
                          <p className="text-xs text-red-600">{formatRate(rate)} APR</p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Cost of Debt Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Annual Cost of Debt</h3>
            <div className="space-y-2">
              {facilities
                .filter((f) => f.status === 'active' && Number(f.monthly_repayment) > 0)
                .sort((a, b) => Number(b.monthly_repayment) * 12 - Number(a.monthly_repayment) * 12)
                .map((f) => {
                  const annual = Number(f.monthly_repayment) * 12;
                  const pctOfTotal = summary.total_annual_cost > 0 ? (annual / summary.total_annual_cost) * 100 : 0;
                  return (
                    <div key={f.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="text-gray-700 truncate">{f.facility_name}</span>
                          <span className="font-medium text-gray-900">{formatCurrency(annual)}/yr</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              f.classification === 'bad' ? 'bg-red-500' : f.classification === 'okay' ? 'bg-amber-400' : 'bg-emerald-500',
                            )}
                            style={{ width: `${pctOfTotal}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
