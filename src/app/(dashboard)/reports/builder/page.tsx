'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BUILDER_TEMPLATES,
  AVAILABLE_SECTION_TYPES,
  type ReportTemplate,
  type ReportSectionConfig,
} from '@/lib/reports/templates';
import type { GeneratedReport, GeneratedSection } from '@/lib/reports/generator';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BuilderSection = ReportSectionConfig & {
  generated?: GeneratedSection;
};

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function ReportBuilderPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [reportTitle, setReportTitle] = useState('');
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Template selection
  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      const template = BUILDER_TEMPLATES.find((t) => t.id === templateId);
      if (template) {
        setReportTitle(template.name);
        setSections(template.sections.map((s) => ({ ...s })));
        setGeneratedReport(null);
      }
    },
    []
  );

  // Start blank
  const handleStartBlank = useCallback(() => {
    setSelectedTemplateId('blank');
    setReportTitle('Custom Report');
    setSections([]);
    setGeneratedReport(null);
  }, []);

  // Section management
  const moveSection = useCallback((index: number, direction: 'up' | 'down') => {
    setSections((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const removeSection = useCallback((index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addSection = useCallback(
    (type: ReportSectionConfig['type']) => {
      const newSection: BuilderSection = {
        id: `custom_${crypto.randomUUID().slice(0, 8)}`,
        type,
        title: AVAILABLE_SECTION_TYPES.find((s) => s.type === type)?.label || 'New Section',
        config: getDefaultConfig(type),
      };
      setSections((prev) => [...prev, newSection]);
    },
    []
  );

  const updateSectionTitle = useCallback((index: number, title: string) => {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], title };
      return next;
    });
  }, []);

  const updateSectionNarrative = useCallback(
    (sectionId: string, narrative: string) => {
      if (!generatedReport) return;
      setGeneratedReport({
        ...generatedReport,
        sections: generatedReport.sections.map((s) =>
          s.id === sectionId
            ? { ...s, content: { ...s.content, narrative } }
            : s
        ),
      });
    },
    [generatedReport]
  );

  const updateSectionCustomText = useCallback(
    (sectionId: string, customText: string) => {
      if (!generatedReport) return;
      setGeneratedReport({
        ...generatedReport,
        sections: generatedReport.sections.map((s) =>
          s.id === sectionId
            ? { ...s, content: { ...s.content, customText } }
            : s
        ),
      });
    },
    [generatedReport]
  );

  // Generate report
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplateId || sections.length === 0) return;
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId === 'blank' ? 'monthly_management_pack' : selectedTemplateId,
          period,
          customSections: sections.map((s) => s.id),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate report');
      }

      const data = await response.json();
      setGeneratedReport(data.report);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }, [selectedTemplateId, sections, period]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Report Builder</h1>
          <p className="text-sm text-muted-foreground">
            Build and generate professional management reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generating || sections.length === 0}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner />
                Generating...
              </span>
            ) : (
              'Generate'
            )}
          </Button>
          {generatedReport && (
            <Button variant="outline" disabled>
              Export PDF
            </Button>
          )}
          {generatedReport && (
            <Button variant="outline" disabled>
              Share
            </Button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Main layout: sidebar + preview */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left sidebar */}
        <div className="space-y-4">
          {/* Template selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={selectedTemplateId}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {BUILDER_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleStartBlank}
              >
                Start Blank
              </Button>
            </CardContent>
          </Card>

          {/* Report settings */}
          {selectedTemplateId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Report Title
                  </label>
                  <Input
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="Report title"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Period
                  </label>
                  <Input
                    type="month"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available sections */}
          {selectedTemplateId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Add Section</CardTitle>
                <CardDescription className="text-xs">
                  Click to add a section to your report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {AVAILABLE_SECTION_TYPES.map((sType) => (
                    <button
                      key={sType.type}
                      onClick={() => addSection(sType.type)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <SectionTypeIcon type={sType.type} />
                      <div>
                        <div className="font-medium">{sType.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {sType.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main preview area */}
        <div className="space-y-4">
          {!selectedTemplateId && (
            <Card>
              <CardContent className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                  <svg
                    className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-muted-foreground">
                    Select a template or start blank to begin building your report
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedTemplateId && sections.length === 0 && (
            <Card>
              <CardContent className="flex min-h-[200px] items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No sections yet. Add sections from the sidebar to build your
                  report.
                </p>
              </CardContent>
            </Card>
          )}

          {sections.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              index={index}
              total={sections.length}
              generatedSection={generatedReport?.sections?.find(
                (gs) =>
                  gs.title === section.title || gs.type === section.type
              )}
              onMoveUp={() => moveSection(index, 'up')}
              onMoveDown={() => moveSection(index, 'down')}
              onRemove={() => removeSection(index)}
              onTitleChange={(title) => updateSectionTitle(index, title)}
              onNarrativeChange={updateSectionNarrative}
              onCustomTextChange={updateSectionCustomText}
            />
          ))}

          {/* Save as template */}
          {selectedTemplateId && sections.length > 0 && (
            <div className="flex justify-end pt-4">
              <Button variant="outline" size="sm" disabled>
                Save as Template
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Card
// ---------------------------------------------------------------------------

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 220 70% 50%))',
  'hsl(var(--chart-3, 150 60% 45%))',
  'hsl(var(--chart-4, 40 90% 55%))',
  'hsl(var(--chart-5, 0 70% 55%))',
];

function SectionCard({
  section,
  index,
  total,
  generatedSection,
  onMoveUp,
  onMoveDown,
  onRemove,
  onTitleChange,
  onNarrativeChange,
  onCustomTextChange,
}: {
  section: BuilderSection;
  index: number;
  total: number;
  generatedSection?: GeneratedSection;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onTitleChange: (title: string) => void;
  onNarrativeChange: (sectionId: string, narrative: string) => void;
  onCustomTextChange: (sectionId: string, customText: string) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingContent, setEditingContent] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SectionTypeIcon type={section.type} />
            {editingTitle ? (
              <Input
                value={section.title}
                onChange={(e) => onTitleChange(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                className="h-7 w-48 text-sm"
                autoFocus
              />
            ) : (
              <CardTitle
                className="cursor-pointer text-sm font-medium"
                onClick={() => setEditingTitle(true)}
              >
                {section.title}
              </CardTitle>
            )}
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              {section.type.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              disabled={index === 0}
              className="h-7 w-7 p-0"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="h-7 w-7 p-0"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Pre-generation placeholder */}
        {!generatedSection && (
          <div className="rounded-md border border-dashed bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground">
              {getSectionPlaceholder(section)}
            </p>
          </div>
        )}

        {/* Generated content */}
        {generatedSection && (
          <div className="space-y-3">
            {/* Narrative */}
            {generatedSection.content.narrative != null && (
              <div>
                {editingContent ? (
                  <textarea
                    className="w-full rounded-md border bg-background p-3 text-sm leading-relaxed"
                    rows={6}
                    value={generatedSection.content.narrative}
                    onChange={(e) =>
                      onNarrativeChange(generatedSection.id, e.target.value)
                    }
                    onBlur={() => setEditingContent(false)}
                  />
                ) : (
                  <p
                    className="cursor-pointer text-sm leading-relaxed text-foreground"
                    onClick={() => setEditingContent(true)}
                    title="Click to edit"
                  >
                    {generatedSection.content.narrative}
                  </p>
                )}
              </div>
            )}

            {/* KPI Grid */}
            {generatedSection.content.kpis && (
              <KpiGrid
                kpis={generatedSection.content.kpis}
                columns={(section.config.columns as number) || 3}
              />
            )}

            {/* Chart */}
            {generatedSection.content.chartData && (
              <ChartRenderer
                chartData={generatedSection.content.chartData}
                chartType={(section.config.chartType as string) || 'bar'}
              />
            )}

            {/* Table */}
            {generatedSection.content.tableData && (
              <TableRenderer tableData={generatedSection.content.tableData} />
            )}

            {/* Custom text */}
            {generatedSection.content.customText != null && (
              <textarea
                className="w-full rounded-md border bg-background p-3 text-sm"
                rows={4}
                value={generatedSection.content.customText}
                onChange={(e) =>
                  onCustomTextChange(generatedSection.id, e.target.value)
                }
                placeholder="Enter your text here..."
              />
            )}

            {/* Citations */}
            {generatedSection.citations.length > 0 && (
              <div className="border-t pt-2">
                <p className="text-[10px] font-medium uppercase text-muted-foreground">
                  Sources
                </p>
                {generatedSection.citations.map((c, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground">
                    {c.text} ({c.reference})
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// KPI Grid
// ---------------------------------------------------------------------------

function KpiGrid({
  kpis,
  columns,
}: {
  kpis: NonNullable<GeneratedSection['content']['kpis']>;
  columns: number;
}) {
  const gridCols =
    columns === 4
      ? 'grid-cols-2 md:grid-cols-4'
      : columns === 2
        ? 'grid-cols-2'
        : 'grid-cols-2 md:grid-cols-3';

  return (
    <div className={`grid gap-3 ${gridCols}`}>
      {kpis.map((kpi, i) => (
        <div key={i} className="rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
          <p className="mt-1 text-lg font-bold">{kpi.value}</p>
          {kpi.change && (
            <p
              className={`text-xs font-medium ${
                kpi.status === 'good'
                  ? 'text-green-600'
                  : kpi.status === 'critical'
                    ? 'text-red-600'
                    : kpi.status === 'warning'
                      ? 'text-amber-600'
                      : 'text-muted-foreground'
              }`}
            >
              {kpi.change}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart Renderer
// ---------------------------------------------------------------------------

function ChartRenderer({
  chartData,
  chartType,
}: {
  chartData: NonNullable<GeneratedSection['content']['chartData']>;
  chartType: string;
}) {
  if (!chartData.labels.length || !chartData.datasets.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
        <p className="text-xs text-muted-foreground">No chart data available</p>
      </div>
    );
  }

  const rechartsData = chartData.labels.map((label, i) => {
    const point: Record<string, string | number> = { name: label };
    chartData.datasets.forEach((ds) => {
      point[ds.label] = ds.data[i] ?? 0;
    });
    return point;
  });

  if (chartType === 'pie') {
    const pieData = chartData.labels.map((label, i) => ({
      name: label,
      value: chartData.datasets[0]?.data[i] ?? 0,
    }));

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={(props: { name?: string; percent?: number }) =>
                `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {pieData.map((_, i) => (
                <Cell
                  key={i}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === 'line') {
    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rechartsData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {chartData.datasets.map((ds, i) => (
              <Line
                key={ds.label}
                type="monotone"
                dataKey={ds.label}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Default: bar chart
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rechartsData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          {chartData.datasets.map((ds, i) => (
            <Bar
              key={ds.label}
              dataKey={ds.label}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table Renderer
// ---------------------------------------------------------------------------

function TableRenderer({
  tableData,
}: {
  tableData: NonNullable<GeneratedSection['content']['tableData']>;
}) {
  if (!tableData.headers.length) {
    return (
      <p className="text-xs text-muted-foreground">No table data available</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {tableData.headers.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, ri) => (
            <tr key={ri} className="border-b last:border-0">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionTypeIcon({ type }: { type: string }) {
  const iconClass = 'h-4 w-4 text-muted-foreground';
  switch (type) {
    case 'narrative':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      );
    case 'kpi_grid':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      );
    case 'chart':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      );
    case 'table':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h-7.5m8.625 0h7.5M12 12v-1.5" />
        </svg>
      );
    case 'comparison':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      );
    case 'separator':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
        </svg>
      );
    case 'custom_text':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
  }
}

function getSectionPlaceholder(section: BuilderSection): string {
  switch (section.type) {
    case 'narrative':
      return `AI-generated narrative will appear here. Prompt: "${(section.config.prompt as string)?.slice(0, 80) || 'General commentary'}..."`;
    case 'kpi_grid':
      return `KPI grid with ${((section.config.kpis as string[]) || []).length} metrics in ${section.config.columns || 3} columns`;
    case 'chart':
      return `${(section.config.chartType as string) || 'Bar'} chart showing ${(section.config.metric as string) || 'data'} over ${section.config.periods || 12} periods`;
    case 'table':
      return `Data table from ${(section.config.dataSource as string) || 'financial data'}`;
    case 'comparison':
      return `Period comparison: current vs ${(section.config.period2 as string) || 'prior month'}`;
    case 'custom_text':
      return 'Editable text block. Content will be available after generation.';
    case 'separator':
      return '--- Section Divider ---';
    default:
      return 'Content will be generated when you click Generate';
  }
}

function getDefaultConfig(type: ReportSectionConfig['type']): Record<string, unknown> {
  switch (type) {
    case 'narrative':
      return { prompt: 'Provide professional financial commentary.', maxWords: 200 };
    case 'kpi_grid':
      return { kpis: ['revenue', 'net_profit', 'gross_margin'], columns: 3 };
    case 'chart':
      return { chartType: 'bar', metric: 'revenue', periods: 12 };
    case 'table':
      return { dataSource: 'pnl', columns: ['account', 'amount'] };
    case 'comparison':
      return { period1: 'current', period2: 'prior_month', metrics: ['revenue', 'net_profit'] };
    case 'custom_text':
      return { placeholder: 'Enter your text here...' };
    case 'separator':
      return {};
    default:
      return {};
  }
}

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
