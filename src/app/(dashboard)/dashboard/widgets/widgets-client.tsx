'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/components/providers/currency-context';
import {
  WIDGET_REGISTRY,
  type WidgetType,
} from '@/lib/dashboard/templates';
import {
  FULL_WIDGET_REGISTRY,
  ALL_EXTENDED_WIDGET_TYPES,
  type ExtendedWidgetType,
} from '@/lib/dashboard/widget-registry';
import {
  WidgetTemplateSelector,
  ENHANCED_TEMPLATES,
  type WidgetTemplate,
} from '@/components/dashboard/widget-template-selector';
import {
  User,
  Briefcase,
  TrendingUp,
  BookOpen,
  LayoutGrid,
} from 'lucide-react';

// New widget component imports
import { DebtMaturityWidget } from '@/components/dashboard/widgets/debt-maturity-widget';
import { WorkingCapitalWidget } from '@/components/dashboard/widgets/working-capital-widget';
import { HeadcountCostWidget } from '@/components/dashboard/widgets/headcount-cost-widget';
import { RevenueConcentrationWidget } from '@/components/dashboard/widgets/revenue-concentration-widget';
import { MarginTrendWidget } from '@/components/dashboard/widgets/margin-trend-widget';
import { RunwayWidget } from '@/components/dashboard/widgets/runway-widget';
import { TopCustomersWidget } from '@/components/dashboard/widgets/top-customers-widget';
import { TopExpensesWidget } from '@/components/dashboard/widgets/top-expenses-widget';
import { BudgetVarianceWidget } from '@/components/dashboard/widgets/budget-variance-widget';
import { PayrollSummaryWidget } from '@/components/dashboard/widgets/payroll-summary-widget';
import { SeasonalPatternWidget } from '@/components/dashboard/widgets/seasonal-pattern-widget';
import { GrowthMetricsWidget } from '@/components/dashboard/widgets/growth-metrics-widget';
import { IndustryBenchmarkWidget } from '@/components/dashboard/widgets/industry-benchmark-widget';
import { AlertSummaryWidget } from '@/components/dashboard/widgets/alert-summary-widget';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WidgetsClientProps {
  connected: boolean;
  revenueTrend: Array<{ period: string; revenue: number }>;
  pnlSummary: Array<{ name: string; value: number }>;
  cashTrend: Array<{ period: string; cash: number }>;
  expenseBreakdown: Array<{ name: string; value: number; color: string }>;
  kpis: Array<{ label: string; value: string; color: string }>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatPeriodLabel(period: string): string {
  const d = new Date(period + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

/* ------------------------------------------------------------------ */
/*  Toggle switch component                                           */
/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
      />
      <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-indigo-500 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Template icon map                                                  */
/* ------------------------------------------------------------------ */

const TEMPLATE_ICONS: Record<string, typeof User> = {
  owner: User,
  advisor: Briefcase,
  investor: TrendingUp,
  bookkeeper: BookOpen,
};

/* ------------------------------------------------------------------ */
/*  Widget render functions (keyed by ExtendedWidgetType)               */
/* ------------------------------------------------------------------ */

type WidgetRenderer = (
  props: WidgetsClientProps,
  format: (n: number) => string
) => React.ReactNode;

function placeholderRender(label: string): WidgetRenderer {
  return () => (
    <div className="flex items-center justify-center py-8">
      <p className="text-xs text-muted-foreground">{label} preview</p>
    </div>
  );
}

const widgetRenderers: Record<ExtendedWidgetType, WidgetRenderer> = {
  revenue_trend: (props, format) => {
    const data = props.revenueTrend.map((r) => ({
      label: formatPeriodLabel(r.period),
      revenue: r.revenue,
    }));
    if (data.length === 0) {
      return (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No revenue data
        </p>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={150}>
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v: number) => format(v)}
          />
          <Tooltip
            formatter={(v) => [format(Number(v ?? 0)), 'Revenue']}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    );
  },

  pnl_table: (props, format) => {
    if (props.pnlSummary.length === 0) {
      return (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No P&L data
        </p>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={150}>
        <BarChart
          data={props.pnlSummary}
          margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v: number) => format(v)}
          />
          <Tooltip formatter={(v) => [format(Number(v ?? 0))]} />
          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  },

  cash_forecast: (props, format) => {
    const data = props.cashTrend.map((c) => ({
      label: formatPeriodLabel(c.period),
      cash: c.cash,
    }));
    if (data.length === 0) {
      return (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No cash data
        </p>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={150}>
        <RechartsAreaChart
          data={data}
          margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v: number) => format(v)}
          />
          <Tooltip
            formatter={(v) => [format(Number(v ?? 0)), 'Cash']}
          />
          <Area
            type="monotone"
            dataKey="cash"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#cashGrad)"
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    );
  },

  kpi_cards: (props) => {
    if (props.kpis.length === 0) {
      return (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No KPI data
        </p>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-2 py-2">
        {props.kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-lg px-3 py-2 text-center ${k.color}`}
          >
            <p className="text-lg font-bold leading-tight">{k.value}</p>
            <p className="text-[10px] font-medium opacity-80">{k.label}</p>
          </div>
        ))}
      </div>
    );
  },

  expense_breakdown: (props) => {
    if (props.expenseBreakdown.length === 0) {
      return (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No expense data
        </p>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <ResponsiveContainer width="55%" height={150}>
          <RechartsPieChart>
            <Pie
              data={props.expenseBreakdown}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={55}
              innerRadius={30}
              paddingAngle={2}
            >
              {props.expenseBreakdown.map((e) => (
                <Cell key={e.name} fill={e.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [`${Number(v ?? 0)}%`]} />
          </RechartsPieChart>
        </ResponsiveContainer>
        <ul className="flex flex-col gap-1 text-[11px]">
          {props.expenseBreakdown.map((e) => (
            <li key={e.name} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: e.color }}
              />
              <span className="text-muted-foreground">{e.name}</span>
              <span className="font-medium">{e.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    );
  },

  narrative_summary: placeholderRender('AI Narrative Summary'),
  waterfall_chart: placeholderRender('Waterfall Chart'),
  variance_summary: placeholderRender('Variance Analysis'),
  data_freshness: placeholderRender('Data Freshness'),
  tax_summary: placeholderRender('Tax Summary'),
  ar_ap_aging: placeholderRender('AR/AP Aging'),
  custom_kpis: placeholderRender('Custom KPIs'),

  // ── New F-069/070 widget renderers ──
  debt_maturity: () => <DebtMaturityWidget />,
  working_capital: () => <WorkingCapitalWidget />,
  headcount_cost: () => <HeadcountCostWidget />,
  revenue_concentration: () => <RevenueConcentrationWidget />,
  margin_trend: () => <MarginTrendWidget />,
  runway: () => <RunwayWidget />,
  top_customers: () => <TopCustomersWidget />,
  top_expenses: () => <TopExpensesWidget />,
  budget_variance: () => <BudgetVarianceWidget />,
  payroll_summary: () => <PayrollSummaryWidget />,
  seasonal_pattern: () => <SeasonalPatternWidget />,
  growth_metrics: () => <GrowthMetricsWidget />,
  industry_benchmark: () => <IndustryBenchmarkWidget />,
  alert_summary: () => <AlertSummaryWidget />,
};

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */

export default function WidgetsClient(props: WidgetsClientProps) {
  const { format } = useCurrency();
  const hasData =
    props.revenueTrend.length > 0 || props.pnlSummary.length > 0;

  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_EXTENDED_WIDGET_TYPES.map((w) => [w, true]))
  );
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load saved config from API on mount
  useEffect(() => {
    let cancelled = false;
    async function loadConfig() {
      try {
        const res = await fetch('/api/dashboard/widget-config');
        if (res.ok) {
          const { config } = await res.json();
          if (config && !cancelled) {
            const savedWidgets = new Set(config.widgets as string[]);
            const newEnabled: Record<string, boolean> = {};
            for (const wt of ALL_EXTENDED_WIDGET_TYPES) {
              newEnabled[wt] = savedWidgets.has(wt);
            }
            setEnabled(newEnabled);
            setActiveTemplate(config.template_name ?? null);
          }
        }
      } catch {
        // Fall back to all enabled
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    loadConfig();
    return () => { cancelled = true; };
  }, []);

  // Save config to API when enabled state changes (after initial load)
  const saveConfig = useCallback(async (widgetState: Record<string, boolean>, templateName: string | null) => {
    if (!loaded) return;
    setSaving(true);
    try {
      const widgets = Object.entries(widgetState)
        .filter(([, v]) => v)
        .map(([k]) => k);
      await fetch('/api/dashboard/widget-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName, widgets }),
      });
    } catch {
      // Silently fail — config will be re-saved next time
    } finally {
      setSaving(false);
    }
  }, [loaded]);

  const toggle = (id: string) => {
    setActiveTemplate(null);
    const newEnabled = { ...enabled, [id]: !enabled[id] };
    setEnabled(newEnabled);
    saveConfig(newEnabled, null);
  };

  const applyTemplate = (template: WidgetTemplate) => {
    const templateWidgets = new Set<string>(template.widgets);
    const newEnabled: Record<string, boolean> = {};
    for (const wt of ALL_EXTENDED_WIDGET_TYPES) {
      newEnabled[wt] = templateWidgets.has(wt);
    }
    setEnabled(newEnabled);
    setActiveTemplate(template.id);
    setTemplateSelectorOpen(false);
    saveConfig(newEnabled, template.id);
  };

  const handleStartFromScratch = () => {
    const newEnabled: Record<string, boolean> = {};
    for (const wt of ALL_EXTENDED_WIDGET_TYPES) {
      newEnabled[wt] = false;
    }
    setEnabled(newEnabled);
    setActiveTemplate(null);
    setTemplateSelectorOpen(false);
    saveConfig(newEnabled, null);
  };

  const enabledCount = Object.values(enabled).filter(Boolean).length;

  // Get label for a widget type — check both registries
  function getWidgetLabel(wt: ExtendedWidgetType): string {
    const full = FULL_WIDGET_REGISTRY[wt];
    if (full) return full.title;
    const legacy = WIDGET_REGISTRY[wt as WidgetType];
    if (legacy) return legacy.label;
    return wt;
  }

  function getWidgetDescription(wt: ExtendedWidgetType): string {
    const full = FULL_WIDGET_REGISTRY[wt];
    if (full) return full.description;
    const legacy = WIDGET_REGISTRY[wt as WidgetType];
    if (legacy) return legacy.description;
    return '';
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Template Selector Modal */}
      <WidgetTemplateSelector
        open={templateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
        onSelectTemplate={applyTemplate}
        onStartFromScratch={handleStartFromScratch}
        currentTemplateId={activeTemplate}
      />

      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        &larr; Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard Widgets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a template or toggle individual widgets to customise your dashboard view.
          </p>
        </div>
        <div className="mt-2 flex items-center gap-3 sm:mt-0">
          {saving && (
            <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>
          )}
          <Badge variant="secondary">
            {enabledCount} of {ALL_EXTENDED_WIDGET_TYPES.length} active
          </Badge>
          <button
            onClick={() => setTemplateSelectorOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Change Template
          </button>
        </div>
      </div>

      {/* Template Picker (inline quick access) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Templates
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ENHANCED_TEMPLATES.map((template) => {
            const Icon = TEMPLATE_ICONS[template.role] ?? User;
            const isActive = activeTemplate === template.id;
            return (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
                  isActive
                    ? 'border-indigo-400 bg-indigo-50 shadow-sm dark:bg-indigo-950/20'
                    : 'border-border hover:border-indigo-300'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {template.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {template.widgets.length} widgets
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* No-data banner */}
      {(!props.connected || !hasData) && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-8 text-center">
            <p className="text-lg font-semibold text-amber-800 dark:text-amber-200">
              {!props.connected
                ? 'No accounting platform connected'
                : 'No financial data available yet'}
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {!props.connected
                ? 'Connect your Xero account in Settings to see real widget data.'
                : 'Data will appear here once your first sync completes.'}
            </p>
            {!props.connected && (
              <Link
                href="/dashboard/settings"
                className="mt-4 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Go to Settings
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Individual Widgets heading */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Individual Widgets
        </h2>

        {/* Widget grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
          {ALL_EXTENDED_WIDGET_TYPES.map((wt) => {
            const renderer = widgetRenderers[wt];
            return (
              <Card
                key={wt}
                className={`transition-all duration-200 ${
                  enabled[wt]
                    ? 'border-border shadow-sm hover:shadow-md hover:border-indigo-400/50'
                    : 'border-border/50 opacity-60 hover:opacity-80'
                }`}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-0.5 pr-4">
                    <CardTitle className="text-sm font-semibold">
                      {getWidgetLabel(wt)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {getWidgetDescription(wt)}
                    </p>
                    <Badge variant="outline" className="text-[9px] mt-1">
                      {FULL_WIDGET_REGISTRY[wt]?.category ?? 'financial'}
                    </Badge>
                  </div>
                  <Toggle
                    checked={enabled[wt]}
                    onChange={() => toggle(wt)}
                  />
                </CardHeader>
                <CardContent className="pt-0">
                  {renderer(props, format)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
