'use client';

/**
 * HorizonRow
 * --------------------------------------------------
 * Reusable 4-column row of time-horizon cards (Syft-style).
 * Replaces metric-typed cards (Revenue / Margin / Expenses / Profit)
 * with horizon-typed cards (Today / 1-7d / 8-30d / Overdue or Balance)
 * for cash, AR, AP, pipeline, and bookings surfaces.
 *
 * Variants:
 *   - cash                — T / 1-7d net / 8-30d net / current balance
 *   - invoices-receivable — T due / 1-7d due / 8-30d due / overdue
 *   - bills-payable       — T owed / 1-7d owed / 8-30d owed / overdue
 *   - hubspot-pipeline    — T close / 1-7d close / 8-30d close / stalled
 *   - acuity-bookings     — T / 1-7d / 8-30d / no-shows
 */

import { HorizonCard, type HorizonCellData, type HorizonKey, type HorizonTone } from './horizon-card';
import { cn } from '@/lib/utils';

export type HorizonVariant =
  | 'cash'
  | 'invoices-receivable'
  | 'bills-payable'
  | 'hubspot-pipeline'
  | 'acuity-bookings';

export interface HorizonRowData {
  today: HorizonCellData;
  next_1_7: HorizonCellData;
  next_8_30: HorizonCellData;
  overdue_or_balance: HorizonCellData;
}

export interface HorizonRowProps {
  variant: HorizonVariant;
  data: HorizonRowData;
  onCardClick?: (horizon: HorizonKey, variant: HorizonVariant) => void;
  /** Period context (passed to drill-down handler if needed) */
  period?: string;
  /** Currency code override */
  currencyCode?: string;
  /** Optional row title rendered above the cards */
  title?: string;
  /** Optional row subtitle rendered above the cards */
  subtitle?: string;
  className?: string;
}

interface CellMeta {
  label: string;
  /** Default tone if amount is non-zero. Some variants override based on sign. */
  defaultTone: HorizonTone;
  /** If true: positive amount → positive tone, negative → negative tone */
  signed?: boolean;
  /** Format amount as currency? Defaults true; some variants (acuity counts) override. */
  asCurrency?: boolean;
}

type VariantConfig = Record<HorizonKey, CellMeta>;

const VARIANT_CONFIG: Record<HorizonVariant, VariantConfig> = {
  cash: {
    today: { label: 'Today', defaultTone: 'neutral', signed: true },
    next_1_7: { label: 'Next 1-7 days', defaultTone: 'neutral', signed: true },
    next_8_30: { label: 'Next 8-30 days', defaultTone: 'neutral', signed: true },
    overdue_or_balance: { label: 'Current balance', defaultTone: 'positive', signed: true },
  },
  'invoices-receivable': {
    today: { label: 'Due today', defaultTone: 'warning' },
    next_1_7: { label: 'Due in 1-7 days', defaultTone: 'neutral' },
    next_8_30: { label: 'Due in 8-30 days', defaultTone: 'neutral' },
    overdue_or_balance: { label: 'Overdue', defaultTone: 'negative' },
  },
  'bills-payable': {
    today: { label: 'Owed today', defaultTone: 'warning' },
    next_1_7: { label: 'Owed in 1-7 days', defaultTone: 'neutral' },
    next_8_30: { label: 'Owed in 8-30 days', defaultTone: 'neutral' },
    overdue_or_balance: { label: 'Overdue to vendors', defaultTone: 'negative' },
  },
  'hubspot-pipeline': {
    today: { label: 'Closing today', defaultTone: 'positive' },
    next_1_7: { label: 'Closing 1-7 days', defaultTone: 'positive' },
    next_8_30: { label: 'Closing 8-30 days', defaultTone: 'neutral' },
    overdue_or_balance: { label: 'Stalled', defaultTone: 'negative' },
  },
  'acuity-bookings': {
    today: { label: 'Today', defaultTone: 'positive' },
    next_1_7: { label: 'Next 1-7 days', defaultTone: 'positive' },
    next_8_30: { label: 'Next 8-30 days', defaultTone: 'neutral' },
    overdue_or_balance: { label: 'No-shows', defaultTone: 'negative' },
  },
};

const HORIZON_ORDER: HorizonKey[] = ['today', 'next_1_7', 'next_8_30', 'overdue_or_balance'];

function resolveTone(meta: CellMeta, amount: number): HorizonTone {
  if (amount === 0) return 'neutral';
  if (meta.signed) {
    return amount >= 0 ? 'positive' : 'negative';
  }
  return meta.defaultTone;
}

export function HorizonRow({
  variant,
  data,
  onCardClick,
  period,
  currencyCode,
  title,
  subtitle,
  className,
}: HorizonRowProps) {
  const config = VARIANT_CONFIG[variant];
  // period is accepted as prop for caller convenience (e.g. wiring drill-downs);
  // not rendered directly but available to consumers via the closure.
  void period;

  return (
    <section
      aria-label={title ?? `${variant} time horizons`}
      className={cn('space-y-3', className)}
    >
      {(title || subtitle) && (
        <header className="space-y-0.5">
          {title && <h3 className="text-sm font-semibold tracking-tight">{title}</h3>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </header>
      )}
      <div
        role="group"
        aria-label={title ?? `${variant} horizons`}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {HORIZON_ORDER.map((key) => {
          const meta = config[key];
          const cell = data[key];
          const tone = resolveTone(meta, cell.amount);
          return (
            <HorizonCard
              key={key}
              horizonKey={key}
              label={meta.label}
              data={cell}
              tone={tone}
              currencyCode={currencyCode}
              asCurrency={meta.asCurrency ?? true}
              onClick={onCardClick ? (k) => onCardClick(k, variant) : undefined}
            />
          );
        })}
      </div>
    </section>
  );
}

export type { HorizonCellData, HorizonKey, HorizonTone } from './horizon-card';
