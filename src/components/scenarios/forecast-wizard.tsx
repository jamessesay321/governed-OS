'use client';

/**
 * ForecastWizard — Syft-inspired 3-step flow for creating a scenario
 * populated from prior-year actuals + a percentage uplift.
 *
 * Step 1: General info  — name, description, target range, base flag
 * Step 2: Population    — source range, global % uplift, advanced category overrides, toggles
 * Step 3: Review        — shows prior-year aggregates + computed seed preview, creates on confirm
 *
 * Posts to POST /api/scenarios/populate-from-prior and redirects to /scenarios/:id on success.
 */

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Info,
} from 'lucide-react';

type Overrides = {
  global: number;
  revenue?: number;
  cost_of_sales?: number;
  employee_costs?: number;
  other_overheads?: number;
  interest_and_finance?: number;
  depreciation?: number;
};

type Aggregates = {
  periodsFound: number;
  sourceRange: { start: string; end: string };
  revenue: number;
  otherIncome: number;
  costOfSales: number;
  employeeCosts: number;
  otherOverheads: number;
  interestAndFinance: number;
  depreciation: number;
  rowCounts: Record<string, number>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availablePeriods: string[]; // YYYY-MM-01
};

export function ForecastWizard({ open, onOpenChange, availablePeriods }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Aggregates | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────
  const defaultTargetStart = useMemo(() => nextJanuary(), []);
  const defaultSourceRange = useMemo(() => priorYearRange(availablePeriods), [availablePeriods]);

  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [isBase, setIsBase] = useState(false);
  const [forecastHorizonMonths, setForecastHorizonMonths] = useState(12);
  const [targetStart, setTargetStart] = useState(defaultTargetStart);

  const [sourceStart, setSourceStart] = useState(defaultSourceRange.start);
  const [sourceEnd, setSourceEnd] = useState(defaultSourceRange.end);
  const [globalUplift, setGlobalUplift] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [overrides, setOverrides] = useState<Omit<Overrides, 'global'>>({});
  const [rolling, setRolling] = useState(false);
  const [autoVat, setAutoVat] = useState(false);

  // Keep the auto-suggested name in sync with inputs UNLESS the user has edited it.
  useEffect(() => {
    if (open && !nameEdited) {
      const year = targetStart.slice(0, 4);
      const sign = globalUplift >= 0 ? '+' : '';
      setName(`Forecast ${year} — Prior Year ${sign}${globalUplift}%`);
    }
  }, [open, targetStart, globalUplift, nameEdited]);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setStep(1);
      setError('');
      setPreview(null);
      setSubmitting(false);
      setNameEdited(false);
    }
  }, [open]);

  // Build payload — shared between preview and submit
  const payload = useMemo(
    () => ({
      name,
      description,
      sourceStart,
      sourceEnd,
      targetStart,
      forecastHorizonMonths,
      overrides: { global: globalUplift, ...overrides },
      isBase,
      rolling,
      autoVat,
    }),
    [
      name,
      description,
      sourceStart,
      sourceEnd,
      targetStart,
      forecastHorizonMonths,
      globalUplift,
      overrides,
      isBase,
      rolling,
      autoVat,
    ]
  );

  // ── Step navigation ─────────────────────────────────────────────────
  async function goNext() {
    setError('');
    if (step === 1) {
      if (!name.trim()) {
        setError('Name is required');
        return;
      }
      if (!isIsoMonth(targetStart)) {
        setError('Forecast start must be a valid YYYY-MM-DD date');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!isIsoMonth(sourceStart) || !isIsoMonth(sourceEnd)) {
        setError('Source range must be valid YYYY-MM-DD dates');
        return;
      }
      if (sourceStart > sourceEnd) {
        setError('Source start must be on or before source end');
        return;
      }

      // Fetch a preview of aggregates via a dry-run (we just call the real endpoint
      // but with runPipeline: false AND we don't actually persist — so we use a
      // separate preview endpoint. For now, skip preview fetching and let step 3
      // render a summary from the user's inputs only.)
      // NOTE: building a real dry-run preview endpoint is a nice-to-have;
      // for R1 we show inputs + a "will be created" confirmation.
      setPreview(null);
      setStep(3);
      return;
    }
  }

  function goBack() {
    setError('');
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/scenarios/populate-from-prior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, runPipeline: true }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || `Failed to create forecast (${res.status})`);
        setSubmitting(false);
        return;
      }

      // Even on 201, the model pipeline may have failed silently — surface that
      // instead of redirecting to a sparkline-less scenario card.
      if (data.pipelineError) {
        setError(
          `Forecast created but model pipeline failed: ${data.pipelineError}. Open the scenario to inspect, or fix and retry.`
        );
        setSubmitting(false);
        return;
      }

      // Success — redirect to the scenario
      onOpenChange(false);
      router.push(`/scenarios/${data.scenarioId}`);
      router.refresh();
    } catch {
      setError('Network error creating forecast');
      setSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Create a forecast
          </DialogTitle>
          <DialogDescription>
            Populate a new scenario from prior-year actuals plus a percentage adjustment.
            You can fine-tune assumptions after it&apos;s created.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step === n
                    ? 'bg-blue-600 text-white'
                    : step > n
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step > n ? <Check className="h-3.5 w-3.5" /> : n}
              </div>
              <span
                className={`text-xs ${step === n ? 'font-medium' : 'text-muted-foreground'}`}
              >
                {n === 1
                  ? 'General info'
                  : n === 2
                    ? 'Population options'
                    : 'Review'}
              </span>
              {n < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: General info ─────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-3">
            <Field label="Name">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameEdited(true);
                }}
                placeholder="e.g. Forecast 2026 — Prior Year +10%"
                className="w-full rounded border px-3 py-2 text-sm"
                autoFocus
              />
            </Field>
            <Field label="Description" hint="Optional — visible on the scenario card">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm min-h-[60px]"
                placeholder="Brief context or notes about this forecast"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Forecast starts" hint="First month of the forecast">
                <input
                  type="month"
                  value={targetStart.slice(0, 7)}
                  onChange={(e) => setTargetStart(`${e.target.value}-01`)}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Horizon (months)">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={forecastHorizonMonths}
                  onChange={(e) =>
                    setForecastHorizonMonths(parseInt(e.target.value) || 12)
                  }
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm pt-1">
              <input
                type="checkbox"
                checked={isBase}
                onChange={(e) => setIsBase(e.target.checked)}
              />
              Set as base scenario
            </label>
          </div>
        )}

        {/* ── Step 2: Population options ──────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Your forecast will be seeded from actuals between{' '}
                <strong>{sourceStart.slice(0, 7)}</strong> and{' '}
                <strong>{sourceEnd.slice(0, 7)}</strong>. Pick a different source range
                below if you want to use a specific period (e.g. last fiscal year).
              </div>
            </div>

            <Field label="Populate forecast using">
              <select
                className="w-full rounded border px-3 py-2 text-sm bg-white"
                value="prior_year"
                disabled
              >
                <option value="prior_year">Prior last year (recommended)</option>
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Source period starts">
                <input
                  type="month"
                  value={sourceStart.slice(0, 7)}
                  onChange={(e) => setSourceStart(`${e.target.value}-01`)}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Source period ends">
                <input
                  type="month"
                  value={sourceEnd.slice(0, 7)}
                  onChange={(e) => setSourceEnd(`${e.target.value}-01`)}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </Field>
            </div>

            <Field label="Plus percentage change" hint="Applied globally unless overridden below">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  value={globalUplift}
                  onChange={(e) => setGlobalUplift(parseFloat(e.target.value) || 0)}
                  className="w-24 rounded border px-3 py-2 text-sm"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </Field>

            <div className="flex flex-wrap gap-4 pt-1">
              <Toggle
                checked={rolling}
                onChange={setRolling}
                label="Rolling forecast"
                hint="Auto-shift the range as each month closes"
              />
              <Toggle
                checked={autoVat}
                onChange={setAutoVat}
                label="Automatic VAT"
                hint="Apply 20% VAT to revenue + input VAT on costs"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="text-xs text-blue-700 hover:text-blue-900 underline"
            >
              {showAdvanced ? 'Hide' : 'Show'} advanced (per-category uplift)
            </button>

            {showAdvanced && (
              <div className="rounded-md border p-3 space-y-2 bg-gray-50">
                <p className="text-xs text-muted-foreground">
                  Leave blank to use the global %. Specific values override per category.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_FIELDS.map((f) => (
                    <CategoryOverrideField
                      key={f.key}
                      label={f.label}
                      value={overrides[f.key as keyof typeof overrides]}
                      onChange={(v) =>
                        setOverrides((prev) => ({ ...prev, [f.key]: v }))
                      }
                      placeholder={`${globalUplift}%`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Review ───────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-3 bg-gray-50 space-y-1">
              <Row k="Name" v={name} />
              {description && <Row k="Description" v={description} />}
              <Row
                k="Source range"
                v={`${sourceStart.slice(0, 7)} → ${sourceEnd.slice(0, 7)}`}
              />
              <Row k="Forecast starts" v={targetStart.slice(0, 7)} />
              <Row k="Horizon" v={`${forecastHorizonMonths} months`} />
              <Row
                k="Global uplift"
                v={`${globalUplift >= 0 ? '+' : ''}${globalUplift}%`}
              />
              {Object.entries(overrides).some(([, v]) => v != null) && (
                <Row
                  k="Category overrides"
                  v={
                    Object.entries(overrides)
                      .filter(([, v]) => v != null)
                      .map(([k, v]) => `${labelForKey(k)} ${v}%`)
                      .join(', ')
                  }
                />
              )}
              {isBase && <Row k="Base scenario" v="Yes" />}
              {rolling && <Row k="Rolling" v="Yes" />}
              {autoVat && <Row k="Automatic VAT" v="Yes" />}
            </div>
            <div className="text-xs text-muted-foreground">
              On create, the forecast will be seeded with ~8 assumption rows and the model
              pipeline will run immediately. You&apos;ll be redirected to the scenario detail
              page when it&apos;s ready.
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={submitting}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {step < 3 && (
              <Button type="button" onClick={goNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating forecast...
                  </>
                ) : (
                  <>Create forecast</>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
        {hint && <span className="ml-2 text-muted-foreground font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function CategoryOverrideField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs flex-1">{label}</label>
      <input
        type="number"
        step="0.5"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? undefined : parseFloat(v));
        }}
        placeholder={placeholder}
        className="w-20 rounded border px-2 py-1 text-xs text-right"
      />
      <span className="text-xs text-muted-foreground">%</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-muted-foreground w-32 shrink-0">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

const CATEGORY_FIELDS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'cost_of_sales', label: 'Cost of Sales' },
  { key: 'employee_costs', label: 'Employee Costs' },
  { key: 'other_overheads', label: 'Other Overheads' },
  { key: 'interest_and_finance', label: 'Interest & Finance' },
  { key: 'depreciation', label: 'Depreciation' },
];

function labelForKey(k: string) {
  return CATEGORY_FIELDS.find((f) => f.key === k)?.label ?? k;
}

function isIsoMonth(s: string): boolean {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function nextJanuary(): string {
  // Default target start = first day of next calendar year
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  d.setMonth(0);
  d.setDate(1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function priorYearRange(availablePeriods: string[]): { start: string; end: string } {
  // If we have available periods, use the last full calendar year within them.
  if (availablePeriods.length > 0) {
    const sorted = [...availablePeriods].sort();
    const latest = sorted[sorted.length - 1];
    const year = parseInt(latest.slice(0, 4)) - 1;
    return { start: `${year}-01-01`, end: `${year}-12-01` };
  }
  // Fallback: last calendar year from today
  const y = new Date().getFullYear() - 1;
  return { start: `${y}-01-01`, end: `${y}-12-01` };
}
