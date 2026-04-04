'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Info, AlertTriangle, AlertCircle, Trash2, Plus, X } from 'lucide-react';
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

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; icon: typeof Info; label: string }> = {
  info: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Info, label: 'Info' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-800', icon: AlertTriangle, label: 'Warning' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle, label: 'Critical' },
};

// Keep backward compat
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
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-muted-foreground" />
            KPI Alerts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Get notified when KPIs cross your configured thresholds.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {showForm ? (<><X className="h-4 w-4 mr-1 inline" />Cancel</>) : (<><Plus className="h-4 w-4 mr-1 inline" />New Alert Rule</>)}
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
            <Bell className="h-6 w-6 text-primary" />
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
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const sev = SEVERITY_CONFIG[rule.severity];
                      if (!sev) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{rule.severity}</span>;
                      const SevIcon = sev.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sev.bg} ${sev.text}`}>
                          <SevIcon className="h-3 w-3" />
                          {sev.label}
                        </span>
                      );
                    })()}
                    {!rule.enabled && (
                      <span className="text-xs text-muted-foreground italic">Paused</span>
                    )}
                  </div>
                </div>
              </div>

              {canEdit && (
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
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
