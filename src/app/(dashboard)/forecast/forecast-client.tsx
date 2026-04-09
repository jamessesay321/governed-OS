'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrencyCompact, chartTooltipFormatter, formatPercent, chartAxisFormatter } from '@/lib/formatting/currency';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceInput } from '@/components/ui/voice-input';
import type { ForecastResult, ForecastAssumption } from '@/lib/forecast/engine';
import type { Scenario } from '@/lib/forecast/scenarios';
import { ExportButton } from '@/components/shared/export-button';
import type { ExportColumn } from '@/components/shared/export-button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ForecastDashboardClientProps {
  orgId: string;
  role: string;
}

interface AssumptionField {
  category: string;
  label: string;
  type: 'percentage' | 'absolute';
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
}

// ---------------------------------------------------------------------------
// Default Assumptions
// ---------------------------------------------------------------------------

const DEFAULT_ASSUMPTIONS: AssumptionField[] = [
  { category: 'revenue_growth', label: 'Revenue Growth', type: 'percentage', value: 5, min: -50, max: 100, step: 0.5, suffix: '%' },
  { category: 'cogs_percent', label: 'COGS %', type: 'percentage', value: 40, min: 0, max: 100, step: 1, suffix: '%' },
  { category: 'opex_growth', label: 'OpEx Growth', type: 'percentage', value: 2, min: -20, max: 50, step: 0.5, suffix: '%' },
  { category: 'headcount', label: 'New Headcount', type: 'absolute', value: 0, min: 0, max: 100, step: 1, suffix: '' },
  { category: 'avg_salary', label: 'Avg Monthly Salary', type: 'absolute', value: 5000, min: 0, max: 50000, step: 500, suffix: '' },
  { category: 'capex', label: 'Monthly CapEx', type: 'absolute', value: 0, min: 0, max: 500000, step: 1000, suffix: '' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tooltipFormatter(value: unknown): string {
  return chartTooltipFormatter()(Number(value ?? 0));
}

const fmtAxisTick = chartAxisFormatter();

function formatCurrencyShort(value: number): string {
  return formatCurrencyCompact(value);
}

function buildChartData(forecast: ForecastResult, scenario?: Scenario | null) {
  return forecast.periods.map((period, i) => {
    const point: Record<string, string | number> = {
      period,
      revenue: forecast.pnl.revenue[i],
      netProfit: forecast.pnl.netProfit[i],
      cash: forecast.balanceSheet.cash[i],
    };
    if (scenario) {
      point.scenarioRevenue = scenario.forecast.pnl.revenue[i] ?? 0;
      point.scenarioProfit = scenario.forecast.pnl.netProfit[i] ?? 0;
      point.scenarioCash = scenario.forecast.balanceSheet.cash[i] ?? 0;
    }
    return point;
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ForecastDashboardClient({ orgId, role }: ForecastDashboardClientProps) {
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [assumptions, setAssumptions] = useState<AssumptionField[]>(DEFAULT_ASSUMPTIONS);
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(false);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioQuery, setScenarioQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isAdmin = role === 'admin' || role === 'owner';

  // Fetch latest forecast on mount
  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch(`/api/forecast/latest/${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setForecast(data);

        // Hydrate assumption fields from saved forecast
        if (data.assumptions && Array.isArray(data.assumptions)) {
          setAssumptions((prev) =>
            prev.map((field) => {
              const saved = (data.assumptions as ForecastAssumption[]).find(
                (a) => a.category === field.category,
              );
              return saved ? { ...field, value: saved.value } : field;
            }),
          );
        }
      }
    } catch {
      // No forecast yet — that's fine
    }
  }, [orgId]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  // Generate or update forecast
  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const forecastAssumptions: ForecastAssumption[] = assumptions.map((a) => ({
        category: a.category,
        type: a.type,
        value: a.value,
        label: a.label,
      }));

      const res = await fetch('/api/forecast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months, assumptions: forecastAssumptions }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate forecast');
      }

      const data = await res.json();
      setForecast(data);
      setScenario(null); // Clear scenario overlay
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Run scenario
  const handleRunScenario = async () => {
    if (!scenarioQuery.trim()) return;
    setScenarioLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/forecast/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: scenarioQuery, months }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to run scenario');
      }

      const data = await res.json();
      setScenario(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScenarioLoading(false);
    }
  };

  const updateAssumption = (category: string, value: number) => {
    setAssumptions((prev) =>
      prev.map((a) => (a.category === category ? { ...a, value } : a)),
    );
  };

  const chartData = forecast ? buildChartData(forecast, scenario) : [];

  const exportColumns: ExportColumn[] = [
    { header: 'Period', key: 'period', format: 'text' },
    { header: 'Revenue', key: 'revenue', format: 'currency' },
    { header: 'Net Profit', key: 'netProfit', format: 'currency' },
    { header: 'Cash Position', key: 'cash', format: 'currency' },
    ...(scenario
      ? [
          { header: 'Scenario Revenue', key: 'scenarioRevenue', format: 'currency' as const },
          { header: 'Scenario Profit', key: 'scenarioProfit', format: 'currency' as const },
          { header: 'Scenario Cash', key: 'scenarioCash', format: 'currency' as const },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forecast</h1>
          <p className="text-muted-foreground">
            Three-way financial forecast: P&L, Balance Sheet, and Cash Flow
          </p>
        </div>
        <div className="flex items-center gap-3">
          {forecast && (
            <div className="text-sm text-muted-foreground">
              Confidence: {formatPercent(forecast.confidence || 0, true)}
              {' | '}
              Generated: {new Date(forecast.generatedAt).toLocaleDateString()}
            </div>
          )}
          <ExportButton
            data={chartData}
            columns={exportColumns}
            filename="forecast"
            title="Financial Forecast"
            disabled={chartData.length === 0}
          />
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------------- */}
        {/* Overview Tab                                                      */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="overview" className="space-y-6">
          {!forecast ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <p className="text-muted-foreground">No forecast generated yet.</p>
                {isAdmin && (
                  <Button onClick={handleGenerate} disabled={loading}>
                    {loading ? 'Generating...' : 'Generate Forecast'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mini Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Revenue Trend */}
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="text-sm font-medium mb-2">Revenue Trend</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={fmtAxisTick} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={tooltipFormatter} />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={false}
                            name="Base"
                          />
                          {scenario && (
                            <Line
                              type="monotone"
                              dataKey="scenarioRevenue"
                              stroke="#2563eb"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                              name="Scenario"
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Profit Trend */}
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="text-sm font-medium mb-2">Net Profit Trend</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={fmtAxisTick} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={tooltipFormatter} />
                          <Line
                            type="monotone"
                            dataKey="netProfit"
                            stroke="#16a34a"
                            strokeWidth={2}
                            dot={false}
                            name="Base"
                          />
                          {scenario && (
                            <Line
                              type="monotone"
                              dataKey="scenarioProfit"
                              stroke="#16a34a"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                              name="Scenario"
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Cash Trend */}
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="text-sm font-medium mb-2">Cash Position</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={fmtAxisTick} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={tooltipFormatter} />
                          <Line
                            type="monotone"
                            dataKey="cash"
                            stroke="#9333ea"
                            strokeWidth={2}
                            dot={false}
                            name="Base"
                          />
                          {scenario && (
                            <Line
                              type="monotone"
                              dataKey="scenarioCash"
                              stroke="#9333ea"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                              name="Scenario"
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed P&L Table */}
              <Card>
                <CardContent className="pt-4">
                  <h3 className="text-sm font-medium mb-3">P&L Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium">Metric</th>
                          {forecast.periods.slice(0, 6).map((p) => (
                            <th key={p} className="text-right py-2 px-2 font-medium">{p}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'Revenue', data: forecast.pnl.revenue },
                          { label: 'COGS', data: forecast.pnl.costOfSales },
                          { label: 'Gross Profit', data: forecast.pnl.grossProfit },
                          { label: 'OpEx', data: forecast.pnl.operatingExpenses },
                          { label: 'Net Profit', data: forecast.pnl.netProfit },
                        ].map((row) => (
                          <tr key={row.label} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{row.label}</td>
                            {row.data.slice(0, 6).map((val, i) => (
                              <td
                                key={i}
                                className={`text-right py-2 px-2 tabular-nums ${val < 0 ? 'text-destructive' : ''}`}
                              >
                                {formatCurrencyShort(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Legend for scenario overlay */}
              {scenario && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="pt-4 text-sm">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <span className="w-4 h-0.5 bg-blue-600 inline-block" /> Base forecast
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-4 h-0.5 bg-blue-600 inline-block border-dashed border-t-2 border-blue-600" /> {scenario.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setScenario(null)}
                      >
                        Clear Scenario
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Assumptions Tab                                                   */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="assumptions" className="space-y-6">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Forecast Assumptions</h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor="months" className="text-sm">Months:</Label>
                  <Input
                    id="months"
                    type="number"
                    min={1}
                    max={36}
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assumptions.map((field) => (
                  <div key={field.category} className="space-y-1">
                    <Label htmlFor={field.category} className="text-sm">
                      {field.label}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={field.category}
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={field.value}
                        onChange={(e) =>
                          updateAssumption(field.category, Number(e.target.value))
                        }
                        className="w-full"
                        disabled={!isAdmin}
                      />
                      {field.suffix && (
                        <span className="text-sm text-muted-foreground w-6">
                          {field.suffix}
                        </span>
                      )}
                    </div>
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={field.value}
                      onChange={(e) =>
                        updateAssumption(field.category, Number(e.target.value))
                      }
                      className="w-full accent-primary"
                      disabled={!isAdmin}
                    />
                  </div>
                ))}
              </div>

              {isAdmin && (
                <Button onClick={handleGenerate} disabled={loading} className="w-full">
                  {loading ? 'Generating Forecast...' : 'Update Forecast'}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Scenarios Tab                                                     */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="scenarios" className="space-y-6">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <h3 className="text-sm font-medium">Scenario Builder</h3>
              <p className="text-sm text-muted-foreground">
                Ask a &quot;what if&quot; question to model different scenarios.
              </p>

              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder='e.g. "What if I hire 2 developers at $60K each?"'
                    value={scenarioQuery}
                    onChange={(e) => setScenarioQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !scenarioLoading) handleRunScenario();
                    }}
                    disabled={!isAdmin}
                  />
                </div>
                <VoiceInput
                  onTranscript={(text) => setScenarioQuery(text)}
                  replaceMode
                  size="icon"
                />
                <Button
                  onClick={handleRunScenario}
                  disabled={scenarioLoading || !scenarioQuery.trim() || !isAdmin}
                >
                  {scenarioLoading ? 'Running...' : 'Run Scenario'}
                </Button>
              </div>

              {/* Scenario result */}
              {scenario && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{scenario.name}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setScenario(null)}
                    >
                      Clear
                    </Button>
                  </div>

                  {/* Assumptions used */}
                  <div className="flex flex-wrap gap-2">
                    {scenario.assumptions.map((a, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-1 text-xs bg-muted rounded"
                      >
                        {a.label}: {a.value}
                        {a.type === 'percentage' ? '%' : ''}
                      </span>
                    ))}
                  </div>

                  {/* Comparison chart */}
                  {forecast && (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={buildChartData(forecast, scenario)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={fmtAxisTick} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={tooltipFormatter} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={false}
                            name="Base Revenue"
                          />
                          <Line
                            type="monotone"
                            dataKey="scenarioRevenue"
                            stroke="#2563eb"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            name="Scenario Revenue"
                          />
                          <Line
                            type="monotone"
                            dataKey="netProfit"
                            stroke="#16a34a"
                            strokeWidth={2}
                            dot={false}
                            name="Base Profit"
                          />
                          <Line
                            type="monotone"
                            dataKey="scenarioProfit"
                            stroke="#16a34a"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            name="Scenario Profit"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick scenario buttons */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h4 className="text-sm font-medium">Quick Scenarios</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  'What if revenue grows 20% faster?',
                  'What if we lose our biggest client (30% revenue drop)?',
                  'What if we hire 3 more people at $5K/month each?',
                  'What if we invest $50K in equipment?',
                  'What if we reduce payment terms to 15 days?',
                ].map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setScenarioQuery(q);
                    }}
                    disabled={!isAdmin}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
