'use client';

import { useState } from 'react';
import type { AssumptionValue } from '@/types';

type Props = {
  assumptionSetId: string;
  values: AssumptionValue[];
  onValueAdded?: () => void;
};

export function AssumptionEditor({ assumptionSetId, values, onValueAdded }: Props) {
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    category: 'growth_rates' as string,
    key: '',
    label: '',
    type: 'percentage' as string,
    value: '',
    effectiveFrom: '',
    effectiveTo: '',
  });

  const grouped = values.reduce<Record<string, AssumptionValue[]>>((acc, v) => {
    const cat = v.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(v);
    return acc;
  }, {});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/scenarios/assumption-sets/${assumptionSetId}/values`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          value: parseFloat(form.value),
          effectiveTo: form.effectiveTo || null,
        }),
      });

      if (res.ok) {
        setAdding(false);
        setForm({ category: 'growth_rates', key: '', label: '', type: 'percentage', value: '', effectiveFrom: '', effectiveTo: '' });
        onValueAdded?.();
      }
    } finally {
      setLoading(false);
    }
  }

  const categories = ['revenue_drivers', 'pricing', 'costs', 'growth_rates', 'headcount', 'marketing', 'capital', 'custom'];
  const types = ['percentage', 'currency', 'integer', 'boolean', 'decimal'];

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h4 className="text-sm font-medium capitalize mb-2">{category.replace(/_/g, ' ')}</h4>
          <div className="space-y-1">
            {items.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{v.label}</span>
                  <span className="ml-2 text-muted-foreground">({v.key})</span>
                </div>
                <div className="text-right">
                  <span className="font-mono">
                    {v.type === 'percentage' ? `${(v.value * 100).toFixed(1)}%` : v.value.toLocaleString()}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    from {v.effective_from.slice(0, 7)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {values.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">No assumptions configured yet.</p>
      )}

      {adding ? (
        <form onSubmit={handleSubmit} className="space-y-3 rounded border p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded border px-2 py-1 text-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded border px-2 py-1 text-sm"
              >
                {types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Key</label>
              <input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                className="w-full rounded border px-2 py-1 text-sm"
                placeholder="e.g. revenue_growth_rate"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium">Label</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full rounded border px-2 py-1 text-sm"
                placeholder="e.g. Revenue Growth Rate"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium">Value</label>
              <input
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                type="number"
                step="any"
                className="w-full rounded border px-2 py-1 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium">Effective From</label>
              <input
                value={form.effectiveFrom}
                onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                type="date"
                className="w-full rounded border px-2 py-1 text-sm"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground">
              {loading ? 'Adding...' : 'Add Value'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="rounded border px-3 py-1 text-sm">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="rounded border px-3 py-1 text-sm hover:bg-muted">
          + Add Assumption
        </button>
      )}
    </div>
  );
}
