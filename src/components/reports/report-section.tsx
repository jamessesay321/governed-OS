'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ReportSection } from '@/types/reports';

interface ReportSectionProps {
  section: ReportSection;
  editable?: boolean;
  onCommentaryUpdate?: (sectionId: string, commentary: string) => void;
}

export function ReportSectionCard({ section, editable = false, onCommentaryUpdate }: ReportSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [commentary, setCommentary] = useState(section.commentary);

  function handleSave() {
    onCommentaryUpdate?.(section.id, commentary);
    setIsEditing(false);
  }

  return (
    <Card id={`section-${section.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {section.order + 1}
            </div>
            <CardTitle className="text-lg">{section.title}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs capitalize">
            {section.type.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Commentary */}
        {section.commentary && (
          <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-950/30">
            <div className="mb-1 flex items-center gap-2">
              <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">AI Commentary</span>
              {editable && !isEditing && (
                <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={commentary}
                  onChange={(e) => setCommentary(e.target.value)}
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={handleSave}>Save</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setIsEditing(false); setCommentary(section.commentary); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-blue-900 dark:text-blue-100">{commentary}</p>
            )}
          </div>
        )}

        {/* Section data rendering */}
        <SectionDataView type={section.type} data={section.data} />
      </CardContent>
    </Card>
  );
}

function SectionDataView({ type, data }: { type: string; data: Record<string, unknown> }) {
  switch (type) {
    case 'kpi_summary':
      return <KPIGridView data={data} />;
    case 'pnl':
      return <PnLView data={data} />;
    case 'cash_flow':
      return <CashFlowView data={data} />;
    case 'variance':
      return <VarianceView data={data} />;
    case 'scenarios':
      return <ScenariosView data={data} />;
    case 'intelligence':
      return <IntelligenceView data={data} />;
    case 'action_items':
      return <ActionItemsView data={data} />;
    case 'executive_summary':
      return <ExecutiveSummaryView data={data} />;
    default:
      return <GenericView data={data} />;
  }
}

function ExecutiveSummaryView({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <MetricCard label="Revenue" value={formatCurrency(data.revenue as number)} />
      <MetricCard label="Net Profit" value={formatCurrency(data.netProfit as number)} />
      <MetricCard label="Gross Margin" value={`${data.grossMargin}%`} />
    </div>
  );
}

function KPIGridView({ data }: { data: Record<string, unknown> }) {
  const kpis = (data.kpis as Array<Record<string, unknown>>) || [];
  if (kpis.length === 0) return <EmptyState message="No KPI data available." />;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {kpis.map((kpi, i) => (
        <div key={i} className="rounded-lg border p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {String(kpi.type || '')}
          </p>
          <p className="mt-1 text-2xl font-bold">{formatNumber(kpi.value as number)}</p>
          <p className={`mt-1 text-xs font-medium ${
            kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
          }`}>
            {kpi.trend === 'up' ? '\u25B2' : kpi.trend === 'down' ? '\u25BC' : '\u2014'}{' '}
            {(kpi.trendPct as number)?.toFixed(1)}%
          </p>
          {kpi.benchmark ? (
            <p className="mt-1 text-xs text-muted-foreground">Benchmark: {formatNumber(kpi.benchmark as number)}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function PnLView({ data }: { data: Record<string, unknown> }) {
  const periods = (data.periods as Array<Record<string, unknown>>) || [];
  if (periods.length === 0) return <EmptyState message="No P&L data available." />;
  const latest = periods[0];
  const sections = (latest.sections as Array<Record<string, unknown>>) || [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left font-medium">Account</th>
            <th className="p-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section, si) => {
            const rows = (section.rows as Array<Record<string, unknown>>) || [];
            return (
              <tbody key={si}>
                <tr className="bg-muted/30">
                  <td colSpan={2} className="p-3 font-semibold">{String(section.label || '')}</td>
                </tr>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-b">
                    <td className="p-3 pl-8">{String(row.name || '')}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(row.amount as number)}</td>
                  </tr>
                ))}
                <tr className="border-b font-semibold">
                  <td className="p-3">Total {String(section.label || '')}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(section.total as number)}</td>
                </tr>
              </tbody>
            );
          })}
          <tr className="border-t-2 border-primary font-bold">
            <td className="p-3">Net Profit</td>
            <td className="p-3 text-right font-mono">{formatCurrency(latest.netProfit as number)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CashFlowView({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {data.closingCash != null && <MetricCard label="Closing Cash" value={formatCurrency(data.closingCash as number)} />}
      {data.burnRate != null && <MetricCard label="Burn Rate" value={`${formatCurrency(data.burnRate as number)}/mo`} />}
      {data.runwayMonths != null && <MetricCard label="Runway" value={`${(data.runwayMonths as number).toFixed(1)} months`} />}
      {data.closingCash == null && data.burnRate == null && data.runwayMonths == null && (
        <div className="col-span-3"><EmptyState message="No cash flow data available." /></div>
      )}
    </div>
  );
}

function VarianceView({ data }: { data: Record<string, unknown> }) {
  const variances = (data.variances as Array<Record<string, unknown>>) || [];
  if (variances.length === 0) return <EmptyState message="No variance data available." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left font-medium">Period</th>
            <th className="p-3 text-right font-medium">Revenue</th>
            <th className="p-3 text-right font-medium">Net Profit</th>
          </tr>
        </thead>
        <tbody>
          {variances.map((v, i) => (
            <tr key={i} className="border-b">
              <td className="p-3">{String(v.period || '')}</td>
              <td className="p-3 text-right font-mono">{formatCurrency(v.revenue as number)}</td>
              <td className="p-3 text-right font-mono">{formatCurrency(v.netProfit as number)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScenariosView({ data }: { data: Record<string, unknown> }) {
  const scenarios = (data.scenarios as Array<Record<string, unknown>>) || [];
  if (scenarios.length === 0) return <EmptyState message="No active scenarios." />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {scenarios.map((s, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{String(s.name || '')}</p>
            <Badge variant="outline" className="text-xs capitalize">{String(s.status || '')}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{String(s.description || '')}</p>
        </div>
      ))}
    </div>
  );
}

function IntelligenceView({ data }: { data: Record<string, unknown> }) {
  const impacts = (data.impacts as Array<Record<string, unknown>>) || [];
  if (impacts.length === 0) return <EmptyState message="No recent intelligence events." />;

  return (
    <div className="space-y-3">
      {impacts.map((impact, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{String(impact.eventTitle || '')}</p>
            <Badge
              variant={
                impact.impactType === 'positive' ? 'default' :
                impact.impactType === 'negative' ? 'destructive' : 'secondary'
              }
              className="text-xs capitalize"
            >
              {String(impact.impactType || '')}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{String(impact.narrative || '')}</p>
          <p className="mt-1 text-xs text-muted-foreground">Relevance: {((impact.relevanceScore as number) * 100).toFixed(0)}%</p>
        </div>
      ))}
    </div>
  );
}

function ActionItemsView({ data }: { data: Record<string, unknown> }) {
  const items = (data.items as Array<Record<string, unknown>>) || [];
  if (items.length === 0) {
    return <EmptyState message={String(data.note || 'No action items.')} />;
  }
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm">
      {items.map((item, i) => (
        <li key={i}>{String(item.title || item.description || '')}</li>
      ))}
    </ol>
  );
}

function GenericView({ data }: { data: Record<string, unknown> }) {
  if (Object.keys(data).length === 0) return null;
  return (
    <pre className="overflow-auto rounded-lg bg-muted/50 p-4 text-xs">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
