'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

interface AlertExplanationCardProps {
  alertRuleId: string;
  metricKey: string;
  metricLabel: string;
  currentValue: number;
  threshold: number;
  orgId: string;
}

interface ExplanationResponse {
  explanation: string;
  suggestedAction: string;
}

export function AlertExplanationCard({
  alertRuleId,
  metricKey,
  metricLabel,
  currentValue,
  threshold,
  orgId,
}: AlertExplanationCardProps) {
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExplanation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/alerts/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertRuleId,
          metricKey,
          currentValue,
          threshold,
          orgId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get explanation');
      }

      const data = await res.json();
      setExplanation({
        explanation: data.explanation,
        suggestedAction: data.suggestedAction,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [alertRuleId, metricKey, currentValue, threshold, orgId]);

  return (
    <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="h-4 w-4 text-indigo-500" />
            AI Explanation
          </CardTitle>
          {explanation && (
            <button
              onClick={fetchExplanation}
              disabled={loading}
              className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!explanation && !loading && !error && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground mb-2">
              <span className="font-medium">{metricLabel}</span> breached threshold ({threshold.toLocaleString()}).
              Current value: {currentValue.toLocaleString()}.
            </p>
            <button
              onClick={fetchExplanation}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Explain This Alert
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-4 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            <span className="text-xs text-muted-foreground">Analysing metric changes...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {explanation && !loading && (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                What happened
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {explanation.explanation}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                Suggested action
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {explanation.suggestedAction}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
