'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Save,
  Target,
  DollarSign,
  Percent,
  TrendingUp,
  Receipt,
  PiggyBank,
  BarChart3,
  Wallet,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { CalculatedKPI } from '@/lib/kpi/format';

/* ------------------------------------------------------------------ */
/*  Icon config (reused from kpi-grid.tsx)                            */
/* ------------------------------------------------------------------ */

const KPI_ICON_CONFIG: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  revenue: { icon: DollarSign, bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-600' },
  total_revenue: { icon: DollarSign, bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-600' },
  gross_margin: { icon: Percent, bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-600' },
  net_margin: { icon: Percent, bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-600' },
  gross_profit: { icon: TrendingUp, bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-600' },
  expenses: { icon: Receipt, bg: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-600' },
  operating_expenses: { icon: Receipt, bg: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-600' },
  net_profit: { icon: PiggyBank, bg: 'bg-violet-100 dark:bg-violet-950', text: 'text-violet-600' },
  operating_profit: { icon: PiggyBank, bg: 'bg-violet-100 dark:bg-violet-950', text: 'text-violet-600' },
  current_ratio: { icon: Target, bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-600' },
  quick_ratio: { icon: Target, bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-600' },
  cash_position: { icon: Wallet, bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-600' },
};

const DEFAULT_ICON_CONFIG = { icon: BarChart3, bg: 'bg-slate-100 dark:bg-slate-900', text: 'text-slate-600' };

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AlertRule {
  id: string;
  metric_key: string;
  metric_label: string;
  condition: string;
  threshold: number;
  severity: string;
  enabled: boolean;
}

interface CustomKPI {
  id: string;
  key: string;
  label: string;
  target_value?: number | null;
  alert_threshold?: number | null;
  alert_direction?: string | null;
  format: string;
}

interface TargetEntry {
  targetValue: string;
  alertThreshold: string;
}

interface KPITargetsClientProps {
  orgId: string;
  kpis: CalculatedKPI[];
  period: string;
  customKPIs: CustomKPI[];
  alertRules: AlertRule[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getStatus(
  current: number | null,
  target: number | null,
  threshold: number | null,
  higherIsBetter: boolean,
): 'on_track' | 'at_risk' | 'off_track' | 'no_target' {
  if (target === null || current === null) return 'no_target';

  const progress = higherIsBetter ? current / target : target / current;

  if (progress >= 1) return 'on_track';
  if (threshold !== null) {
    const thresholdProgress = higherIsBetter
      ? current / threshold
      : threshold / current;
    if (thresholdProgress >= 1) return 'at_risk';
  } else if (progress >= 0.8) {
    return 'at_risk';
  }
  return 'off_track';
}

function getProgressPercent(
  current: number | null,
  target: number | null,
  higherIsBetter: boolean,
): number {
  if (target === null || current === null || target === 0) return 0;
  const pct = higherIsBetter ? (current / target) * 100 : (target / current) * 100;
  return Math.min(Math.max(pct, 0), 120); // cap at 120% for visual
}

const STATUS_CONFIG = {
  on_track: { label: 'On Track', color: 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950', barColor: 'bg-green-500', icon: CheckCircle },
  at_risk: { label: 'At Risk', color: 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950', barColor: 'bg-amber-500', icon: AlertTriangle },
  off_track: { label: 'Off Track', color: 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950', barColor: 'bg-red-500', icon: XCircle },
  no_target: { label: 'No Target', color: 'border-slate-300 text-slate-500 bg-slate-50 dark:bg-slate-900', barColor: 'bg-slate-300', icon: Target },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function KPITargetsClient({
  orgId,
  kpis,
  period,
  customKPIs,
  alertRules,
}: KPITargetsClientProps) {
  // Build initial targets from existing alert rules + custom KPI targets
  const buildInitialTargets = useCallback((): Record<string, TargetEntry> => {
    const targets: Record<string, TargetEntry> = {};

    // From alert rules
    for (const rule of alertRules) {
      if (!targets[rule.metric_key]) {
        targets[rule.metric_key] = { targetValue: '', alertThreshold: '' };
      }
      if (rule.condition === 'above' || rule.condition === 'below') {
        targets[rule.metric_key].alertThreshold = String(rule.threshold);
      }
    }

    // From custom KPIs that have targets
    for (const ck of customKPIs) {
      if (ck.target_value !== null && ck.target_value !== undefined) {
        if (!targets[ck.key]) {
          targets[ck.key] = { targetValue: '', alertThreshold: '' };
        }
        targets[ck.key].targetValue = String(ck.target_value);
      }
      if (ck.alert_threshold !== null && ck.alert_threshold !== undefined) {
        if (!targets[ck.key]) {
          targets[ck.key] = { targetValue: '', alertThreshold: '' };
        }
        targets[ck.key].alertThreshold = String(ck.alert_threshold);
      }
    }

    return targets;
  }, [alertRules, customKPIs]);

  const [targets, setTargets] = useState<Record<string, TargetEntry>>(buildInitialTargets);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTargetChange(kpiKey: string, field: 'targetValue' | 'alertThreshold', value: string) {
    setTargets(prev => ({
      ...prev,
      [kpiKey]: {
        ...prev[kpiKey] ?? { targetValue: '', alertThreshold: '' },
        [field]: value,
      },
    }));
    setSaveSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Save targets as alert rules for each KPI that has a threshold set
      const promises: Promise<Response>[] = [];

      for (const kpi of kpis) {
        const entry = targets[kpi.key];
        if (!entry) continue;

        const threshold = parseFloat(entry.alertThreshold);
        if (isNaN(threshold)) continue;

        // Determine condition based on higher_is_better
        const condition = kpi.higher_is_better ? 'below' : 'above';

        promises.push(
          fetch('/api/kpi/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metricKey: kpi.key,
              metricLabel: kpi.label,
              condition,
              threshold,
              severity: 'warning',
              enabled: true,
            }),
          })
        );
      }

      // Save target values for custom KPIs
      for (const ck of customKPIs) {
        const entry = targets[ck.key];
        if (!entry) continue;

        const targetValue = parseFloat(entry.targetValue);
        const alertThreshold = parseFloat(entry.alertThreshold);

        const updates: Record<string, unknown> = { id: ck.id };
        if (!isNaN(targetValue)) updates.target_value = targetValue;
        if (!isNaN(alertThreshold)) updates.alert_threshold = alertThreshold;

        if (Object.keys(updates).length > 1) {
          promises.push(
            fetch(`/api/kpi/custom/${orgId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            })
          );
        }
      }

      const results = await Promise.allSettled(promises);
      const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));

      if (failures.length > 0) {
        setError(`Saved with ${failures.length} error(s). Some targets may have already existed.`);
      } else {
        setSaveSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save targets');
    } finally {
      setSaving(false);
    }
  }

  // Filter to KPIs that have a numeric value
  const validKPIs = kpis.filter(k => k.value !== null);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/kpi"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          KPIs
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">KPI Targets</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set target values and alert thresholds for each KPI to track your progress.
            {period && <span className="ml-1 font-medium">Period: {period}</span>}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Targets'}
        </Button>
      </div>

      {/* Status messages */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {saveSuccess && (
        <div className="rounded-lg border border-green-500 bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700">
          Targets saved successfully.
        </div>
      )}

      {/* Empty state */}
      {validKPIs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No KPI Data Available</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Connect your accounting data and sync to see KPIs here. Once KPIs are calculated, you can set targets for each one.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI Target Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {validKPIs.map(kpi => {
          const config = KPI_ICON_CONFIG[kpi.key] || DEFAULT_ICON_CONFIG;
          const Icon = config.icon;
          const entry = targets[kpi.key] ?? { targetValue: '', alertThreshold: '' };
          const targetNum = parseFloat(entry.targetValue) || null;
          const thresholdNum = parseFloat(entry.alertThreshold) || null;
          const status = getStatus(kpi.value, targetNum, thresholdNum, kpi.higher_is_better);
          const statusCfg = STATUS_CONFIG[status];
          const StatusIcon = statusCfg.icon;
          const progress = getProgressPercent(kpi.value, targetNum, kpi.higher_is_better);

          return (
            <Card key={kpi.key} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${config.bg}`}>
                      <Icon className={`h-4 w-4 ${config.text}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
                      {kpi.plainEnglish && (
                        <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5">
                          {kpi.plainEnglish}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusCfg.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current value */}
                <div>
                  <span className="text-xs text-muted-foreground">Current Value</span>
                  <div className="text-xl font-bold">{kpi.formatted_value}</div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{targetNum !== null ? `${Math.round(progress)}%` : '--'}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${statusCfg.barColor}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  {progress > 100 && targetNum !== null && (
                    <p className="text-[10px] text-green-600 mt-0.5">Exceeding target by {Math.round(progress - 100)}%</p>
                  )}
                </div>

                {/* Input fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`target-${kpi.key}`} className="text-xs">
                      Target {kpi.format === 'percentage' ? '(decimal)' : kpi.format === 'currency' ? '(pence)' : ''}
                    </Label>
                    <Input
                      id={`target-${kpi.key}`}
                      type="number"
                      step="any"
                      placeholder="e.g. 100000"
                      value={entry.targetValue}
                      onChange={e => handleTargetChange(kpi.key, 'targetValue', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`threshold-${kpi.key}`} className="text-xs">
                      Alert Threshold
                    </Label>
                    <Input
                      id={`threshold-${kpi.key}`}
                      type="number"
                      step="any"
                      placeholder="Warning at..."
                      value={entry.alertThreshold}
                      onChange={e => handleTargetChange(kpi.key, 'alertThreshold', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom KPI targets section */}
      {customKPIs.length > 0 && (
        <>
          <div className="pt-4">
            <h3 className="text-lg font-semibold">Custom KPI Targets</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Set targets for your custom-defined KPIs.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {customKPIs.map(ck => {
              const entry = targets[ck.key] ?? { targetValue: '', alertThreshold: '' };
              return (
                <Card key={ck.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg p-2 bg-indigo-100 dark:bg-indigo-950">
                        <BarChart3 className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium">{ck.label}</CardTitle>
                        <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5">
                          Custom KPI ({ck.format})
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`target-custom-${ck.key}`} className="text-xs">Target Value</Label>
                        <Input
                          id={`target-custom-${ck.key}`}
                          type="number"
                          step="any"
                          placeholder="Target"
                          value={entry.targetValue}
                          onChange={e => handleTargetChange(ck.key, 'targetValue', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`threshold-custom-${ck.key}`} className="text-xs">Alert Threshold</Label>
                        <Input
                          id={`threshold-custom-${ck.key}`}
                          type="number"
                          step="any"
                          placeholder="Warning at..."
                          value={entry.alertThreshold}
                          onChange={e => handleTargetChange(ck.key, 'alertThreshold', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
