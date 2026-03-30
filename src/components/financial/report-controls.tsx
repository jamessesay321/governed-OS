'use client';

import { useState, useCallback } from 'react';
import { Download, Filter, ChevronDown, Calendar, BarChart3, Table2 } from 'lucide-react';
import { useCurrency } from '@/components/providers/currency-context';

// ─── Types ───────────────────────────────────────────────────────────
export type PeriodMode = 'monthly' | 'quarterly' | 'annual';
export type ComparisonMode = 'none' | 'prior_period' | 'prior_year' | 'budget';
export type ViewMode = 'summary' | 'detailed';

export interface ReportControlsState {
  periodMode: PeriodMode;
  selectedPeriods: string[];   // filtered period list
  comparisonMode: ComparisonMode;
  accountFilter: string | null; // null = all, or specific class like 'REVENUE'
  viewMode: ViewMode;
  searchQuery: string;
}

export interface ReportControlsProps {
  /** All available periods from the data (YYYY-MM-01 format) */
  availablePeriods: string[];
  /** Available account classes for filtering */
  availableClasses?: string[];
  /** Whether to show comparison controls */
  showComparison?: boolean;
  /** Whether to show account class filter */
  showAccountFilter?: boolean;
  /** Whether to show view mode toggle */
  showViewMode?: boolean;
  /** Whether to show search */
  showSearch?: boolean;
  /** Whether budget data exists (enables budget comparison) */
  hasBudget?: boolean;
  /** Callback when controls change */
  onChange: (state: ReportControlsState) => void;
  /** Current state */
  state: ReportControlsState;
  /** Page title for export filename */
  exportTitle?: string;
  /** Raw data for CSV export */
  exportData?: Record<string, unknown>[];
}

// ─── Helpers ─────────────────────────────────────────────────────────
function formatPeriodShort(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function getQuarter(period: string): string {
  const month = new Date(period).getMonth();
  const year = new Date(period).getFullYear();
  const q = Math.floor(month / 3) + 1;
  return `Q${q} ${year}`;
}

function getYear(period: string): string {
  return new Date(period).getFullYear().toString();
}

function groupPeriods(periods: string[], mode: PeriodMode): string[][] {
  if (mode === 'monthly') return periods.map((p) => [p]);

  const groups = new Map<string, string[]>();
  for (const p of periods) {
    const key = mode === 'quarterly' ? getQuarter(p) : getYear(p);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return Array.from(groups.values());
}

// ─── CSV Export ──────────────────────────────────────────────────────
function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      const str = String(val ?? '');
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Default State ───────────────────────────────────────────────────
export function getDefaultReportState(availablePeriods: string[]): ReportControlsState {
  return {
    periodMode: 'monthly',
    selectedPeriods: availablePeriods,
    comparisonMode: 'none',
    accountFilter: null,
    viewMode: 'summary',
    searchQuery: '',
  };
}

// ─── Component ───────────────────────────────────────────────────────
export function ReportControls({
  availablePeriods,
  availableClasses,
  showComparison = true,
  showAccountFilter = false,
  showViewMode = true,
  showSearch = false,
  hasBudget = false,
  onChange,
  state,
  exportTitle = 'report',
  exportData,
}: ReportControlsProps) {
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);

  const sortedPeriods = [...availablePeriods].sort();

  const handlePeriodMode = useCallback((mode: PeriodMode) => {
    onChange({ ...state, periodMode: mode, selectedPeriods: availablePeriods });
  }, [state, onChange, availablePeriods]);

  const handleComparison = useCallback((mode: ComparisonMode) => {
    onChange({ ...state, comparisonMode: mode });
  }, [state, onChange]);

  const handleAccountFilter = useCallback((cls: string | null) => {
    onChange({ ...state, accountFilter: cls });
  }, [state, onChange]);

  const handleViewMode = useCallback((mode: ViewMode) => {
    onChange({ ...state, viewMode: mode });
  }, [state, onChange]);

  const handleSearch = useCallback((query: string) => {
    onChange({ ...state, searchQuery: query });
  }, [state, onChange]);

  const handlePeriodToggle = useCallback((period: string) => {
    const current = new Set(state.selectedPeriods);
    if (current.has(period)) {
      current.delete(period);
    } else {
      current.add(period);
    }
    onChange({ ...state, selectedPeriods: Array.from(current) });
  }, [state, onChange]);

  const handleSelectAll = useCallback(() => {
    onChange({ ...state, selectedPeriods: availablePeriods });
  }, [state, onChange, availablePeriods]);

  const handleSelectLast = useCallback((n: number) => {
    const sorted = [...availablePeriods].sort().reverse();
    onChange({ ...state, selectedPeriods: sorted.slice(0, n) });
  }, [state, onChange, availablePeriods]);

  // Period range label
  const selectedSorted = [...state.selectedPeriods].sort();
  const periodLabel = selectedSorted.length === availablePeriods.length
    ? state.periodMode === 'monthly'
      ? `All ${availablePeriods.length} months`
      : state.periodMode === 'quarterly'
        ? 'All quarters'
        : 'All years'
    : selectedSorted.length === 0
      ? 'No periods'
      : selectedSorted.length === 1
        ? formatPeriodShort(selectedSorted[0])
        : `${formatPeriodShort(selectedSorted[0])} - ${formatPeriodShort(selectedSorted[selectedSorted.length - 1])}`;

  const classLabels: Record<string, string> = {
    REVENUE: 'Revenue',
    DIRECTCOSTS: 'Cost of Sales',
    EXPENSE: 'Expenses',
    OVERHEADS: 'Overheads',
    ASSET: 'Assets',
    LIABILITY: 'Liabilities',
    EQUITY: 'Equity',
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Period mode + Period picker + Comparison */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period mode tabs */}
        <div className="inline-flex rounded-lg border bg-muted/50 p-0.5">
          {(['monthly', 'quarterly', 'annual'] as PeriodMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handlePeriodMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                state.periodMode === mode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode === 'monthly' ? 'Monthly' : mode === 'quarterly' ? 'Quarterly' : 'Annual'}
            </button>
          ))}
        </div>

        {/* Period picker */}
        <div className="relative">
          <button
            onClick={() => setShowPeriodPicker(!showPeriodPicker)}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {periodLabel}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {showPeriodPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 rounded-lg border bg-card shadow-lg p-3 min-w-[240px]">
              <div className="flex gap-1.5 mb-2">
                <button onClick={handleSelectAll} className="text-[10px] px-2 py-1 rounded border hover:bg-muted/50">All</button>
                <button onClick={() => handleSelectLast(3)} className="text-[10px] px-2 py-1 rounded border hover:bg-muted/50">Last 3</button>
                <button onClick={() => handleSelectLast(6)} className="text-[10px] px-2 py-1 rounded border hover:bg-muted/50">Last 6</button>
                <button onClick={() => handleSelectLast(12)} className="text-[10px] px-2 py-1 rounded border hover:bg-muted/50">Last 12</button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {sortedPeriods.map((p) => (
                  <label key={p} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.selectedPeriods.includes(p)}
                      onChange={() => handlePeriodToggle(p)}
                      className="rounded border-muted-foreground/30"
                    />
                    <span className="text-xs">{formatPeriodShort(p)}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => setShowPeriodPicker(false)}
                className="mt-2 w-full text-[10px] py-1 rounded bg-foreground text-background font-medium hover:opacity-90"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Comparison mode */}
        {showComparison && (
          <select
            value={state.comparisonMode}
            onChange={(e) => handleComparison(e.target.value as ComparisonMode)}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium appearance-none cursor-pointer hover:bg-muted/50 transition-colors pr-7"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            <option value="none">No comparison</option>
            <option value="prior_period">vs Prior Period</option>
            <option value="prior_year">vs Same Period Last Year</option>
            {hasBudget && <option value="budget">vs Budget</option>}
          </select>
        )}

        {/* Account class filter */}
        {showAccountFilter && availableClasses && availableClasses.length > 0 && (
          <select
            value={state.accountFilter ?? ''}
            onChange={(e) => handleAccountFilter(e.target.value || null)}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium appearance-none cursor-pointer hover:bg-muted/50 transition-colors pr-7"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            <option value="">All accounts</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>{classLabels[cls] ?? cls}</option>
            ))}
          </select>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side: search, view mode, export */}
        <div className="flex items-center gap-1.5">
          {showSearch && (
            <input
              type="text"
              placeholder="Search accounts..."
              value={state.searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="rounded-lg border bg-background px-3 py-1.5 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          )}

          {showViewMode && (
            <div className="inline-flex rounded-lg border bg-muted/50 p-0.5">
              <button
                onClick={() => handleViewMode('summary')}
                title="Summary view"
                className={`p-1.5 rounded-md transition-colors ${
                  state.viewMode === 'summary'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleViewMode('detailed')}
                title="Detailed view"
                className={`p-1.5 rounded-md transition-colors ${
                  state.viewMode === 'detailed'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Table2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {exportData && exportData.length > 0 && (
            <button
              onClick={() => exportCSV(exportData, exportTitle ?? 'report')}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors"
              title="Export as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
