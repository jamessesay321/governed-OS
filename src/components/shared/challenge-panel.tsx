'use client';

/**
 * Challenge Panel — slide-out panel for flagging financial numbers
 *
 * Usage from any page:
 *   const { openChallenge } = useChallenge();
 *   openChallenge({ page: 'balance-sheet', metricLabel: 'Accounts Receivable', metricValue: '£12,000', period: '2025-06-01' });
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { X, Flag, AlertTriangle, HelpCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── Types ─── */

interface ChallengeContext {
  page: string;
  metricLabel: string;
  metricValue?: string;
  period?: string;
  accountId?: string;
  contextJson?: Record<string, unknown>;
}

interface ChallengeState {
  isOpen: boolean;
  context: ChallengeContext | null;
}

interface ChallengeContextValue {
  openChallenge: (ctx: ChallengeContext) => void;
  closeChallenge: () => void;
  state: ChallengeState;
}

const ChallengeCtx = createContext<ChallengeContextValue | null>(null);

export function useChallenge() {
  const ctx = useContext(ChallengeCtx);
  if (!ctx) throw new Error('useChallenge must be used within ChallengeProvider');
  return ctx;
}

/* ─── Provider ─── */

export function ChallengeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChallengeState>({ isOpen: false, context: null });

  const openChallenge = useCallback((ctx: ChallengeContext) => {
    setState({ isOpen: true, context: ctx });
  }, []);

  const closeChallenge = useCallback(() => {
    setState({ isOpen: false, context: null });
  }, []);

  return (
    <ChallengeCtx.Provider value={{ openChallenge, closeChallenge, state }}>
      {children}
    </ChallengeCtx.Provider>
  );
}

/* ─── Severity options ─── */

const SEVERITY_OPTIONS = [
  { value: 'question', label: 'Question', icon: HelpCircle, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  { value: 'concern', label: 'Concern', icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  { value: 'error', label: 'Likely Error', icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' },
] as const;

/* ─── Panel Component ─── */

export function ChallengePanel() {
  const { state, closeChallenge } = useChallenge();
  const [severity, setSeverity] = useState<'question' | 'concern' | 'error'>('question');
  const [reason, setReason] = useState('');
  const [expectedValue, setExpectedValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state.isOpen || !state.context) return null;

  const ctx = state.context;

  async function handleSubmit() {
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: ctx.page,
          metricLabel: ctx.metricLabel,
          metricValue: ctx.metricValue,
          period: ctx.period,
          accountId: ctx.accountId,
          reason: reason.trim(),
          expectedValue: expectedValue.trim() || undefined,
          severity,
          contextJson: ctx.contextJson,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to submit challenge');
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setReason('');
        setExpectedValue('');
        setSeverity('question');
        closeChallenge();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={closeChallenge}
      />

      {/* Slide-out panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-background border-l shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold">Challenge a Number</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={closeChallenge}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5" style={{ maxHeight: 'calc(100vh - 72px)' }}>
          {/* What's being challenged */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Flagged Number</p>
            <p className="text-lg font-bold">{ctx.metricLabel}</p>
            {ctx.metricValue && (
              <p className="text-2xl font-bold font-mono">{ctx.metricValue}</p>
            )}
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>Page: {ctx.page}</span>
              {ctx.period && <span>Period: {ctx.period}</span>}
            </div>
          </div>

          {submitted ? (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-center">
              <p className="text-lg font-semibold text-emerald-700">Challenge Submitted</p>
              <p className="text-sm text-emerald-600 mt-1">
                Your team will be notified. Check the Review Queue for updates.
              </p>
            </div>
          ) : (
            <>
              {/* Severity */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Severity</label>
                <div className="grid grid-cols-3 gap-2">
                  {SEVERITY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = severity === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setSeverity(opt.value)}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all ${
                          isSelected ? opt.bgColor : 'bg-background hover:bg-muted/50'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isSelected ? opt.color : 'text-muted-foreground'}`} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <label className="text-sm font-medium">What looks wrong?</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. This revenue figure seems too high. We haven't invoiced that much this month."
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={4}
                />
              </div>

              {/* Expected value */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Expected value <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={expectedValue}
                  onChange={(e) => setExpectedValue(e.target.value)}
                  placeholder="e.g. ~£85,000"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!reason.trim() || submitting}
                className="w-full"
              >
                {submitting ? 'Submitting...' : 'Submit Challenge'}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                This will notify your accountant or team admin for review.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Convenience: Challenge Button for page headers ─── */

export function ChallengeButton({
  page,
  metricLabel,
  metricValue,
  period,
  accountId,
  className,
}: ChallengeContext & { className?: string }) {
  const { openChallenge } = useChallenge();

  return (
    <button
      onClick={() =>
        openChallenge({ page, metricLabel, metricValue, period, accountId })
      }
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ${className ?? ''}`}
      title="Flag this number for review"
    >
      <Flag className="h-3.5 w-3.5" />
      Challenge
    </button>
  );
}
