'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/providers/user-context';

// ============================================================
// Types
// ============================================================

interface AlertRule {
  id: string;
  metric_key: string;
  metric_label: string;
  condition: string;
  threshold: number;
  severity: string;
  enabled: boolean;
  created_at: string;
}

const CONDITION_LABELS: Record<string, string> = {
  above: 'goes above',
  below: 'drops below',
  change_above: 'increases by more than',
  change_below: 'decreases by more than',
};

const SEVERITY_COLOURS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-800',
};

// Common KPI metrics that can be alerted on
const AVAILABLE_METRICS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'gross_profit', label: 'Gross Profit' },
  { key: 'gross_margin', label: 'Gross Margin (%)' },
  { key: 'net_profit', label: 'Net Profit' },
  { key: 'net_margin', label: 'Net Margin (%)' },
  { key: 'operating_expenses', label: 'Operating Expenses' },
  { key: 'cash_position', label: 'Cash Position' },
  { key: 'burn_rate', label: 'Monthly Burn Rate' },
  { key: 'runway_months', label: 'Runway (months)' },
  { key: 'revenue_growth', label: 'Revenue Growth (%)' },
  { key: 'expense_ratio', label: 'Expense Ratio (%)' },
  { key: 'current_ratio', label: 'Current Ratio' },
];

// ============================================================
// Component
// ============================================================

export default function DashboardAlertsPage() {
  const { role } = useUser();
  const canEdit = role === 'admin' || role === 'owner' || role === 'advisor';

  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [metricKey, setMetricKey] = useState(AVAILABLE_METRICS[0].key);
  const [condition, setCondition] = useState('below');
  const [threshold, setThreshold] = useState('');
  const [severity, setSeverity] = useState('warning');
  const [submitting, setSubmitting] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch('/api/kpi/alerts');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules);
      }
    } catch {
      console.error('Failed to fetch alert rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    const metric = AVAILABLE_METRICS.find((m) => m.key === metricKey);
    if (!metric || !threshold) {
      setError('Please fill in all fields');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/kpi/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricKey: metric.key,
          metricLabel: metric.label,
          condition,
          threshold: parseFloat(threshold),
          severity,
        }),
      });

      if (res.ok) {
        setSuccess('Alert rule created');
        setShowForm(false);
        setThreshold('');
        fetchRules();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create alert rule');
      }
    } catch {
      setError('Failed to create alert rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (ruleId: string, enabled: boolean) => {
    try {
      await fetch(`/api/kpi/alerts/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      fetchRules();
    } catch {
      setError('Failed to update rule');
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Delete this alert rule?')) return;
    try {
      const res = await fetch(`/api/kpi/alerts/${ruleId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRules();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete');
      }
    } catch {
      setError('Failed to delete');
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Dashboard
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1c1b1b' }}>KPI Alerts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Get notified when KPIs cross your configured thresholds.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {showForm ? 'Cancel' : 'New Alert Rule'}
          </button>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Create Alert Rule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">KPI Metric</label>
              <select
                value={metricKey}
                onChange={(e) => setMetricKey(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                {AVAILABLE_METRICS.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="above">Goes above</option>
                <option value="below">Drops below</option>
                <option value="change_above">Increases by more than (%)</option>
                <option value="change_below">Decreases by more than (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Threshold Value</label>
              <input
                type="number"
                step="any"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="e.g. 10000 or 15"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      )}

      {/* Rules List */}
      {loading ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading alert rules...
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No Alert Rules</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Create your first alert rule to get notified when KPIs cross important thresholds.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                {/* Toggle */}
                <button
                  onClick={() => canEdit && handleToggle(rule.id, rule.enabled)}
                  disabled={!canEdit}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    rule.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      rule.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>

                <div>
                  <p className="text-sm font-medium">
                    {rule.metric_label}{' '}
                    <span className="text-muted-foreground font-normal">
                      {CONDITION_LABELS[rule.condition] ?? rule.condition}
                    </span>{' '}
                    <span className="font-semibold">
                      {rule.condition.startsWith('change_') ? `${rule.threshold}%` : rule.threshold.toLocaleString()}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLOURS[rule.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                      {rule.severity}
                    </span>
                    {!rule.enabled && (
                      <span className="text-xs text-muted-foreground">Paused</span>
                    )}
                  </div>
                </div>
              </div>

              {canEdit && (
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-2">How KPI Alerts Work</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>Alert rules are checked after each Xero sync and when KPIs are recalculated.</li>
          <li>When a threshold is breached, you receive an in-app notification and an email (if enabled in Preferences).</li>
          <li>Critical alerts are always sent immediately. Info and warning alerts are batched daily.</li>
        </ul>
      </div>
    </div>
  );
}
