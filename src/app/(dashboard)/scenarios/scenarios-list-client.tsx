'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Scenario, Role } from '@/types';
import { ROLE_HIERARCHY } from '@/types';
import { ChatScenarioLauncher } from '@/components/scenarios/chat-scenario-launcher';

type ScenarioWithSet = Scenario & {
  assumption_sets: {
    name: string;
    base_period_start: string;
    base_period_end: string;
    forecast_horizon_months: number;
  } | null;
};

type Props = {
  scenarios: ScenarioWithSet[];
  role: string;
  availablePeriods?: string[];
};

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  locked: 'bg-gray-100 text-gray-800',
  archived: 'bg-red-100 text-red-800',
};

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export function ScenariosListClient({ scenarios, role, availablePeriods = [] }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    basePeriodStart: '',
    basePeriodEnd: '',
    forecastHorizonMonths: 12,
    isBase: false,
  });

  const canCreate = hasMinRole(role as Role, 'advisor');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');

    // Convert YYYY-MM month inputs to YYYY-MM-01 format
    const payload = {
      ...form,
      basePeriodStart: form.basePeriodStart ? `${form.basePeriodStart}-01` : '',
      basePeriodEnd: form.basePeriodEnd ? `${form.basePeriodEnd}-01` : '',
    };

    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.refresh();
        setForm({ name: '', description: '', basePeriodStart: '', basePeriodEnd: '', forecastHorizonMonths: 12, isBase: false });
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed to create scenario (${res.status})`);
      }
    } catch {
      setError('Network error. Failed to create scenario');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/home" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scenarios</h2>
          <p className="text-sm text-muted-foreground">Financial modelling and scenario analysis</p>
        </div>
        {canCreate && (
          <Link href="/scenarios/compare" className="rounded border px-3 py-2 text-sm hover:bg-muted">
            Compare Scenarios
          </Link>
        )}
      </div>

      {scenarios.length === 0 && !canCreate && (
        <p className="text-sm text-muted-foreground">No scenarios created yet.</p>
      )}

      <div className="grid gap-4">
        {scenarios.map((s) => (
          <Link
            key={s.id}
            href={`/scenarios/${s.id}`}
            className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{s.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[s.status] ?? ''}`}>
                  {s.status}
                </span>
                {s.is_base && (
                  <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-medium">base</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
              {s.assumption_sets && (
                <p className="text-xs text-muted-foreground mt-1">
                  {s.assumption_sets.base_period_start.slice(0, 7)} to {s.assumption_sets.base_period_end.slice(0, 7)} + {s.assumption_sets.forecast_horizon_months}mo forecast
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(s.created_at).toLocaleDateString()}
            </span>
          </Link>
        ))}
      </div>

      {canCreate && (
        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-3">Create New Scenario</h3>
          {availablePeriods.length > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
              <span>Xero data available: {availablePeriods[0].slice(0, 7)} to {availablePeriods[availablePeriods.length - 1].slice(0, 7)} ({availablePeriods.length} months)</span>
              <button
                type="button"
                onClick={() => setForm({
                  ...form,
                  basePeriodStart: availablePeriods[0].slice(0, 7),
                  basePeriodEnd: availablePeriods[availablePeriods.length - 1].slice(0, 7),
                })}
                className="ml-auto rounded border border-blue-300 bg-white px-2 py-0.5 text-xs font-medium hover:bg-blue-100"
              >
                Use as base period
              </button>
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded border px-2 py-1 text-sm"
                  placeholder="e.g. Base Case 2024"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded border px-2 py-1 text-sm"
                  placeholder="Brief description"
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
              <div>
                <label className="text-xs font-medium">Forecast Horizon (months)</label>
                <input
                  value={form.forecastHorizonMonths}
                  onChange={(e) => setForm({ ...form, forecastHorizonMonths: parseInt(e.target.value) || 12 })}
                  type="number"
                  min={1}
                  max={60}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isBase}
                    onChange={(e) => setForm({ ...form, isBase: e.target.checked })}
                  />
                  Set as base scenario
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Scenario'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </div>
      )}

      {canCreate && availablePeriods.length > 0 && (
        <ChatScenarioLauncher availablePeriods={availablePeriods} />
      )}
    </div>
  );
}
