'use client';

import type { LLMInterpretation } from '@/types';
import type { ValidationWarning } from '@/lib/ai/validate-proposal';

type Props = {
  interpretation: LLMInterpretation;
  warnings: ValidationWarning[];
  confirmationToken?: string;
  onConfirm: (token: string) => void;
  onReject: () => void;
  confirming: boolean;
};

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-green-100 text-green-800';
  if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

export function ProposalCard({
  interpretation,
  warnings,
  confirmationToken,
  onConfirm,
  onReject,
  confirming,
}: Props) {
  const needsClarification = interpretation.confidence < 0.7;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Summary */}
      <p className="text-sm">{interpretation.interpretation_summary}</p>

      {/* Confidence badge */}
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${confidenceColor(interpretation.confidence)}`}>
          Confidence: {(interpretation.confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Proposed changes */}
      {interpretation.assumption_changes.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Proposed Changes</p>
          <ul className="space-y-1">
            {interpretation.assumption_changes.map((change, i) => (
              <li key={i} className="text-sm flex items-start gap-1">
                <span className="text-muted-foreground">-</span>
                <span>
                  <strong>{change.label}</strong>:{' '}
                  {change.current_value !== null ? (
                    <><span className="text-muted-foreground">{change.current_value}</span> → </>
                  ) : null}
                  <span className="font-medium">{change.new_value}</span>
                  <span className="text-muted-foreground"> — {change.reasoning}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-up questions */}
      {needsClarification && interpretation.follow_up_questions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Needs Clarification</p>
          {interpretation.follow_up_questions.map((q, i) => (
            <p key={i} className="text-sm italic text-muted-foreground">{q}</p>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-amber-600">Warnings</p>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600">
              {w.field}: {w.message}
            </p>
          ))}
        </div>
      )}

      {/* Actions */}
      {!needsClarification && confirmationToken && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onConfirm(confirmationToken)}
            disabled={confirming}
            className="rounded bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            {confirming ? 'Applying...' : 'Confirm Changes'}
          </button>
          <button
            onClick={onReject}
            disabled={confirming}
            className="rounded border border-red-200 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
