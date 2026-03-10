'use client';

import { useState } from 'react';
import { ScenarioChatBuilder } from './scenario-chat-builder';

type Props = {
  availablePeriods: string[];
};

export function ChatScenarioLauncher({ availablePeriods }: Props) {
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [assumptionSetId, setAssumptionSetId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    basePeriodStart: availablePeriods.length > 0 ? availablePeriods[0].slice(0, 7) : '',
    basePeriodEnd: availablePeriods.length > 0 ? availablePeriods[availablePeriods.length - 1].slice(0, 7) : '',
    forecastHorizonMonths: 12,
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: 'Created via chat builder',
          basePeriodStart: `${form.basePeriodStart}-01`,
          basePeriodEnd: `${form.basePeriodEnd}-01`,
          forecastHorizonMonths: form.forecastHorizonMonths,
          isBase: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setScenarioId(data.scenario.id);
        setAssumptionSetId(data.assumptionSet.id);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create scenario');
      }
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  }

  // Show chat builder after scenario is created
  if (scenarioId && assumptionSetId) {
    return (
      <div className="rounded-lg border" style={{ height: '500px' }}>
        <div className="border-b px-4 py-2 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{form.name}</span>
            <span className="text-xs text-muted-foreground ml-2">Chat Builder</span>
          </div>
          <button
            onClick={() => {
              setScenarioId(null);
              setAssumptionSetId(null);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
        <ScenarioChatBuilder
          scenarioId={scenarioId}
          assumptionSetId={assumptionSetId}
          basePeriodStart={`${form.basePeriodStart}-01`}
          basePeriodEnd={`${form.basePeriodEnd}-01`}
          forecastHorizonMonths={form.forecastHorizonMonths}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium mb-3">Build with Chat</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Describe your scenario in plain English. AI will interpret your request and propose assumption changes grounded in your Xero data.
      </p>
      <form onSubmit={handleCreate} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium">Scenario Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm"
              placeholder="e.g. Growth Scenario Q1"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium">Base Period Start</label>
            <input
              value={form.basePeriodStart}
              onChange={(e) => setForm({ ...form, basePeriodStart: e.target.value })}
              type="month"
              className="w-full rounded border px-2 py-1 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium">Base Period End</label>
            <input
              value={form.basePeriodEnd}
              onChange={(e) => setForm({ ...form, basePeriodEnd: e.target.value })}
              type="month"
              className="w-full rounded border px-2 py-1 text-sm"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Start Chat Builder'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
