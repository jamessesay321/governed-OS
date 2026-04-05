'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  BarChart3,
  Calculator,
  DollarSign,
  Percent,
  Hash,
  Divide,
  AlertTriangle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CustomKPI {
  id: string;
  key: string;
  label: string;
  description: string;
  format: string;
  higher_is_better: boolean;
  formula_numerator: string;
  formula_denominator: string;
  target_value: number | null;
  alert_threshold: number | null;
  alert_direction: string | null;
  created_at: string;
}

interface FormData {
  label: string;
  key: string;
  description: string;
  format: string;
  higher_is_better: boolean;
  formula_numerator: string;
  formula_denominator: string;
  target_value: string;
  alert_threshold: string;
  alert_direction: string;
}

const EMPTY_FORM: FormData = {
  label: '',
  key: '',
  description: '',
  format: 'number',
  higher_is_better: true,
  formula_numerator: '',
  formula_denominator: '',
  target_value: '',
  alert_threshold: '',
  alert_direction: 'below',
};

/* ------------------------------------------------------------------ */
/*  Account class options for formulas                                 */
/* ------------------------------------------------------------------ */

const ACCOUNT_CLASSES = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'cost_of_sales', label: 'Cost of Sales' },
  { value: 'operating_expenses', label: 'Operating Expenses' },
  { value: 'gross_profit', label: 'Gross Profit' },
  { value: 'net_profit', label: 'Net Profit' },
  { value: 'current_assets', label: 'Current Assets' },
  { value: 'current_liabilities', label: 'Current Liabilities' },
  { value: 'accounts_receivable', label: 'Accounts Receivable' },
  { value: 'accounts_payable', label: 'Accounts Payable' },
  { value: 'cash_position', label: 'Cash Position' },
  { value: 'total_debt', label: 'Total Debt' },
];

const FORMAT_OPTIONS = [
  { value: 'currency', label: 'Currency', icon: DollarSign },
  { value: 'percentage', label: 'Percentage', icon: Percent },
  { value: 'ratio', label: 'Ratio', icon: Divide },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'days', label: 'Days', icon: Hash },
  { value: 'months', label: 'Months', icon: Hash },
];

const FORMAT_ICONS: Record<string, React.ElementType> = {
  currency: DollarSign,
  percentage: Percent,
  ratio: Divide,
  number: Hash,
  days: Hash,
  months: Hash,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 64);
}

function getAccountLabel(value: string): string {
  return ACCOUNT_CLASSES.find(a => a.value === value)?.label ?? value;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface CustomKPIsClientProps {
  orgId: string;
  role: string;
  initialKPIs: CustomKPI[];
}

export function CustomKPIsClient({ orgId, role, initialKPIs }: CustomKPIsClientProps) {
  const [kpis, setKPIs] = useState<CustomKPI[]>(initialKPIs);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = role === 'admin' || role === 'owner';

  function openCreateDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(kpi: CustomKPI) {
    setEditingId(kpi.id);
    setForm({
      label: kpi.label,
      key: kpi.key,
      description: kpi.description || '',
      format: kpi.format,
      higher_is_better: kpi.higher_is_better,
      formula_numerator: kpi.formula_numerator,
      formula_denominator: kpi.formula_denominator || '',
      target_value: kpi.target_value !== null ? String(kpi.target_value) : '',
      alert_threshold: kpi.alert_threshold !== null ? String(kpi.alert_threshold) : '',
      alert_direction: kpi.alert_direction || 'below',
    });
    setError(null);
    setDialogOpen(true);
  }

  function handleLabelChange(label: string) {
    setForm(prev => ({
      ...prev,
      label,
      key: editingId ? prev.key : slugify(label),
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        label: form.label,
        key: form.key,
        description: form.description,
        format: form.format,
        higher_is_better: form.higher_is_better,
        formula_numerator: form.formula_numerator,
        formula_denominator: form.formula_denominator,
      };

      if (form.target_value) payload.target_value = parseFloat(form.target_value);
      if (form.alert_threshold) payload.alert_threshold = parseFloat(form.alert_threshold);
      if (form.alert_threshold) payload.alert_direction = form.alert_direction;

      if (editingId) {
        payload.id = editingId;
        const res = await fetch(`/api/kpi/custom/${orgId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Update failed (${res.status})`);
        }

        const { kpi: updated } = await res.json();
        setKPIs(prev => prev.map(k => (k.id === editingId ? updated : k)));
      } else {
        const res = await fetch(`/api/kpi/custom/${orgId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Create failed (${res.status})`);
        }

        const { kpi: created } = await res.json();
        setKPIs(prev => [...prev, created]);
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteDialog(id: string) {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deletingId) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/kpi/custom/${orgId}?id=${deletingId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Delete failed (${res.status})`);
      }

      setKPIs(prev => prev.filter(k => k.id !== deletingId));
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSubmitting(false);
    }
  }

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
          <h2 className="text-2xl font-bold">Custom KPIs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create your own KPI formulas beyond the 30+ pre-built metrics.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Create KPI
          </Button>
        )}
      </div>

      {/* Error */}
      {error && !dialogOpen && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Empty state */}
      {kpis.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Create Custom KPIs</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Beyond the 30+ pre-built KPIs, create your own using custom formulas.
              Define calculations based on any financial data in your account.
            </p>
            {isAdmin && (
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First KPI
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Custom KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {kpis.map(kpi => {
          const FormatIcon = FORMAT_ICONS[kpi.format] || BarChart3;
          const hasFormula = kpi.formula_numerator && kpi.formula_denominator;

          return (
            <Card key={kpi.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg p-2 bg-indigo-100 dark:bg-indigo-950">
                      <FormatIcon className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
                      <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5 font-mono">
                        {kpi.key}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {kpi.format}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Description */}
                {kpi.description && (
                  <p className="text-sm text-muted-foreground">{kpi.description}</p>
                )}

                {/* Formula */}
                <div className="rounded-md bg-muted/50 p-3">
                  <span className="text-xs text-muted-foreground font-medium block mb-1">Formula</span>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="rounded bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-blue-700 dark:text-blue-300">
                      {getAccountLabel(kpi.formula_numerator)}
                    </span>
                    {hasFormula && (
                      <>
                        <Divide className="h-3 w-3 text-muted-foreground" />
                        <span className="rounded bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                          {getAccountLabel(kpi.formula_denominator)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Targets & metadata */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {kpi.target_value !== null && (
                    <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                      Target: {kpi.target_value}
                    </Badge>
                  )}
                  {kpi.alert_threshold !== null && (
                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Alert: {kpi.alert_threshold}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {kpi.higher_is_better ? 'Higher is better' : 'Lower is better'}
                  </Badge>
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(kpi)}
                      className="gap-1 text-xs"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(kpi.id)}
                      className="gap-1 text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Custom KPI' : 'Create Custom KPI'}</DialogTitle>
            <DialogDescription>
              Define a custom metric formula using your financial data classes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Error inside dialog */}
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Label */}
            <div>
              <Label htmlFor="kpi-label">KPI Label</Label>
              <Input
                id="kpi-label"
                placeholder="e.g. Revenue per Employee"
                value={form.label}
                onChange={e => handleLabelChange(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Key (auto-generated) */}
            <div>
              <Label htmlFor="kpi-key">KPI Key</Label>
              <Input
                id="kpi-key"
                value={form.key}
                onChange={e => setForm(prev => ({ ...prev, key: e.target.value }))}
                placeholder="auto_generated_from_label"
                className="mt-1 font-mono text-sm"
                disabled={!!editingId}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Lowercase snake_case identifier. Auto-generated from label.
              </p>
            </div>

            {/* Formula */}
            <div className="space-y-3">
              <Label>Formula</Label>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div>
                  <span className="text-xs text-muted-foreground mb-1 block">Numerator</span>
                  <Select
                    value={form.formula_numerator}
                    onValueChange={v => setForm(prev => ({ ...prev, formula_numerator: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_CLASSES.map(ac => (
                        <SelectItem key={ac.value} value={ac.value}>
                          {ac.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Divide className="h-5 w-5 text-muted-foreground mt-5" />
                <div>
                  <span className="text-xs text-muted-foreground mb-1 block">Denominator (optional)</span>
                  <Select
                    value={form.formula_denominator}
                    onValueChange={v => setForm(prev => ({ ...prev, formula_denominator: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_CLASSES.map(ac => (
                        <SelectItem key={ac.value} value={ac.value}>
                          {ac.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.formula_numerator && (
                <div className="rounded-md bg-muted/50 p-2 text-sm">
                  <span className="text-muted-foreground">Preview: </span>
                  <span className="font-medium">{getAccountLabel(form.formula_numerator)}</span>
                  {form.formula_denominator && (
                    <>
                      <span className="text-muted-foreground"> / </span>
                      <span className="font-medium">{getAccountLabel(form.formula_denominator)}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Format */}
            <div>
              <Label>Format</Label>
              <Select
                value={form.format}
                onValueChange={v => setForm(prev => ({ ...prev, format: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Higher is better toggle */}
            <div className="flex items-center gap-3">
              <Label htmlFor="higher-is-better" className="cursor-pointer">
                Higher values are better
              </Label>
              <button
                id="higher-is-better"
                type="button"
                role="switch"
                aria-checked={form.higher_is_better}
                onClick={() => setForm(prev => ({ ...prev, higher_is_better: !prev.higher_is_better }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  form.higher_is_better ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.higher_is_better ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Target + Threshold */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="kpi-target">Target Value (optional)</Label>
                <Input
                  id="kpi-target"
                  type="number"
                  step="any"
                  placeholder="e.g. 50000"
                  value={form.target_value}
                  onChange={e => setForm(prev => ({ ...prev, target_value: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="kpi-alert">Alert Threshold (optional)</Label>
                <Input
                  id="kpi-alert"
                  type="number"
                  step="any"
                  placeholder="Warn at..."
                  value={form.alert_threshold}
                  onChange={e => setForm(prev => ({ ...prev, alert_threshold: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="kpi-desc">Description</Label>
              <textarea
                id="kpi-desc"
                placeholder="What does this KPI measure?"
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
                maxLength={512}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.label || !form.key || !form.formula_numerator}
            >
              {submitting ? 'Saving...' : editingId ? 'Update KPI' : 'Create KPI'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Custom KPI</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this custom KPI? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
