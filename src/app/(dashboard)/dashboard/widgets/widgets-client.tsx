'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Table,
  Sparkles,
  BarChart,
  Wallet,
  ShieldCheck,
  Rss,
  RefreshCw,
  GripVertical,
  Save,
  RotateCcw,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WidgetConfig {
  type: string;
  visible: boolean;
  order: number;
}

interface AvailableWidget {
  type: string;
  label: string;
  description: string;
}

interface WidgetsClientProps {
  connected: boolean;
  revenueTrend: Array<{ period: string; revenue: number }>;
  pnlSummary: Array<{ name: string; value: number }>;
  cashTrend: Array<{ period: string; cash: number }>;
  expenseBreakdown: Array<{ name: string; value: number; color: string }>;
  kpis: Array<{ label: string; value: string; color: string }>;
  initialWidgets: WidgetConfig[];
  availableWidgets: AvailableWidget[];
  defaultWidgets: WidgetConfig[];
}

/* ------------------------------------------------------------------ */
/*  Icon map for each widget type                                      */
/* ------------------------------------------------------------------ */

const WIDGET_ICONS: Record<string, LucideIcon> = {
  kpi_cards: BarChart3,
  pnl_table: Table,
  narrative_summary: Sparkles,
  waterfall_chart: BarChart,
  cash_position: Wallet,
  data_health: ShieldCheck,
  activity_feed: Rss,
  sync_status: RefreshCw,
};

/* ------------------------------------------------------------------ */
/*  Toggle switch component (no external dependency needed)            */
/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked ? 'bg-indigo-500' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Sortable Widget Item                                               */
/* ------------------------------------------------------------------ */

function SortableWidgetItem({
  id,
  widget,
  meta,
  onToggle,
}: {
  id: string;
  widget: WidgetConfig;
  meta: AvailableWidget;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const Icon = WIDGET_ICONS[widget.type] ?? BarChart3;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border p-3 transition-all',
          isDragging && 'shadow-xl ring-2 ring-indigo-400',
          widget.visible
            ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
            : 'bg-zinc-50 dark:bg-zinc-950/30 border-zinc-200/60 dark:border-zinc-800/60 opacity-60',
        )}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1 text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            widget.visible
              ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className={cn(
            'text-sm font-medium truncate',
            !widget.visible && 'text-muted-foreground'
          )}>
            {meta.label}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {meta.description}
          </p>
        </div>

        {/* Toggle */}
        <Toggle
          checked={widget.visible}
          onChange={onToggle}
          label={`Toggle ${meta.label}`}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Layout Preview Grid                                                */
/* ------------------------------------------------------------------ */

function LayoutPreview({
  widgets,
  availableWidgets,
}: {
  widgets: WidgetConfig[];
  availableWidgets: AvailableWidget[];
}) {
  const activeWidgets = widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);

  const metaMap = new Map(availableWidgets.map((w) => [w.type, w]));

  if (activeWidgets.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8">
        <div className="text-center">
          <EyeOff className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            No widgets visible
          </p>
          <p className="text-xs text-muted-foreground/60">
            Toggle widgets on to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {activeWidgets.map((widget) => {
        const meta = metaMap.get(widget.type);
        const Icon = WIDGET_ICONS[widget.type] ?? BarChart3;
        return (
          <div
            key={widget.type}
            className="flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30 px-3 py-2.5"
          >
            <Icon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span className="text-xs font-medium text-foreground truncate">
              {meta?.label ?? widget.type}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main WidgetsClient Component                                       */
/* ------------------------------------------------------------------ */

export function WidgetsClient({
  initialWidgets,
  availableWidgets,
  defaultWidgets,
}: WidgetsClientProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(initialWidgets);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const metaMap = new Map(availableWidgets.map((w) => [w.type, w]));

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const markChanged = useCallback(() => {
    setHasChanges(true);
    setSaveSuccess(false);
    setSaveError(null);
  }, []);

  /* ── Toggle visibility ── */
  const toggleWidget = useCallback((type: string) => {
    setWidgets((prev) =>
      prev.map((w) =>
        w.type === type ? { ...w, visible: !w.visible } : w
      )
    );
    markChanged();
  }, [markChanged]);

  /* ── Drag end handler ── */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setWidgets((prev) => {
      const oldIndex = prev.findIndex((w) => w.type === active.id);
      const newIndex = prev.findIndex((w) => w.type === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = arrayMove(prev, oldIndex, newIndex);
      return reordered.map((w, i) => ({ ...w, order: i }));
    });
    markChanged();
  }, [markChanged]);

  /* ── Save to API ── */
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/dashboard/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as Record<string, string>).error || 'Failed to save');
      }

      setSaveSuccess(true);
      setHasChanges(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save widget configuration');
    } finally {
      setSaving(false);
    }
  }, [widgets]);

  /* ── Reset to defaults ── */
  const handleReset = useCallback(() => {
    setWidgets(defaultWidgets.map((w, i) => ({ ...w, order: i })));
    markChanged();
  }, [defaultWidgets, markChanged]);

  const visibleCount = widgets.filter((w) => w.visible).length;
  const totalCount = widgets.length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Customise Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag to reorder, toggle to show or hide. Changes apply after saving.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {visibleCount} of {totalCount} visible
          </Badge>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30 px-4 py-3">
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              Saved successfully
            </span>
          )}
          {saveError && (
            <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {saveError}
            </span>
          )}
          {hasChanges && !saveSuccess && !saveError && (
            <span className="text-sm text-amber-600 dark:text-amber-400">
              You have unsaved changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to Default
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || (!hasChanges && !saveError)}
            className={cn(
              hasChanges && 'bg-indigo-600 hover:bg-indigo-700 text-white'
            )}
          >
            {saving ? (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main content: widget list + preview */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Widget list (drag + toggle) */}
        <div className="lg:col-span-3 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Widgets
            </h2>
            <p className="text-xs text-muted-foreground">
              Drag to reorder
            </p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgets.map((w) => w.type)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {widgets.map((widget) => {
                  const meta = metaMap.get(widget.type);
                  if (!meta) return null;
                  return (
                    <SortableWidgetItem
                      key={widget.type}
                      id={widget.type}
                      widget={widget}
                      meta={meta}
                      onToggle={() => toggleWidget(widget.type)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Layout preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Layout Preview
            </h2>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Active widgets ({visibleCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <LayoutPreview
                  widgets={widgets}
                  availableWidgets={availableWidgets}
                />
              </CardContent>
            </Card>

            {/* Quick stats */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-center">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {visibleCount}
                </p>
                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-medium">
                  Visible
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30 px-3 py-2 text-center">
                <p className="text-lg font-bold text-muted-foreground">
                  {totalCount - visibleCount}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Hidden
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
