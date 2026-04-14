'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Calculator,
  TrendingDown,
  ArrowDownRight,
  ArrowRight,
  DollarSign,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  PiggyBank,
  Target,
  BarChart3,
  Banknote,
} from 'lucide-react';
import type { DebtFacility, RefinanceAction } from '@/types/debt';
import {
  computeRefinanceScenario,
  calculateMonthlyPayment,
  type FacilitySnapshot,
  type NewFundingSource,
  type RefinanceScenarioResult,
} from '@/lib/financial/refinance-calculator';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RefinanceModellerProps {
  facilities: DebtFacility[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

const ACTION_LABELS: Record<RefinanceAction['action'], string> = {
  keep: 'Keep',
  pay_off: 'Pay Off',
  refinance: 'Refinance',
  consolidate: 'Consolidate',
};

const ACTION_COLORS: Record<RefinanceAction['action'], string> = {
  keep: 'bg-gray-100 text-gray-700 border-gray-200',
  pay_off: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  refinance: 'bg-blue-50 text-blue-700 border-blue-200',
  consolidate: 'bg-purple-50 text-purple-700 border-purple-200',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RefinanceModeller({ facilities }: RefinanceModellerProps) {
  // Only active lender/creditor facilities (not tax or already paid off)
  const activeFacilities = useMemo(() =>
    facilities.filter((f) =>
      f.status === 'active' &&
      f.current_balance > 0 &&
      f.category !== 'tax_statutory'
    ),
    [facilities]
  );

  // State: per-facility actions
  const [actions, setActions] = useState<Map<string, RefinanceAction>>(() => {
    const map = new Map<string, RefinanceAction>();
    for (const f of activeFacilities) {
      map.set(f.id, {
        facility_id: f.id,
        facility_name: f.facility_name,
        action: 'keep',
        current_balance: Number(f.current_balance),
        current_monthly: Number(f.monthly_repayment),
      });
    }
    return map;
  });

  // State: new funding source
  const [showFunding, setShowFunding] = useState(true);
  const [fundingSource, setFundingSource] = useState<NewFundingSource>({
    name: 'Creative UK',
    amount: 500000,
    annual_rate: 0.08,
    term_months: 60,
    setup_fee: 5000,
  });

  // State: expanded facilities
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Update action for a facility
  const updateAction = useCallback((facilityId: string, updates: Partial<RefinanceAction>) => {
    setActions((prev) => {
      const next = new Map(prev);
      const existing = next.get(facilityId);
      if (existing) {
        next.set(facilityId, { ...existing, ...updates });
      }
      return next;
    });
  }, []);

  // Build scenario input and compute
  const result: RefinanceScenarioResult = useMemo(() => {
    const snapshots: FacilitySnapshot[] = activeFacilities.map((f) => ({
      id: f.id,
      facility_name: f.facility_name,
      lender: f.lender,
      category: f.category,
      classification: f.classification,
      current_balance: Number(f.current_balance),
      monthly_repayment: Number(f.monthly_repayment),
      interest_rate: Number(f.effective_apr ?? f.interest_rate ?? 0),
      effective_apr: f.effective_apr != null ? Number(f.effective_apr) : null,
      remaining_months: f.maturity_date
        ? Math.max(0, Math.ceil((new Date(f.maturity_date).getTime() - Date.now()) / (30.44 * 24 * 60 * 60 * 1000)))
        : null,
      facility_type: f.facility_type,
      refinance_eligible: f.refinance_eligible,
    }));

    return computeRefinanceScenario({
      facilities: snapshots,
      actions: Array.from(actions.values()),
      funding_source: showFunding ? fundingSource : null,
    });
  }, [activeFacilities, actions, showFunding, fundingSource]);

  // Quick actions
  const clearAllBad = useCallback(() => {
    setActions((prev) => {
      const next = new Map(prev);
      for (const f of activeFacilities) {
        if (f.classification === 'bad') {
          const existing = next.get(f.id);
          if (existing) {
            next.set(f.id, { ...existing, action: 'consolidate' });
          }
        }
      }
      return next;
    });
  }, [activeFacilities]);

  const resetAll = useCallback(() => {
    setActions((prev) => {
      const next = new Map(prev);
      for (const [id, action] of next) {
        next.set(id, { ...action, action: 'keep' });
      }
      return next;
    });
  }, []);

  // How much is being allocated to payoffs/consolidations
  const totalAllocated = useMemo(() => {
    let total = 0;
    for (const action of actions.values()) {
      if (action.action === 'pay_off' || action.action === 'consolidate') {
        total += action.current_balance;
      }
    }
    return total;
  }, [actions]);

  const fundingRemaining = showFunding
    ? fundingSource.amount - totalAllocated
    : -totalAllocated;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Refinance Scenario Modeller</h3>
          <p className="text-sm text-muted-foreground">
            Select actions for each facility to model the impact on monthly costs and total debt
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearAllBad}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors dark:border-red-800 dark:bg-red-950/20 dark:text-red-400"
          >
            <XCircle className="h-3.5 w-3.5" />
            Consolidate all bad debt
          </button>
          <button
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* New Funding Source */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">New Funding Source</h4>
          </div>
          <label className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
            <input
              type="checkbox"
              checked={showFunding}
              onChange={(e) => setShowFunding(e.target.checked)}
              className="rounded border-blue-300"
            />
            Include new loan
          </label>
        </div>

        {showFunding && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Lender</label>
              <input
                type="text"
                value={fundingSource.name}
                onChange={(e) => setFundingSource((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-md border border-blue-200 bg-white dark:bg-blue-950/30 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Amount</label>
              <input
                type="number"
                value={fundingSource.amount}
                onChange={(e) => setFundingSource((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                className="w-full rounded-md border border-blue-200 bg-white dark:bg-blue-950/30 px-2 py-1.5 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Rate (APR %)</label>
              <input
                type="number"
                step="0.1"
                value={(fundingSource.annual_rate * 100).toFixed(1)}
                onChange={(e) => setFundingSource((prev) => ({ ...prev, annual_rate: Number(e.target.value) / 100 }))}
                className="w-full rounded-md border border-blue-200 bg-white dark:bg-blue-950/30 px-2 py-1.5 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Term (months)</label>
              <input
                type="number"
                value={fundingSource.term_months}
                onChange={(e) => setFundingSource((prev) => ({ ...prev, term_months: Number(e.target.value) }))}
                className="w-full rounded-md border border-blue-200 bg-white dark:bg-blue-950/30 px-2 py-1.5 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Setup Fee</label>
              <input
                type="number"
                value={fundingSource.setup_fee}
                onChange={(e) => setFundingSource((prev) => ({ ...prev, setup_fee: Number(e.target.value) }))}
                className="w-full rounded-md border border-blue-200 bg-white dark:bg-blue-950/30 px-2 py-1.5 text-sm tabular-nums"
              />
            </div>
          </div>
        )}

        {showFunding && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-white dark:bg-blue-950/30 p-3 text-center border border-blue-100 dark:border-blue-800">
              <p className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400">Funding</p>
              <p className="text-lg font-bold text-blue-800 dark:text-blue-200">{formatCurrency(fundingSource.amount)}</p>
            </div>
            <div className="rounded-lg bg-white dark:bg-blue-950/30 p-3 text-center border border-blue-100 dark:border-blue-800">
              <p className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400">Monthly Payment</p>
              <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                {formatCurrency(
                  calculateMonthlyPayment(fundingSource.amount, fundingSource.annual_rate, fundingSource.term_months)
                )}
              </p>
            </div>
            <div className={cn(
              'rounded-lg p-3 text-center border',
              fundingRemaining >= 0
                ? 'bg-white dark:bg-blue-950/30 border-blue-100 dark:border-blue-800'
                : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
            )}>
              <p className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {fundingRemaining >= 0 ? 'Remaining for Investment' : 'Shortfall'}
              </p>
              <p className={cn(
                'text-lg font-bold',
                fundingRemaining >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-red-700 dark:text-red-400'
              )}>
                {formatCurrency(Math.abs(fundingRemaining))}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Facility Actions */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3 bg-muted/30">
          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
            <div className="col-span-3">Facility</div>
            <div className="col-span-1 text-right">Balance</div>
            <div className="col-span-1 text-right">Monthly</div>
            <div className="col-span-1 text-right">Rate</div>
            <div className="col-span-4 text-center">Action</div>
            <div className="col-span-1 text-right">New Monthly</div>
            <div className="col-span-1 text-right">Saving</div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {activeFacilities.map((facility) => {
            const action = actions.get(facility.id);
            const outcome = result.outcomes.find((o) => o.facility_id === facility.id);
            if (!action || !outcome) return null;

            const isExpanded = expandedId === facility.id;
            const rate = Number(facility.effective_apr ?? facility.interest_rate ?? 0);

            return (
              <div key={facility.id}>
                <div
                  className="grid grid-cols-12 gap-2 items-center px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : facility.id)}
                >
                  {/* Name */}
                  <div className="col-span-3 flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{facility.facility_name}</p>
                      <p className="text-[11px] text-muted-foreground">{facility.lender}</p>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="col-span-1 text-right text-sm tabular-nums font-medium">
                    {formatCurrency(Number(facility.current_balance))}
                  </div>

                  {/* Monthly */}
                  <div className="col-span-1 text-right text-sm tabular-nums">
                    {formatCurrency(Number(facility.monthly_repayment))}
                  </div>

                  {/* Rate */}
                  <div className="col-span-1 text-right text-sm tabular-nums">
                    {rate > 0 ? formatRate(rate) : '--'}
                  </div>

                  {/* Action buttons */}
                  <div className="col-span-4 flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {(['keep', 'pay_off', 'consolidate'] as const).map((actionType) => (
                      <button
                        key={actionType}
                        onClick={() => updateAction(facility.id, { action: actionType })}
                        className={cn(
                          'px-2 py-1 rounded text-[10px] font-medium border transition-colors',
                          action.action === actionType
                            ? ACTION_COLORS[actionType]
                            : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/50'
                        )}
                      >
                        {ACTION_LABELS[actionType]}
                      </button>
                    ))}
                  </div>

                  {/* New Monthly */}
                  <div className="col-span-1 text-right text-sm tabular-nums">
                    {action.action === 'keep'
                      ? formatCurrency(outcome.new_monthly)
                      : <span className="text-emerald-600 font-medium">{formatCurrency(outcome.new_monthly)}</span>}
                  </div>

                  {/* Saving */}
                  <div className="col-span-1 text-right text-sm tabular-nums">
                    {outcome.monthly_saving > 0 ? (
                      <span className="text-emerald-600 font-medium">
                        {formatCurrency(outcome.monthly_saving)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && action.action === 'refinance' && (
                  <div className="px-5 py-3 bg-blue-50/50 dark:bg-blue-950/10 border-t border-blue-100 dark:border-blue-900" onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">New Terms</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-blue-600 dark:text-blue-400 mb-0.5">New Amount</label>
                        <input
                          type="number"
                          value={action.new_amount ?? facility.current_balance}
                          onChange={(e) => updateAction(facility.id, { new_amount: Number(e.target.value) })}
                          className="w-full rounded border border-blue-200 px-2 py-1 text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-blue-600 dark:text-blue-400 mb-0.5">New Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={((action.new_rate ?? rate) * 100).toFixed(1)}
                          onChange={(e) => updateAction(facility.id, { new_rate: Number(e.target.value) / 100 })}
                          className="w-full rounded border border-blue-200 px-2 py-1 text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-blue-600 dark:text-blue-400 mb-0.5">New Term (months)</label>
                        <input
                          type="number"
                          value={action.new_term_months ?? 60}
                          onChange={(e) => updateAction(facility.id, { new_term_months: Number(e.target.value) })}
                          className="w-full rounded border border-blue-200 px-2 py-1 text-sm tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Results Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Before / After comparison */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Current State
          </h4>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Debt</p>
              <p className="text-xl font-bold">{formatCurrency(result.total_current_debt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly Cost</p>
              <p className="text-lg font-bold">{formatCurrency(result.total_current_monthly)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Annual Cost</p>
              <p className="text-lg font-bold">{formatCurrency(result.total_current_annual)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20 p-5">
          <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">
            After Refinance
          </h4>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Total Debt</p>
              <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
                {formatCurrency(result.total_post_debt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Monthly Cost</p>
              <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                {formatCurrency(result.total_post_monthly)}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Annual Cost</p>
              <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                {formatCurrency(result.total_post_annual)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20 p-5">
          <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-3">
            Savings
          </h4>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-purple-600 dark:text-purple-400">Monthly Saving</p>
              <p className={cn(
                'text-xl font-bold',
                result.monthly_saving > 0
                  ? 'text-purple-800 dark:text-purple-200'
                  : 'text-red-600'
              )}>
                {result.monthly_saving > 0 ? '' : '-'}
                {formatCurrency(Math.abs(result.monthly_saving))}
              </p>
            </div>
            <div>
              <p className="text-xs text-purple-600 dark:text-purple-400">Annual Saving</p>
              <p className={cn(
                'text-lg font-bold',
                result.annual_saving > 0
                  ? 'text-purple-800 dark:text-purple-200'
                  : 'text-red-600'
              )}>
                {result.annual_saving > 0 ? '' : '-'}
                {formatCurrency(Math.abs(result.annual_saving))}
              </p>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-400">Facilities Cleared</p>
                <p className="text-lg font-bold text-purple-800 dark:text-purple-200">{result.facilities_cleared}</p>
              </div>
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-400">Breakeven</p>
                <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                  {result.breakeven_months != null
                    ? result.breakeven_months === 0 ? 'Immediate' : `${result.breakeven_months} mo`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 12-Month Debt Trajectory Chart */}
      {result.monthly_projection.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <h4 className="text-sm font-semibold">12-Month Debt Trajectory</h4>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.monthly_projection} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  tickFormatter={(v) => `£${Math.round(v / 1000)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="current_total"
                  name="Current Path"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="refinanced_total"
                  name="After Refinance"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Allocation Summary */}
      {result.outcomes.some((o) => o.action !== 'keep') && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-purple-500" />
            <h4 className="text-sm font-semibold">Allocation Summary</h4>
          </div>

          <div className="space-y-2">
            {result.outcomes
              .filter((o) => o.action !== 'keep')
              .sort((a, b) => b.current_balance - a.current_balance)
              .map((outcome) => (
                <div
                  key={outcome.facility_id}
                  className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium border',
                      ACTION_COLORS[outcome.action]
                    )}>
                      {ACTION_LABELS[outcome.action]}
                    </span>
                    <span className="font-medium">{outcome.facility_name}</span>
                  </div>
                  <div className="flex items-center gap-4 tabular-nums">
                    <span className="text-muted-foreground line-through">
                      {formatCurrency(outcome.current_balance)}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(outcome.new_balance)}
                    </span>
                    {outcome.monthly_saving > 0 && (
                      <span className="text-xs text-emerald-600">
                        saves {formatCurrency(outcome.monthly_saving)}/mo
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* Totals */}
          <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm font-semibold">
            <span>Total Debt Cleared</span>
            <span className="text-emerald-600">{formatCurrency(result.total_cleared)}</span>
          </div>
        </div>
      )}

      {/* Context note */}
      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800 p-4">
        <p className="text-xs text-amber-800 dark:text-amber-300">
          <strong>Note:</strong> This is a modelling tool. Actual refinancing terms depend on lender approval,
          creditworthiness, and DSCR requirements (typically 1.5x). Monthly payment calculations assume
          standard amortising repayment. MCA facilities with sweep-based repayment may vary with revenue.
        </p>
      </div>
    </div>
  );
}
