'use client';

import { useState } from 'react';
import {
  User,
  Briefcase,
  TrendingUp,
  BookOpen,
  LayoutGrid,
  X,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FULL_WIDGET_REGISTRY,
  type ExtendedWidgetType,
} from '@/lib/dashboard/widget-registry';

/* ------------------------------------------------------------------ */
/*  Template definitions (enhanced for F-069)                          */
/* ------------------------------------------------------------------ */

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  role: 'owner' | 'advisor' | 'investor' | 'bookkeeper';
  widgets: ExtendedWidgetType[];
}

export const ENHANCED_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'owner-default',
    name: 'Business Owner',
    description: 'Complete financial overview with AI insights, P&L, cash position, and growth metrics',
    role: 'owner',
    widgets: [
      'data_freshness', 'narrative_summary', 'kpi_cards',
      'pnl_table', 'cash_forecast', 'expense_breakdown',
      'revenue_trend', 'working_capital', 'runway',
      'growth_metrics', 'top_expenses', 'alert_summary',
    ],
  },
  {
    id: 'advisor-default',
    name: 'Fractional CFO / Advisor',
    description: 'Variance analysis, KPI trends, benchmarks, and portfolio-level insights',
    role: 'advisor',
    widgets: [
      'data_freshness', 'narrative_summary', 'variance_summary',
      'kpi_cards', 'pnl_table', 'revenue_trend',
      'margin_trend', 'budget_variance', 'industry_benchmark',
      'working_capital', 'cash_forecast', 'alert_summary',
      'custom_kpis',
    ],
  },
  {
    id: 'investor-default',
    name: 'Investor / Board',
    description: 'High-level KPIs, growth metrics, cash runway, and revenue concentration',
    role: 'investor',
    widgets: [
      'narrative_summary', 'kpi_cards', 'revenue_trend',
      'growth_metrics', 'runway', 'revenue_concentration',
      'margin_trend', 'seasonal_pattern', 'industry_benchmark',
    ],
  },
  {
    id: 'bookkeeper-default',
    name: 'Bookkeeper',
    description: 'Data freshness, P&L detail, AR/AP aging, and payroll reconciliation',
    role: 'bookkeeper',
    widgets: [
      'data_freshness', 'pnl_table', 'ar_ap_aging',
      'expense_breakdown', 'tax_summary', 'payroll_summary',
      'top_expenses', 'budget_variance',
    ],
  },
];

const TEMPLATE_ICONS: Record<string, typeof User> = {
  owner: User,
  advisor: Briefcase,
  investor: TrendingUp,
  bookkeeper: BookOpen,
};

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

interface WidgetTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: WidgetTemplate) => void;
  onStartFromScratch: () => void;
  currentTemplateId?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function WidgetTemplateSelector({
  open,
  onClose,
  onSelectTemplate,
  onStartFromScratch,
  currentTemplateId,
}: WidgetTemplateSelectorProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);

  if (!open) return null;

  const previewTemplate = previewId
    ? ENHANCED_TEMPLATES.find((t) => t.id === previewId) ?? null
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border bg-background shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">Choose a Dashboard Template</h2>
            <p className="text-sm text-muted-foreground">
              Select a pre-built layout or start from scratch
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Template cards */}
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          {ENHANCED_TEMPLATES.map((template) => {
            const Icon = TEMPLATE_ICONS[template.role] ?? User;
            const isActive = currentTemplateId === template.id;
            const isPreviewing = previewId === template.id;

            return (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isActive
                    ? 'border-indigo-400 ring-2 ring-indigo-200'
                    : isPreviewing
                      ? 'border-indigo-300'
                      : 'border-border hover:border-indigo-300'
                }`}
                onClick={() => setPreviewId(isPreviewing ? null : template.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {template.name}
                        </CardTitle>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {template.widgets.length} widgets
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <Badge className="bg-indigo-100 text-indigo-600 text-[10px]">
                        <Check className="mr-0.5 h-3 w-3" /> Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">{template.description}</p>

                  {/* Widget preview grid */}
                  {isPreviewing && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Included widgets:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.widgets.map((wt) => {
                          const meta = FULL_WIDGET_REGISTRY[wt];
                          return (
                            <span
                              key={wt}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                            >
                              {meta?.title ?? wt}
                            </span>
                          );
                        })}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTemplate(template);
                        }}
                        className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                      >
                        Use This Template
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Start from scratch */}
        <div className="border-t px-6 py-4">
          <button
            onClick={onStartFromScratch}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-indigo-300 hover:text-indigo-600"
          >
            <LayoutGrid className="h-4 w-4" />
            Start From Scratch
          </button>
        </div>
      </div>
    </div>
  );
}
