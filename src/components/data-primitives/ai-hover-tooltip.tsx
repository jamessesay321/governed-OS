'use client';

import { useState, type ReactNode } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { useHoverExplain } from '@/lib/hooks/use-hover-explain';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AIHoverTooltipProps {
  children: ReactNode;
  /** Metric label, e.g. "Revenue" or "Net Profit" */
  label: string;
  /** Raw numeric value */
  value: number;
  /** Display-formatted value string, e.g. "£60,000" */
  formattedValue: string;
  /** Period label, e.g. "Jan 2026" or "Q1 2026" */
  period: string;
  /** Organisation ID for API calls */
  orgId: string;
  /** Optional variance vs prior period as a decimal (e.g. 0.12 = +12%) */
  variance?: number;
  /** Optional percentage of total as a decimal (e.g. 0.35 = 35%) */
  percentOfTotal?: number;
  /** Optional extra context passed to the AI */
  context?: string;
  /** Whether tooltip is enabled (defaults to true, disabled on touch) */
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatVariance(variance: number): { text: string; color: string; arrow: string } {
  const pct = Math.abs(variance * 100).toFixed(1).replace(/\.0$/, '');
  if (variance > 0) {
    return { text: `+${pct}%`, color: 'text-emerald-600', arrow: '\u2191' };
  }
  if (variance < 0) {
    return { text: `-${pct}%`, color: 'text-red-500', arrow: '\u2193' };
  }
  return { text: '0%', color: 'text-slate-400', arrow: '\u2192' };
}

function formatPctOfTotal(pct: number): string {
  const display = (pct * 100).toFixed(1).replace(/\.0$/, '');
  return `${display}% of total`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * AI-powered hover tooltip for financial metrics.
 *
 * Shows:
 *  1. Formatted value (bold)
 *  2. Variance vs prior period (green/red arrow + %)
 *  3. Percentage of total
 *  4. AI-generated one-sentence explanation (fetched after 500ms hover)
 *
 * Touch devices: tooltip does not open on tap, so click-through to
 * drill-down is preserved.
 */
export function AIHoverTooltip({
  children,
  label,
  value,
  formattedValue,
  period,
  orgId,
  variance,
  percentOfTotal,
  context,
  enabled = true,
}: AIHoverTooltipProps) {
  const [isHovering, setIsHovering] = useState(false);

  const { explanation, isLoading } = useHoverExplain(
    { label, value, period, orgId, context },
    isHovering && enabled,
  );

  // Detect touch device — disable tooltip on touch to preserve tap = click
  const handlePointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    setIsHovering(true);
  };

  const handlePointerLeave = () => {
    setIsHovering(false);
  };

  // Skip tooltip entirely when no orgId or value is 0
  if (!orgId || !enabled) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      <TooltipPrimitive.Root open={isHovering}>
        <TooltipPrimitive.Trigger asChild>
          <span
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            className="inline-flex"
          >
            {children}
          </span>
        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="top"
            align="center"
            sideOffset={8}
            className="z-[100] max-w-[300px] rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            // Prevent tooltip from capturing pointer events that would block clicks
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            {/* Row 1: Formatted value */}
            <div className="text-sm font-semibold text-slate-900">
              {formattedValue}
              {label && (
                <span className="ml-1.5 font-normal text-slate-500">
                  {label}
                </span>
              )}
            </div>

            {/* Row 2: Variance */}
            {variance !== undefined && (
              <div className="mt-1 text-xs">
                <span className={formatVariance(variance).color}>
                  {formatVariance(variance).arrow}{' '}
                  {formatVariance(variance).text}
                </span>
                <span className="ml-1 text-slate-400">vs prior period</span>
              </div>
            )}

            {/* Row 3: % of total */}
            {percentOfTotal !== undefined && (
              <div className="mt-0.5 text-xs text-slate-500">
                {formatPctOfTotal(percentOfTotal)}
              </div>
            )}

            {/* Row 4: AI explanation */}
            <div className="mt-1.5 border-t border-slate-100 pt-1.5 text-xs italic text-slate-600">
              {isLoading && (
                <span className="inline-flex items-center gap-1">
                  <span className="animate-pulse">...</span>
                </span>
              )}
              {!isLoading && explanation && <span>{explanation}</span>}
              {!isLoading && !explanation && value !== 0 && (
                <span className="text-slate-400">Hover to get AI insight</span>
              )}
            </div>

            <TooltipPrimitive.Arrow className="fill-white" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
