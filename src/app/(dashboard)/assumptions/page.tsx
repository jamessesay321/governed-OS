'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NumberLegend } from '@/components/data-primitives';

interface Assumption {
  id: string;
  category: string;
  key: string;
  label: string;
  value: number;
  unit: string;
  source: string;
  locked: boolean;
  lastUpdated: string;
  updatedBy: string;
  impactSummary?: string;
}

const DEMO_ASSUMPTIONS: Assumption[] = [
  // Revenue
  { id: '1', category: 'Revenue', key: 'monthly_growth_rate', label: 'Monthly Revenue Growth Rate', value: 2.5, unit: '%', source: 'AI-suggested based on industry benchmark', locked: false, lastUpdated: '2 hours ago', updatedBy: 'James Sesay', impactSummary: 'Drives annual revenue forecast. +1% = +£38K annual revenue.' },
  { id: '2', category: 'Revenue', key: 'avg_order_value', label: 'Average Order Value', value: 180, unit: '£', source: 'Calculated from Xero historical average', locked: true, lastUpdated: '1 week ago', updatedBy: 'System' },
  { id: '3', category: 'Revenue', key: 'customer_acquisition_rate', label: 'New Customers per Month', value: 12, unit: 'count', source: 'Set during onboarding interview', locked: false, lastUpdated: '3 days ago', updatedBy: 'James Sesay' },
  { id: '4', category: 'Revenue', key: 'churn_rate', label: 'Monthly Customer Churn', value: 3.0, unit: '%', source: 'AI-suggested based on industry benchmark', locked: false, lastUpdated: '1 week ago', updatedBy: 'System' },
  // Costs
  { id: '5', category: 'Costs', key: 'cogs_percent', label: 'COGS as % of Revenue', value: 38, unit: '%', source: 'Pulled from Xero historical average', locked: true, lastUpdated: '1 week ago', updatedBy: 'System', impactSummary: 'Directly impacts gross margin. -2% COGS = +£15K annual profit.' },
  { id: '6', category: 'Costs', key: 'staff_percent', label: 'Staff Costs as % of Revenue', value: 30, unit: '%', source: 'Set during onboarding interview', locked: false, lastUpdated: '5 days ago', updatedBy: 'James Sesay' },
  { id: '7', category: 'Costs', key: 'marketing_spend', label: 'Monthly Marketing Budget', value: 5000, unit: '£', source: 'Manually set by James Sesay', locked: false, lastUpdated: '2 days ago', updatedBy: 'James Sesay' },
  { id: '8', category: 'Costs', key: 'rent', label: 'Monthly Rent', value: 2500, unit: '£', source: 'Manually set', locked: true, lastUpdated: '2 weeks ago', updatedBy: 'James Sesay' },
  // Macro
  { id: '9', category: 'Macro', key: 'inflation_rate', label: 'Inflation Rate', value: 2.5, unit: '%', source: 'AI-suggested from ONS data', locked: false, lastUpdated: '1 month ago', updatedBy: 'System' },
  { id: '10', category: 'Macro', key: 'tax_rate', label: 'Corporation Tax Rate', value: 25, unit: '%', source: 'UK standard rate', locked: true, lastUpdated: '6 months ago', updatedBy: 'System' },
  { id: '11', category: 'Macro', key: 'interest_rate', label: 'Base Interest Rate', value: 4.5, unit: '%', source: 'Bank of England rate', locked: true, lastUpdated: '3 months ago', updatedBy: 'System' },
];

const CATEGORIES = ['Revenue', 'Costs', 'Macro'];

function formatValue(value: number, unit: string): string {
  if (unit === '£') return `£${value.toLocaleString('en-GB')}`;
  if (unit === '%') return `${value}%`;
  return value.toString();
}

export default function AssumptionsHubPage() {
  const [assumptions, setAssumptions] = useState<Assumption[]>(DEMO_ASSUMPTIONS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = selectedCategory === 'all'
    ? assumptions
    : assumptions.filter(a => a.category === selectedCategory);

  function startEdit(a: Assumption) {
    if (a.locked) return;
    setEditingId(a.id);
    setEditValue(String(a.value));
  }

  function saveEdit(id: string) {
    const num = parseFloat(editValue);
    if (!isNaN(num)) {
      setAssumptions(prev => prev.map(a =>
        a.id === id ? { ...a, value: num, lastUpdated: 'just now', updatedBy: 'You' } : a
      ));
    }
    setEditingId(null);
  }

  const hoveredAssumption = assumptions.find(a => a.id === hoveredId);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Assumptions Hub</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Every number that drives your forecasts. Change one, see everything update.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            Switch Scenario
          </Button>
          <Button variant="outline" size="sm">Export</Button>
        </div>
      </div>

      <NumberLegend />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel: Assumptions list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Category filter */}
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              All ({assumptions.length})
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {cat} ({assumptions.filter(a => a.category === cat).length})
              </button>
            ))}
          </div>

          {/* Assumptions by category */}
          {(selectedCategory === 'all' ? CATEGORIES : [selectedCategory]).map((cat) => {
            const catAssumptions = filtered.filter(a => a.category === cat);
            if (catAssumptions.length === 0) return null;
            return (
              <Card key={cat}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{cat} Assumptions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {catAssumptions.map((a) => (
                    <div
                      key={a.id}
                      className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                        hoveredId === a.id ? 'bg-blue-50' : 'hover:bg-muted/50'
                      }`}
                      onMouseEnter={() => setHoveredId(a.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {a.locked ? (
                          <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        )}
                        <div>
                          <span className="text-sm font-medium">{a.label}</span>
                          <div className="text-[10px] text-muted-foreground">{a.source}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {editingId === a.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveEdit(a.id)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit(a.id)}
                              autoFocus
                              className="w-20 rounded border border-blue-400 bg-blue-50 px-2 py-1 text-sm text-right outline-none ring-1 ring-blue-300"
                            />
                            <span className="text-xs text-muted-foreground">{a.unit}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(a)}
                            className={`text-sm font-semibold px-2 py-1 rounded ${
                              a.locked
                                ? 'text-slate-700 cursor-default'
                                : 'text-blue-600 bg-blue-50 border border-dashed border-blue-300 cursor-pointer hover:bg-blue-100'
                            }`}
                            disabled={a.locked}
                          >
                            {formatValue(a.value, a.unit)}
                          </button>
                        )}
                        <span className="text-[10px] text-muted-foreground w-16 text-right">{a.lastUpdated}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Right panel: Impact preview */}
        <div className="space-y-4">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <svg className="h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                </svg>
                Impact Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hoveredAssumption ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">{hoveredAssumption.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Current value: {formatValue(hoveredAssumption.value, hoveredAssumption.unit)}
                    </p>
                  </div>

                  {hoveredAssumption.impactSummary && (
                    <div className="bg-violet-50 rounded-lg p-3">
                      <p className="text-sm text-violet-800">{hoveredAssumption.impactSummary}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Affects:</p>
                    {[
                      'P&L → Revenue Forecast',
                      'KPI → Monthly Revenue',
                      'Cash Flow → Projected Balance',
                      'Scenario → Base Case Output',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <svg className="h-3 w-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-[10px] text-muted-foreground">
                      Last updated by {hoveredAssumption.updatedBy}, {hoveredAssumption.lastUpdated}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="h-8 w-8 text-muted-foreground mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                  </svg>
                  <p className="text-sm text-muted-foreground">
                    Hover over any assumption to see its impact
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
