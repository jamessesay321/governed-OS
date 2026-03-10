'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ScenarioComparisonResult } from '@/lib/scenarios/scenarios';
import { ScenarioComparisonTable } from '@/components/scenarios/scenario-comparison-table';

type ScenarioOption = {
  id: string;
  name: string;
  status: string;
};

type Props = {
  scenarios: ScenarioOption[];
};

export function CompareClient({ scenarios }: Props) {
  const [baseId, setBaseId] = useState('');
  const [compId, setCompId] = useState('');
  const [result, setResult] = useState<ScenarioComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCompare() {
    if (!baseId || !compId || baseId === compId) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/scenarios/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseScenarioId: baseId,
          comparisonScenarioId: compId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Comparison failed');
        return;
      }

      setResult(await res.json());
    } catch {
      setError('Failed to compare scenarios');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/scenarios" className="text-sm text-muted-foreground hover:underline">Scenarios</Link>
          <span className="text-muted-foreground">/</span>
          <h2 className="text-2xl font-bold">Compare Scenarios</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Select two scenarios to compare their projections side by side.
        </p>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium">Base Scenario</label>
          <select
            value={baseId}
            onChange={(e) => setBaseId(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm mt-1"
          >
            <option value="">Select base...</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium">Comparison Scenario</label>
          <select
            value={compId}
            onChange={(e) => setCompId(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm mt-1"
          >
            <option value="">Select comparison...</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCompare}
          disabled={!baseId || !compId || baseId === compId || loading}
          className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Comparing...' : 'Compare'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && <ScenarioComparisonTable result={result} />}
    </div>
  );
}
