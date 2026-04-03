'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGlobalPeriodContext } from '@/components/providers/global-period-provider';
import type { PeriodMode, ComparisonMode } from '@/lib/hooks/use-global-period';

// ─── Period Mode Pills ─────────────────────────────────────────────

const MODE_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

const COMPARE_OPTIONS: { value: ComparisonMode; label: string }[] = [
  { value: 'none', label: 'No comparison' },
  { value: 'prior_period', label: 'vs Prior Period' },
  { value: 'prior_year', label: 'vs Prior Year' },
];

// ─── Helpers ────────────────────────────────────────────────────────

function formatPeriodLabel(period: string): string {
  if (!period) return '';
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatPeriodShort(period: string): string {
  if (!period) return '';
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

// ─── Component ──────────────────────────────────────────────────────

export function GlobalPeriodSelector() {
  const {
    period,
    mode,
    compare,
    availablePeriods,
    fyLabel,
    comparisonPeriod,
    setPeriod,
    setMode,
    setCompare,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
  } = useGlobalPeriodContext();

  if (availablePeriods.length === 0) return null;

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3 px-6 py-2">
        {/* Period mode pills */}
        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                mode === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Period navigation: ← [dropdown] → */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={goBack}
            disabled={!canGoBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-7 w-auto min-w-[140px] gap-1 border-0 bg-transparent px-2 text-sm font-medium shadow-none focus:ring-0">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue>{formatPeriodLabel(period)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[...availablePeriods].reverse().map((p) => (
                <SelectItem key={p} value={p}>
                  {formatPeriodLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={goForward}
            disabled={!canGoForward}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Comparison mode */}
        <Select value={compare} onValueChange={(v) => setCompare(v as ComparisonMode)}>
          <SelectTrigger className="h-7 w-auto min-w-[130px] border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPARE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Comparison period label */}
        {comparisonPeriod && compare !== 'none' && (
          <span className="text-xs text-muted-foreground">
            {formatPeriodShort(comparisonPeriod)}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* FY label */}
        <span className="text-xs text-muted-foreground">
          FY: {fyLabel}
        </span>
      </div>
    </div>
  );
}
