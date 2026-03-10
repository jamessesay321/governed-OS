'use client';

import type { AICommentary } from '@/types';

type Props = {
  commentary: AICommentary[];
};

const typeStyles: Record<string, { bg: string; text: string; label: string }> = {
  anomaly: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', label: 'Anomaly' },
  risk: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', label: 'Risk' },
  opportunity: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', label: 'Opportunity' },
  insight: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', label: 'Insight' },
};

export function AICommentaryPanel({ commentary }: Props) {
  if (commentary.length === 0) {
    return <p className="text-sm text-muted-foreground">No AI commentary available. Run the model to generate insights.</p>;
  }

  return (
    <div className="space-y-3">
      {commentary.map((item) => {
        const style = typeStyles[item.commentary_type] ?? typeStyles.insight;
        return (
          <div key={item.id} className={`rounded-lg border p-4 ${style.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-semibold uppercase ${style.text}`}>{style.label}</span>
              <span className="text-xs text-muted-foreground">
                {(item.confidence_score * 100).toFixed(0)}% confidence
              </span>
            </div>
            <h4 className="font-medium text-sm">{item.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{item.body}</p>
          </div>
        );
      })}
    </div>
  );
}
