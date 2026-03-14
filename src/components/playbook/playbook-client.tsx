'use client';

import { useState } from 'react';
import { OverallScore } from './overall-score';
import { MaturityRadar } from './maturity-radar';
import { DimensionCard } from './dimension-card';
import { ActionList } from './action-list';
import type { PlaybookAssessment, PlaybookAction, ActionStatus } from '@/types/playbook';

type PlaybookClientProps = {
  initialAssessment: PlaybookAssessment | null;
  initialActions: PlaybookAction[];
  orgId: string;
};

export function PlaybookClient({
  initialAssessment,
  initialActions,
  orgId,
}: PlaybookClientProps) {
  const [assessment, setAssessment] = useState(initialAssessment);
  const [actions, setActions] = useState(initialActions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAssessment() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/playbook/assess/${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: 'tpl-general-sme-growth' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Assessment failed');
      }

      const data = await res.json();
      setAssessment(data.assessment);
      setActions(data.actions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assessment failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(actionId: string, status: ActionStatus) {
    try {
      await fetch(`/api/playbook/actions/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, status }),
      });
    } catch {
      // Status change is optimistic; failure is non-critical
    }
  }

  function scrollToActions() {
    document.getElementById('playbook-actions')?.scrollIntoView({ behavior: 'smooth' });
  }

  if (!assessment) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Run Your First Assessment</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Assess your organisation against the SME Growth Playbook to understand your
            maturity across Financial Health, Operations, Growth, Team, and Governance.
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          onClick={runAssessment}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running Assessment...
            </>
          ) : (
            'Run Assessment'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <OverallScore assessment={assessment} />

      {/* Radar Chart */}
      <MaturityRadar scores={assessment.dimensionScores} />

      {/* Dimension Cards Grid */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Dimensions</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assessment.dimensionScores.map((score) => (
            <DimensionCard
              key={score.dimensionId}
              score={score}
              onImprove={scrollToActions}
            />
          ))}
        </div>
      </div>

      {/* Re-run button */}
      <div className="flex justify-end">
        <button
          onClick={runAssessment}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          {loading ? 'Re-assessing...' : 'Re-run Assessment'}
        </button>
      </div>

      {/* Actions */}
      <div id="playbook-actions">
        <ActionList actions={actions} onStatusChange={handleStatusChange} />
      </div>
    </div>
  );
}
