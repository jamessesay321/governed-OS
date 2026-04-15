'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
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
  AlertTriangle,
  Receipt,
  CircleDollarSign,
  Info,
  ExternalLink,
  Clock,
} from 'lucide-react';
import type {
  DebtFacility,
  DebtSummary,
  DebtClassification,
  FacilityType,
  TaxLiabilityFromBS,
  VATQuarter,
} from '@/types/debt';
import { CLASSIFICATION_CONFIG, FACILITY_TYPE_LABELS } from '@/types/debt';
import { ExportButton, type ExportColumn } from '@/components/shared/export-button';
import { NumberLegend } from '@/components/data-primitives';
import { RefinanceModeller } from '@/components/debt/refinance-modeller';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface DebtClientProps {
  facilities: DebtFacility[];
  summary: DebtSummary;
  hasData: boolean;
  orgId: string;
  taxLiabilities: TaxLiabilityFromBS[];
  vatQuarters: VATQuarter[];
  latestPeriod: string | null;
}

type ViewTab = 'overview' | 'lenders' | 'creditors' | 'directors' | 'tax' | 'refinance';

/* ================================================================== */
/*  Formatters                                                         */
/* ================================================================== */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/* ================================================================== */
/*  Icons                                                              */
/* ================================================================== */

function ClassificationIcon({ classification }: { classification: DebtClassification }) {
  switch (classification) {
    case 'good': return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    case 'okay': return <AlertCircle className="h-5 w-5 text-amber-600" />;
    case 'bad': return <XCircle className="h-5 w-5 text-red-600" />;
    default: return <HelpCircle className="h-5 w-5 text-gray-400" />;
  }
}

function FacilityTypeIcon({ type }: { type: FacilityType }) {
  switch (type) {
    case 'mca': return <Zap className="h-4 w-4" />;
    case 'credit_card': return <CreditCard className="h-4 w-4" />;
    case 'director_loan': return <Users className="h-4 w-4" />;
    case 'government_loan': return <Landmark className="h-4 w-4" />;
    case 'creditor_plan': return <FileText className="h-4 w-4" />;
    case 'secured_loan': return <Shield className="h-4 w-4" />;
    case 'paye_plan': return <Receipt className="h-4 w-4" />;
    case 'vat_liability': return <CircleDollarSign className="h-4 w-4" />;
    case 'corp_tax': return <Landmark className="h-4 w-4" />;
    default: return <Building2 className="h-4 w-4" />;
  }
}

/* ================================================================== */
/*  Shared: Balance Sparkline                                          */
/* ================================================================== */

function BalanceSparkline({ history }: { history: DebtFacility['balance_history'] }) {
  if (!history || history.length < 2) return null;

  const sorted = [...history].sort((a, b) => a.period.localeCompare(b.period));
  const balances = sorted.map((h) => Number(h.balance));
  const min = Math.min(...balances);
  const max = Math.max(...balances);
  const range = max - min || 1;

  const width = 120;
  const height = 28;
  const padding = 2;

  const points = balances.map((val, i) => {
    const x = padding + (i / (balances.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const first = balances[0];
  const last = balances[balances.length - 1];
  const trending = last < first ? 'down' : last > first ? 'up' : 'flat';
  const strokeColor = trending === 'down' ? '#10b981' : trending === 'up' ? '#ef4444' : '#94a3b8';

  return (
    <div className="flex items-center gap-2">
      <svg width={width} height={height} className="shrink-0">
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex items-center gap-0.5">
        {trending === 'down' ? (
          <ArrowDownRight className="h-3 w-3 text-emerald-600" />
        ) : trending === 'up' ? (
          <ArrowUpRight className="h-3 w-3 text-red-500" />
        ) : null}
        <span className={cn('text-[10px] font-medium',
          trending === 'down' ? 'text-emerald-600' : trending === 'up' ? 'text-red-500' : 'text-gray-400')}>
          {Math.round(Math.abs(((last - first) / (first || 1)) * 100))}%
        </span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Shared: Facility Card                                              */
/* ================================================================== */

function FacilityCard({ facility, showCreditImpact }: { facility: DebtFacility; showCreditImpact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const config = CLASSIFICATION_CONFIG[facility.classification];
  const rate = Number(facility.effective_apr ?? facility.interest_rate ?? 0);
  const balance = Number(facility.current_balance);
  const monthly = Number(facility.monthly_repayment);
  const isPaidOff = facility.status === 'paid_off';
  const hasMissingInfo = facility.missing_info && facility.missing_info.length > 0;

  return (
    <div className={cn(
      'rounded-xl border bg-white transition-all',
      isPaidOff ? 'border-gray-200 opacity-60' : config.borderColor,
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <ClassificationIcon classification={facility.classification} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900 text-sm truncate">{facility.facility_name}</h4>
            {isPaidOff && (
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-gray-100 text-gray-500 rounded-full">Paid Off</span>
            )}
            {facility.refinance_eligible && (
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-blue-50 text-blue-600 rounded-full">Refinance</span>
            )}
            {facility.has_debenture && (
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-red-50 text-red-600 rounded-full">Debenture</span>
            )}
            {showCreditImpact && facility.credit_impacting && (
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-orange-50 text-orange-600 rounded-full">Credit Impact</span>
            )}
            {hasMissingInfo && (
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-yellow-50 text-yellow-700 rounded-full flex items-center gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> Info Needed
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
            <FacilityTypeIcon type={facility.facility_type} />
            {FACILITY_TYPE_LABELS[facility.facility_type]}
            {facility.lender && ` · ${facility.lender}`}
          </p>
        </div>
        {/* Balance sparkline (hidden on narrow screens) */}
        {facility.balance_history && facility.balance_history.length >= 2 && (
          <div className="hidden sm:block shrink-0">
            <BalanceSparkline history={facility.balance_history} />
          </div>
        )}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-900">{formatCurrency(balance)}</p>
          {monthly > 0 && <p className="text-xs text-gray-500">{formatCurrencyFull(monthly)}/mo</p>}
        </div>
        <div className="ml-2">
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Key Metrics */}
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
              <p className="text-sm font-medium text-gray-900 capitalize">{facility.repayment_frequency.replace('_', '-')}</p>
            </div>
          </div>

          {/* MCA sweep */}
          {facility.sweep_percentage && (
            <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
              <p className="text-xs font-medium text-orange-800">
                MCA Sweep: {facility.sweep_percentage}% of {facility.sweep_source ?? 'income'} payments
              </p>
              <p className="text-[10px] text-orange-600 mt-0.5">Variable repayment — no fixed monthly. Repaid when income is earned.</p>
            </div>
          )}

          {/* Director loan */}
          {facility.director_name && (
            <div className={cn('rounded-lg border p-3', facility.credit_impacting ? 'bg-orange-50 border-orange-200' : 'bg-purple-50 border-purple-100')}>
              <p className={cn('text-xs font-medium', facility.credit_impacting ? 'text-orange-800' : 'text-purple-800')}>
                Director: {facility.director_name}
                {facility.credit_impacting && ' — AFFECTS PERSONAL CREDIT'}
              </p>
              {facility.credit_impact_notes && (
                <p className="text-[10px] text-orange-700 mt-1">{facility.credit_impact_notes}</p>
              )}
              {facility.payment_day && (
                <p className={cn('text-[10px] mt-0.5', facility.credit_impacting ? 'text-orange-600' : 'text-purple-600')}>
                  DD on {facility.payment_day}th of month
                </p>
              )}
            </div>
          )}

          {/* Secured */}
          {facility.secured && facility.collateral_description && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
              <p className="text-xs font-medium text-blue-800 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> Secured: {facility.collateral_description}
              </p>
            </div>
          )}

          {/* Action required */}
          {facility.action_required && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs font-medium text-red-800 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Action Required
              </p>
              <p className="text-xs text-red-700 mt-0.5">{facility.action_required}</p>
            </div>
          )}

          {/* Missing info */}
          {hasMissingInfo && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-xs font-medium text-yellow-800 flex items-center gap-1 mb-1">
                <Info className="h-3.5 w-3.5" /> Information Needed
              </p>
              <ul className="space-y-0.5">
                {facility.missing_info!.map((item, i) => (
                  <li key={i} className="text-xs text-yellow-700 flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-yellow-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
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
              <FileText className="h-3.5 w-3.5" /> Statement access: {facility.statement_access}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Shared: Classification Group                                       */
/* ================================================================== */

function ClassificationGroup({
  classification,
  facilities,
  showCreditImpact,
}: {
  classification: DebtClassification;
  facilities: DebtFacility[];
  showCreditImpact?: boolean;
}) {
  if (facilities.length === 0) return null;
  const config = CLASSIFICATION_CONFIG[classification];
  const total = facilities.reduce((s, f) => s + Number(f.current_balance), 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('h-2.5 w-2.5 rounded-full', classification === 'good' ? 'bg-emerald-500' : classification === 'okay' ? 'bg-amber-400' : classification === 'bad' ? 'bg-red-500' : 'bg-gray-300')} />
        <h3 className="text-sm font-semibold text-gray-900">{config.label} Debt</h3>
        <span className="text-xs text-gray-500">{formatCurrency(total)} across {facilities.length} facilities</span>
      </div>
      <div className="space-y-2">
        {facilities.map((f) => (
          <FacilityCard key={f.id} facility={f} showCreditImpact={showCreditImpact} />
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Interest Breakdown                                                 */
/* ================================================================== */

const DRAFT_ACCOUNTS_INTEREST = 257_003; // £257K from draft accounts

interface InterestRow {
  name: string;
  facilityType: FacilityType;
  rate: number; // display rate (interest_rate or effective_apr)
  effectiveApr: number | null;
  annualInterest: number;
  balance: number;
}

const INTEREST_DONUT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

function computeInterestBreakdown(facilities: DebtFacility[]): InterestRow[] {
  return facilities
    .filter((f) => f.status === 'active' && f.current_balance > 0)
    .map((f) => {
      const balance = Number(f.current_balance);
      const effectiveApr = f.effective_apr != null ? Number(f.effective_apr) : null;
      const interestRate = Number(f.interest_rate) || 0;
      const fixedFee = Number(f.fixed_fee) || 0;
      const originalAmount = Number(f.original_amount) || 0;

      let annualInterest: number;
      if (f.facility_type === 'mca' && fixedFee > 0 && originalAmount > 0) {
        // MCA: use fixed_fee × original_amount (fee is stored as decimal, e.g. 0.25)
        annualInterest = fixedFee * originalAmount;
      } else if (effectiveApr != null && effectiveApr > 0) {
        annualInterest = effectiveApr * balance;
      } else if (interestRate > 0) {
        annualInterest = interestRate * balance;
      } else {
        annualInterest = 0;
      }

      return {
        name: f.facility_name || f.lender,
        facilityType: f.facility_type,
        rate: effectiveApr ?? interestRate,
        effectiveApr,
        annualInterest,
        balance,
      };
    })
    .filter((r) => r.annualInterest > 0)
    .sort((a, b) => b.annualInterest - a.annualInterest);
}

function aprColorClass(rate: number): string {
  if (rate > 0.50) return 'text-red-600 font-semibold';
  if (rate > 0.20) return 'text-amber-600 font-medium';
  return 'text-emerald-600';
}

function aprBadge(rate: number): { label: string; className: string } | null {
  if (rate > 0.50) return { label: 'HIGH', className: 'bg-red-100 text-red-700' };
  if (rate > 0.20) return { label: 'MEDIUM', className: 'bg-amber-100 text-amber-700' };
  return null;
}

function InterestBreakdownCard({ facilities }: { facilities: DebtFacility[] }) {
  const rows = useMemo(() => computeInterestBreakdown(facilities), [facilities]);
  const computedTotal = rows.reduce((s, r) => s + r.annualInterest, 0);
  const variance = computedTotal - DRAFT_ACCOUNTS_INTEREST;
  const variancePct = DRAFT_ACCOUNTS_INTEREST > 0 ? (variance / DRAFT_ACCOUNTS_INTEREST) * 100 : 0;

  const pieData = rows.map((r) => ({
    name: r.name,
    value: Math.round(r.annualInterest),
  }));

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Annual Interest Breakdown</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Estimated interest cost by facility (active facilities with balance &gt; 0)
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{formatCurrency(computedTotal)}</p>
          <p className="text-xs text-gray-500">computed annual interest</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Donut chart */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <PieChart width={240} height={220}>
            <Pie
              data={pieData}
              cx={120}
              cy={100}
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((_, i) => (
                <Cell key={`cell-${i}`} fill={INTEREST_DONUT_COLORS[i % INTEREST_DONUT_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => formatCurrency(Number(value))}
              contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
            />
          </PieChart>
          {/* Legend */}
          <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {pieData.slice(0, 6).map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: INTEREST_DONUT_COLORS[i % INTEREST_DONUT_COLORS.length] }}
                />
                <span className="text-[10px] text-gray-500 truncate max-w-[80px]">{entry.name}</span>
              </div>
            ))}
            {pieData.length > 6 && (
              <span className="text-[10px] text-gray-400">+{pieData.length - 6} more</span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-w-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Facility</th>
                <th className="pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Balance</th>
                <th className="pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Rate / APR</th>
                <th className="pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Est. Annual Interest</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const badge = aprBadge(row.rate);
                return (
                  <tr key={row.name} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: INTEREST_DONUT_COLORS[i % INTEREST_DONUT_COLORS.length] }}
                        />
                        <div>
                          <span className="font-medium text-gray-900">{row.name}</span>
                          <span className="ml-1.5 text-[10px] text-gray-400">
                            {FACILITY_TYPE_LABELS[row.facilityType] ?? row.facilityType}
                          </span>
                        </div>
                        {badge && (
                          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', badge.className)}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-right text-gray-700 tabular-nums">{formatCurrency(row.balance)}</td>
                    <td className={cn('py-2 text-right tabular-nums', aprColorClass(row.rate))}>
                      {row.rate > 0 ? formatRate(row.rate) : '--'}
                      {row.effectiveApr != null && row.effectiveApr !== row.rate && (
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({formatRate(Number(row.effectiveApr))} eff.)
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-900 tabular-nums">
                      {formatCurrency(row.annualInterest)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td className="pt-3 font-semibold text-gray-900" colSpan={3}>
                  Computed Total
                </td>
                <td className="pt-3 text-right font-bold text-gray-900 tabular-nums">
                  {formatCurrency(computedTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Variance vs draft accounts */}
      <div className={cn(
        'mt-4 rounded-lg p-3 flex items-center justify-between',
        Math.abs(variancePct) <= 5 ? 'bg-emerald-50 border border-emerald-200' :
        Math.abs(variancePct) <= 15 ? 'bg-amber-50 border border-amber-200' :
        'bg-red-50 border border-red-200'
      )}>
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-gray-500 shrink-0" />
          <div>
            <span className="text-xs font-medium text-gray-700">
              Draft Accounts Total: {formatCurrency(DRAFT_ACCOUNTS_INTEREST)}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              (BizCap £23K, Interest Expense £173K, Capital on Tap £11K, MaxCap £11K, Swift £10K, YouLend £14K, Iwoca £7K, GotCap £4K)
            </span>
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className={cn('text-sm font-semibold',
            Math.abs(variancePct) <= 5 ? 'text-emerald-700' :
            Math.abs(variancePct) <= 15 ? 'text-amber-700' : 'text-red-700'
          )}>
            {variance >= 0 ? '+' : ''}{formatCurrency(variance)} variance
          </p>
          <p className="text-[10px] text-gray-500">
            {Math.abs(variancePct).toFixed(1)}% {variance >= 0 ? 'over' : 'under'} draft accounts
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Overview Tab                                                       */
/* ================================================================== */

function OverviewTab({ summary, facilities }: { summary: DebtSummary; facilities: DebtFacility[] }) {
  const total = summary.good_total + summary.okay_total + summary.bad_total;
  const goodPct = total > 0 ? (summary.good_total / total) * 100 : 0;
  const okayPct = total > 0 ? (summary.okay_total / total) * 100 : 0;
  const badPct = total > 0 ? (summary.bad_total / total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards — split by category */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600">Financial Lenders</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(summary.lenders_total)}</p>
          <p className="mt-1 text-xs text-gray-500">{formatCurrency(summary.lenders_monthly)}/mo repayments</p>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50/30 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-purple-600">Director Loans</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(summary.director_loans_total)}</p>
          <p className="mt-1 text-xs text-gray-500">{formatCurrency(summary.director_loans_monthly)}/mo repayments</p>
          {summary.credit_impacting_count > 0 && (
            <p className="mt-1 text-xs text-orange-600 font-medium">
              ⚠ {formatCurrency(summary.credit_impacting_total)} credit-impacting
            </p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-600">Creditors</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(summary.creditors_total)}</p>
          <p className="mt-1 text-xs text-gray-500">{formatCurrency(summary.creditors_monthly)}/mo repayments</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600">Total Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(summary.total_outstanding)}</p>
          <p className="mt-1 text-xs text-gray-500">{formatCurrency(summary.total_monthly_repayment)}/mo total</p>
        </div>
      </div>

      {/* Alerts bar */}
      {(summary.facilities_missing_info > 0 || summary.facilities_action_required > 0) && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <div className="flex-1 text-sm text-yellow-800">
            {summary.facilities_action_required > 0 && (
              <span className="font-medium">{summary.facilities_action_required} facilities need action. </span>
            )}
            {summary.facilities_missing_info > 0 && (
              <span>{summary.facilities_missing_info} facilities have missing information/statements.</span>
            )}
          </div>
        </div>
      )}

      {/* DSCR + Rate + Maturity cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {/* Debt Service Coverage Ratio */}
        <div className={cn('rounded-xl border p-5',
          summary.dscr != null && summary.dscr < 1 ? 'border-red-200 bg-red-50/30' :
          summary.dscr != null && summary.dscr < 1.25 ? 'border-amber-200 bg-amber-50/30' :
          summary.dscr != null ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-white'
        )}>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">DSCR</p>
          <p className={cn('mt-1 text-2xl font-bold',
            summary.dscr == null ? 'text-gray-400' :
            summary.dscr < 1 ? 'text-red-600' :
            summary.dscr < 1.25 ? 'text-amber-600' : 'text-emerald-600'
          )}>
            {summary.dscr != null ? `${summary.dscr.toFixed(2)}x` : '--'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {summary.dscr == null ? 'Needs P&L data' :
             summary.dscr < 1 ? 'Cannot cover debt service' :
             summary.dscr < 1.25 ? 'Tight — limited headroom' :
             summary.dscr < 2 ? 'Adequate coverage' : 'Strong coverage'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Weighted Avg Rate</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatRate(summary.weighted_average_rate)}</p>
          <p className="mt-1 text-xs text-red-600 truncate">Highest: {summary.highest_rate_facility}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Next Maturity</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {summary.next_maturity ? formatDate(summary.next_maturity.date) : '--'}
          </p>
          <p className="mt-1 text-xs text-gray-500 truncate">{summary.next_maturity?.facility ?? 'None scheduled'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Annual Debt Cost</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(summary.total_annual_cost)}</p>
          <p className="mt-1 text-xs text-gray-500">All repayments × 12</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Active Facilities</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{summary.active_count}</p>
          <p className="mt-1 text-xs text-gray-500">of {summary.facility_count} total</p>
        </div>
      </div>

      {/* Health classification bar */}
      {total > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Debt Health Classification</h3>
            <p className="text-xs text-gray-500">{formatCurrency(total)} total</p>
          </div>
          <div className="flex h-4 overflow-hidden rounded-full">
            {goodPct > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${goodPct}%` }} />}
            {okayPct > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${okayPct}%` }} />}
            {badPct > 0 && <div className="bg-red-500 transition-all" style={{ width: `${badPct}%` }} />}
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /><span className="text-gray-600">Good {formatCurrency(summary.good_total)}</span></div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="text-gray-600">Okay {formatCurrency(summary.okay_total)}</span></div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /><span className="text-gray-600">Bad {formatCurrency(summary.bad_total)}</span></div>
          </div>
        </div>
      )}

      {/* Interest breakdown by facility */}
      <InterestBreakdownCard facilities={facilities} />

      {/* Payment timeline */}
      <PaymentTimeline facilities={facilities} />

      {/* Maturity schedule */}
      <MaturityTimeline facilities={facilities} />
    </div>
  );
}

/* ================================================================== */
/*  Lenders Tab                                                        */
/* ================================================================== */

function LendersTab({ facilities }: { facilities: DebtFacility[] }) {
  const lenders = facilities.filter((f) => f.category === 'lender');
  const groups = groupByClassification(lenders);
  const total = lenders.reduce((s, f) => s + Number(f.current_balance), 0);
  const monthly = lenders.reduce((s, f) => s + Number(f.monthly_repayment), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Financial Lenders</h3>
          <p className="text-sm text-gray-500">Business loans, MCAs, secured facilities, and credit lines</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{formatCurrency(total)}</p>
          <p className="text-xs text-gray-500">{formatCurrency(monthly)}/mo</p>
        </div>
      </div>

      {/* MCA Projections CTA */}
      {lenders.some((f) => f.facility_type === 'mca') && (
        <Link href="/debt/mca-projections" className="block">
          <div className="rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <Zap className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">MCA Projections</p>
              <p className="text-xs text-gray-600">View payoff scenarios for your merchant cash advances</p>
            </div>
            <ExternalLink className="h-4 w-4 text-orange-400 shrink-0" />
          </div>
        </Link>
      )}

      {Object.entries(groups).map(([cls, list]) => (
        <ClassificationGroup key={cls} classification={cls as DebtClassification} facilities={list} />
      ))}

      {lenders.length === 0 && <EmptySection label="No financial lender facilities recorded." />}
    </div>
  );
}

/* ================================================================== */
/*  Creditors Tab                                                      */
/* ================================================================== */

function CreditorsTab({ facilities }: { facilities: DebtFacility[] }) {
  const creditors = facilities.filter((f) => f.category === 'creditor');
  const total = creditors.reduce((s, f) => s + Number(f.current_balance), 0);
  const monthly = creditors.reduce((s, f) => s + Number(f.monthly_repayment), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Operational Creditors</h3>
          <p className="text-sm text-gray-500">Supplier payment plans and outstanding trade payables that need structured paydown</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{formatCurrency(total)}</p>
          <p className="text-xs text-gray-500">{formatCurrency(monthly)}/mo</p>
        </div>
      </div>

      {/* Cashflow link */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 flex items-center gap-3">
        <CircleDollarSign className="h-5 w-5 text-blue-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800">Creditor Paydown → Cashflow Impact</p>
          <p className="text-xs text-blue-600">These obligations flow into the cashflow forecast as committed outflows. Any changes to payment plans will update scenario models.</p>
        </div>
      </div>

      {creditors.map((f) => (
        <FacilityCard key={f.id} facility={f} />
      ))}

      {creditors.length === 0 && <EmptySection label="No creditor payment plans recorded." />}
    </div>
  );
}

/* ================================================================== */
/*  Director Loans Tab                                                 */
/* ================================================================== */

function DirectorsTab({ facilities }: { facilities: DebtFacility[] }) {
  const dlas = facilities.filter((f) => f.category === 'director_loan');
  const total = dlas.reduce((s, f) => s + Number(f.current_balance), 0);
  const monthly = dlas.reduce((s, f) => s + Number(f.monthly_repayment), 0);

  // Group by director
  const byDirector: Record<string, DebtFacility[]> = {};
  for (const f of dlas) {
    const name = f.director_name || 'Unknown';
    if (!byDirector[name]) byDirector[name] = [];
    byDirector[name].push(f);
  }

  // Gbemi first (credit-impacting), then alphabetical
  const directorOrder = Object.keys(byDirector).sort((a, b) => {
    const aImpact = byDirector[a].some((f) => f.credit_impacting);
    const bImpact = byDirector[b].some((f) => f.credit_impacting);
    if (aImpact && !bImpact) return -1;
    if (!aImpact && bImpact) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Director Loan Accounts</h3>
          <p className="text-sm text-gray-500">Personal loans from directors injected into the business</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{formatCurrency(total)}</p>
          <p className="text-xs text-gray-500">{formatCurrency(monthly)}/mo</p>
        </div>
      </div>

      {/* Credit impact warning */}
      {dlas.some((f) => f.credit_impacting) && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-800">Credit Impact on Refinance</p>
              <p className="text-xs text-orange-700 mt-1">
                Gbemi is CEO and majority shareholder. Her personal credit utilisation directly affects the company&apos;s ability to refinance.
                Lenders (Creative UK, Sigma, Capify) all assess director credit scores. Reducing or consolidating her personal loans
                improves the refinance case for the business.
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs text-orange-700">
                <span className="font-medium">
                  {dlas.filter((f) => f.credit_impacting).length} credit-impacting facilities
                </span>
                <span className="font-medium">
                  {formatCurrency(dlas.filter((f) => f.credit_impacting).reduce((s, f) => s + Number(f.current_balance), 0))} total exposure
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {directorOrder.map((directorName) => {
        const dirFacilities = byDirector[directorName];
        const dirTotal = dirFacilities.reduce((s, f) => s + Number(f.current_balance), 0);
        const dirMonthly = dirFacilities.reduce((s, f) => s + Number(f.monthly_repayment), 0);
        const isImpacting = dirFacilities.some((f) => f.credit_impacting);

        return (
          <div key={directorName} className={cn('rounded-xl border p-5', isImpacting ? 'border-orange-200 bg-orange-50/20' : 'border-gray-200 bg-white')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className={cn('h-4 w-4', isImpacting ? 'text-orange-600' : 'text-purple-600')} />
                <h4 className="text-sm font-semibold text-gray-900">{directorName}</h4>
                {isImpacting && (
                  <span className="px-2 py-0.5 text-[10px] font-medium uppercase bg-orange-100 text-orange-700 rounded-full">
                    Credit-Impacting
                  </span>
                )}
              </div>
              <div className="text-right text-xs">
                <span className="font-semibold text-gray-900">{formatCurrency(dirTotal)}</span>
                {dirMonthly > 0 && <span className="text-gray-500 ml-2">{formatCurrency(dirMonthly)}/mo</span>}
              </div>
            </div>
            <div className="space-y-2">
              {dirFacilities.map((f) => (
                <FacilityCard key={f.id} facility={f} showCreditImpact />
              ))}
            </div>
          </div>
        );
      })}

      {dlas.length === 0 && <EmptySection label="No director loan accounts recorded." />}
    </div>
  );
}

/* ================================================================== */
/*  Tax & Statutory Tab                                                */
/* ================================================================== */

function TaxStatutoryTab({
  facilities,
  taxLiabilities,
  vatQuarters,
  latestPeriod,
}: {
  facilities: DebtFacility[];
  taxLiabilities: TaxLiabilityFromBS[];
  vatQuarters: VATQuarter[];
  latestPeriod: string | null;
}) {
  const taxFacilities = facilities.filter((f) => f.category === 'tax_statutory');

  // Group balance sheet liabilities by type
  const payeTotal = taxLiabilities.filter((t) => t.type === 'paye').reduce((s, t) => s + t.balance, 0);
  const nicTotal = taxLiabilities.filter((t) => t.type === 'nic').reduce((s, t) => s + t.balance, 0);
  const vatTotal = taxLiabilities.filter((t) => t.type === 'vat').reduce((s, t) => s + t.balance, 0);
  const pensionTotal = taxLiabilities.filter((t) => t.type === 'pension').reduce((s, t) => s + t.balance, 0);
  const corpTaxTotal = taxLiabilities.filter((t) => t.type === 'corp_tax').reduce((s, t) => s + t.balance, 0);
  const otherTaxTotal = taxLiabilities.filter((t) => t.type === 'other_tax').reduce((s, t) => s + t.balance, 0);
  const totalStatutory = payeTotal + nicTotal + vatTotal + pensionTotal + corpTaxTotal + otherTaxTotal;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Tax & Statutory Obligations</h3>
        <p className="text-sm text-gray-500">PAYE, VAT, NIC, pension, and corporation tax liabilities from balance sheet</p>
      </div>

      {/* Balance sheet liabilities */}
      {taxLiabilities.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">Balance Sheet Tax Liabilities</h4>
            <span className="text-xs text-gray-500">
              As at {latestPeriod ? new Date(latestPeriod).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '--'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'PAYE', amount: payeTotal, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'NIC', amount: nicTotal, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'VAT', amount: vatTotal, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Pension', amount: pensionTotal, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Corp Tax', amount: corpTaxTotal, color: 'text-gray-700', bg: 'bg-gray-50' },
              { label: 'Other Tax', amount: otherTaxTotal, color: 'text-gray-600', bg: 'bg-gray-50' },
            ].filter((t) => t.amount > 0).map((t) => (
              <div key={t.label} className={cn('rounded-lg p-3', t.bg)}>
                <p className={cn('text-[10px] uppercase font-medium tracking-wider', t.color)}>{t.label}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(t.amount)}</p>
              </div>
            ))}
          </div>

          {totalStatutory > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
              <span className="font-semibold text-gray-900">Total Statutory Liabilities</span>
              <span className="font-bold text-gray-900">{formatCurrency(totalStatutory)}</span>
            </div>
          )}

          {/* Individual accounts */}
          <div className="mt-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Account Breakdown</p>
            {taxLiabilities.map((t) => (
              <div key={t.account_id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-400 w-12">{t.account_code}</span>
                  <span className="text-gray-700">{t.account_name}</span>
                  <span className={cn(
                    'px-1.5 py-0.5 text-[9px] uppercase rounded-full font-medium',
                    t.type === 'paye' ? 'bg-red-100 text-red-700' :
                    t.type === 'vat' ? 'bg-blue-100 text-blue-700' :
                    t.type === 'nic' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  )}>{t.type}</span>
                </div>
                <span className="font-medium text-gray-900">{formatCurrency(t.balance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {taxLiabilities.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">No Tax Liabilities Found in Balance Sheet</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Connect Xero and sync your data to pull PAYE, VAT, and NIC balances automatically.
                These are extracted from your trial balance liability accounts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PAYE section */}
      <div className="rounded-xl border border-red-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-red-600" />
            <h4 className="text-sm font-semibold text-gray-900">PAYE & Employer NI</h4>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-medium uppercase bg-red-100 text-red-700 rounded-full">
            Overdue — Plan Needed
          </span>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 mb-3">
          <p className="text-xs text-red-800">
            <strong>Action Required:</strong> PAYE is overdue. Need to contact HMRC to agree a new Time to Pay (TTP) arrangement.
            Failure to agree a plan risks penalties, interest charges, and potential distraint proceedings.
          </p>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-600">Balance Sheet PAYE Liability</span>
            <span className="font-medium text-gray-900">{payeTotal > 0 ? formatCurrency(payeTotal) : 'Confirm with HMRC'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-600">Balance Sheet NIC Liability</span>
            <span className="font-medium text-gray-900">{nicTotal > 0 ? formatCurrency(nicTotal) : 'Confirm with HMRC'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-600">Current Payment Plan</span>
            <span className="font-medium text-red-600">None — needs negotiation</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Suggested Next Step</span>
            <span className="font-medium text-gray-900">Call HMRC TTP line to agree instalments</span>
          </div>
        </div>
      </div>

      {/* VAT section */}
      <div className="rounded-xl border border-blue-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <CircleDollarSign className="h-4 w-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-gray-900">VAT Quarterly Position</h4>
        </div>

        {vatTotal > 0 && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 mb-4">
            <p className="text-xs text-blue-800">
              <strong>Current BS Liability:</strong> {formatCurrency(vatTotal)} VAT showing on balance sheet.
              {vatTotal < 0 ? ' This appears to be a refund position — check if claimed.' : ' Confirm if this is filed and paid or outstanding.'}
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500 mb-3">
          Quarterly VAT estimates based on revenue and purchases. Positive = owe HMRC, Negative = refund expected.
        </p>

        {/* VAT quarters from DB */}
        {vatQuarters.length > 0 ? (
          <div className="space-y-2">
            {vatQuarters.map((q) => (
              <div key={q.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{q.quarter_label}</p>
                  <p className="text-[10px] text-gray-500">{formatDate(q.period_start)} – {formatDate(q.period_end)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={cn('text-sm font-bold', q.net_vat >= 0 ? 'text-red-600' : 'text-emerald-600')}>
                      {q.net_vat >= 0 ? '' : '−'}{formatCurrency(Math.abs(q.net_vat))}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {q.net_vat >= 0 ? 'Owe HMRC' : 'Refund expected'}
                    </p>
                  </div>
                  <span className={cn(
                    'px-2 py-0.5 text-[10px] rounded-full font-medium',
                    q.status === 'paid' || q.status === 'refund_received' ? 'bg-emerald-100 text-emerald-700' :
                    q.status === 'overdue' ? 'bg-red-100 text-red-700' :
                    q.status === 'filed' || q.status === 'refund_pending' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {q.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
            <Clock className="h-6 w-6 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No VAT quarters tracked yet. VAT estimates will be calculated from Xero revenue and purchase data once available.</p>
          </div>
        )}
      </div>

      {/* Pension */}
      {pensionTotal > 0 && (
        <div className="rounded-xl border border-purple-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-purple-600" />
            <h4 className="text-sm font-semibold text-gray-900">Pension Obligations</h4>
          </div>
          <p className="text-xs text-gray-600">Auto-enrolment employer pension contributions outstanding.</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(pensionTotal)}</p>
        </div>
      )}

      {/* Tax facilities (if any manually added) */}
      {taxFacilities.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Tax Payment Plans</h4>
          {taxFacilities.map((f) => (
            <FacilityCard key={f.id} facility={f} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Payment Timeline                                                   */
/* ================================================================== */

function PaymentTimeline({ facilities }: { facilities: DebtFacility[] }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = 2026;

  const monthlyData = months.map((month, idx) => {
    let total = 0;
    const breakdown: { name: string; amount: number; classification: DebtClassification }[] = [];

    for (const f of facilities) {
      if (f.status !== 'active') continue;
      const monthly = Number(f.monthly_repayment);
      if (monthly <= 0) continue;

      const start = f.start_date ? new Date(f.start_date) : new Date('2020-01-01');
      const end = f.maturity_date ? new Date(f.maturity_date) : new Date('2030-12-31');
      const monthDate = new Date(`${year}-${String(idx + 1).padStart(2, '0')}-15`);

      if (monthDate >= start && monthDate <= end) {
        total += monthly;
        breakdown.push({ name: f.facility_name, amount: monthly, classification: f.classification });
      }
    }

    return { month, total, breakdown };
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
                <div className={cn('w-full rounded-t-md transition-all', isPast ? 'bg-gray-300' : 'bg-blue-500 group-hover:bg-blue-600')}
                  style={{ height: `${Math.max(heightPct, 2)}%` }} />
              </div>
              <span className="text-[10px] text-gray-500 font-medium">{m.month}</span>
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-900 text-white rounded-lg p-3 text-xs min-w-48 shadow-lg">
                  <p className="font-semibold mb-1">{m.month} {year}: {formatCurrency(m.total)}</p>
                  {m.breakdown.slice(0, 5).map((b, i) => (
                    <div key={i} className="flex justify-between gap-3 text-gray-300">
                      <span className="truncate">{b.name}</span>
                      <span className="shrink-0">{formatCurrency(b.amount)}</span>
                    </div>
                  ))}
                  {m.breakdown.length > 5 && <p className="text-gray-400 mt-1">+{m.breakdown.length - 5} more</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Maturity Timeline                                                  */
/* ================================================================== */

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
          const daysLeft = Math.ceil((new Date(f.maturity_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          const isUrgent = daysLeft < 60;
          const isSoon = daysLeft < 180;

          return (
            <div key={f.id} className={cn('flex items-center gap-3 rounded-lg border p-3',
              isUrgent ? 'border-red-200 bg-red-50' : isSoon ? 'border-amber-200 bg-amber-50' : 'border-gray-100')}>
              <Calendar className={cn('h-4 w-4 shrink-0', isUrgent ? 'text-red-600' : isSoon ? 'text-amber-600' : 'text-gray-400')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{f.facility_name}</p>
                <p className="text-xs text-gray-500">{formatDate(f.maturity_date)} · {formatCurrency(Number(f.current_balance))}</p>
              </div>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                isUrgent ? 'bg-red-100 text-red-700' : isSoon ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600')}>
                {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Refinance Tab                                                      */
/* ================================================================== */

/* RefinanceTab — now uses the interactive RefinanceModeller component */

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function groupByClassification(facilities: DebtFacility[]): Record<DebtClassification, DebtFacility[]> {
  const groups: Record<DebtClassification, DebtFacility[]> = { bad: [], okay: [], good: [], unclassified: [] };
  for (const f of facilities) groups[f.classification].push(f);
  return groups;
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

/* ================================================================== */
/*  Empty State                                                        */
/* ================================================================== */

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
      </p>
      <button
        onClick={handleSeed}
        disabled={seeding || seeded}
        className={cn(
          'mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-colors',
          seeded ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-900 text-white hover:bg-gray-800',
        )}
      >
        {seeding ? (<><Loader2 className="h-4 w-4 animate-spin" /> Seeding...</>) :
         seeded ? (<><CheckCircle2 className="h-4 w-4" /> Seeded! Refreshing...</>) :
         (<><RefreshCw className="h-4 w-4" /> Load Alonuko Debt Data</>)}
      </button>
    </div>
  );
}

/* ================================================================== */
/*  Export Columns                                                     */
/* ================================================================== */

const DEBT_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Facility Name', key: 'facility_name', format: 'text' },
  { header: 'Lender', key: 'lender', format: 'text' },
  { header: 'Type', key: 'facility_type', format: 'text' },
  { header: 'Category', key: 'category', format: 'text' },
  { header: 'Classification', key: 'classification', format: 'text' },
  { header: 'Status', key: 'status', format: 'text' },
  { header: 'Original Amount', key: 'original_amount', format: 'currency' },
  { header: 'Current Balance', key: 'current_balance', format: 'currency' },
  { header: 'Monthly Repayment', key: 'monthly_repayment', format: 'currency' },
  { header: 'Interest / APR', key: 'interest_rate', format: 'percentage' },
  { header: 'Start Date', key: 'start_date', format: 'date' },
  { header: 'Maturity Date', key: 'maturity_date', format: 'date' },
  { header: 'Repayment Frequency', key: 'repayment_frequency', format: 'text' },
  { header: 'Secured', key: 'secured', format: 'text' },
  { header: 'Has Debenture', key: 'has_debenture', format: 'text' },
  { header: 'Refinance Eligible', key: 'refinance_eligible', format: 'text' },
];

/* ================================================================== */
/*  Main Client                                                        */
/* ================================================================== */

export function DebtClient({ facilities, summary, hasData, orgId, taxLiabilities, vatQuarters, latestPeriod }: DebtClientProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');

  const lenderCount = facilities.filter((f) => f.category === 'lender').length;
  const creditorCount = facilities.filter((f) => f.category === 'creditor').length;
  const dlaCount = facilities.filter((f) => f.category === 'director_loan').length;

  if (!hasData) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Debt Command Centre</h1>
            <p className="mt-1 text-sm text-gray-500">Full visibility across all business debt, director loans, and creditor arrangements</p>
          </div>
          <ExportButton
            data={[]}
            columns={DEBT_EXPORT_COLUMNS}
            filename="debt-facilities"
            title="Debt Command Centre"
            disabled
          />
        </div>
        <EmptyState orgId={orgId} />
      </div>
    );
  }

  const tabs: { id: ViewTab; label: string; badge?: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'lenders', label: `Lenders (${lenderCount})` },
    { id: 'creditors', label: `Creditors (${creditorCount})` },
    { id: 'directors', label: `Directors (${dlaCount})`, badge: summary.credit_impacting_count > 0 ? '⚠' : undefined },
    { id: 'tax', label: 'Tax & Statutory' },
    { id: 'refinance', label: 'Refinance' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debt Command Centre</h1>
          <p className="mt-1 text-sm text-gray-500">Full visibility across all business debt, director loans, and creditor arrangements</p>
        </div>
        <ExportButton
          data={facilities.map((f) => ({
            facility_name: f.facility_name,
            lender: f.lender,
            facility_type: FACILITY_TYPE_LABELS[f.facility_type],
            category: f.category,
            classification: f.classification,
            status: f.status,
            original_amount: Number(f.original_amount),
            current_balance: Number(f.current_balance),
            monthly_repayment: Number(f.monthly_repayment),
            interest_rate: Number(f.effective_apr ?? f.interest_rate ?? 0),
            start_date: f.start_date ?? '',
            maturity_date: f.maturity_date ?? '',
            repayment_frequency: f.repayment_frequency,
            secured: f.secured ? 'Yes' : 'No',
            has_debenture: f.has_debenture ? 'Yes' : 'No',
            refinance_eligible: f.refinance_eligible ? 'Yes' : 'No',
          }))}
          columns={DEBT_EXPORT_COLUMNS}
          filename="debt-facilities"
          title="Debt Command Centre"
        />
      </div>

      <NumberLegend />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-4 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
              {tab.badge && <span className="ml-1">{tab.badge}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab summary={summary} facilities={facilities} />}
      {activeTab === 'lenders' && <LendersTab facilities={facilities} />}
      {activeTab === 'creditors' && <CreditorsTab facilities={facilities} />}
      {activeTab === 'directors' && <DirectorsTab facilities={facilities} />}
      {activeTab === 'tax' && (
        <TaxStatutoryTab
          facilities={facilities}
          taxLiabilities={taxLiabilities}
          vatQuarters={vatQuarters}
          latestPeriod={latestPeriod}
        />
      )}
      {activeTab === 'refinance' && <RefinanceModeller facilities={facilities} />}
    </div>
  );
}
