'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface NarrativeSummaryProps {
  orgId: string;
  period: string;
  /** Override the API endpoint path. Defaults to 'narrative'. Used as /api/{endpoint}/{orgId} */
  narrativeEndpoint?: string;
}

interface NarrativeData {
  narrative: string;
  reasoning: string | null;
  confidence: string | null;
  dataFreshness: string | null;
}

export function NarrativeSummary({ orgId, period, narrativeEndpoint = 'narrative' }: NarrativeSummaryProps) {
  const [data, setData] = useState<NarrativeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReasoning, setShowReasoning] = useState(false);
  const [error, setError] = useState<string | false>(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchNarrative() {
      setLoading(true);
      setError(false);
      try {
        // Stagger requests to avoid rate limit spike from multiple narrative components
        await new Promise(r => setTimeout(r, Math.random() * 2000));
        if (cancelled) return;

        const res = await fetch(`/api/${narrativeEndpoint}/${orgId}?period=${period}`);
        if (res.ok && !cancelled) {
          const json = await res.json();
          setData(json);
        } else if (!cancelled) {
          if (res.status === 429) {
            setError('rate_limited');
          } else if (res.status === 402) {
            setError('budget_exceeded');
          } else if (res.status === 401 || res.status === 403) {
            setError('auth_error');
          } else {
            setError('generic');
          }
        }
      } catch {
        if (!cancelled) setError('generic');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNarrative();
    return () => { cancelled = true; };
  }, [orgId, period, narrativeEndpoint]);

  if (loading) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 animate-pulse text-blue-500" />
            <span>Generating financial summary...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/25 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>AI narrative unavailable — {error === 'rate_limited' ? 'too many requests, try again shortly' : error === 'budget_exceeded' ? 'monthly AI budget reached' : error === 'auth_error' ? 'authentication issue' : 'loading insights...'}</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="py-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <p className="text-sm leading-relaxed">{data.narrative}</p>
          </div>

          {data.reasoning && (
            <div className="ml-6">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showReasoning ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                <span>Why this summary?</span>
                {data.confidence && (
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    data.confidence === 'high'
                      ? 'bg-green-100 text-green-700'
                      : data.confidence === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {data.confidence} confidence
                  </span>
                )}
              </button>

              {showReasoning && (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {data.reasoning}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
