'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Scenario, ModelSnapshot, AssumptionValue, UnitEconomicsSnapshot, AICommentary, Role, AssumptionSet } from '@/types';
import { ROLE_HIERARCHY } from '@/types';
import { ForecastChart } from '@/components/scenarios/forecast-chart';
import { CashFlowChart } from '@/components/scenarios/cash-flow-chart';
import { MarginTrendChart } from '@/components/scenarios/margin-trend-chart';
import { UnitEconomicsTable } from '@/components/scenarios/unit-economics-table';
import { AICommentaryPanel } from '@/components/scenarios/ai-commentary-panel';
import { AssumptionEditor } from '@/components/scenarios/assumption-editor';
import { ScenarioChatBuilder } from '@/components/scenarios/scenario-chat-builder';

type ScenarioWithSet = Scenario & { assumption_sets: AssumptionSet | null };

type Props = {
  scenario: ScenarioWithSet;
  snapshots: ModelSnapshot[];
  assumptionValues: AssumptionValue[];
  unitEconomics: UnitEconomicsSnapshot[];
  commentary: AICommentary[];
  role: string;
};

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

type Tab = 'forecast' | 'cashflow' | 'margins' | 'unit-economics' | 'assumptions' | 'ai-insights';

export function ScenarioDetailClient({
  scenario,
  snapshots,
  assumptionValues,
  unitEconomics,
  commentary,
  role,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('forecast');
  const [running, setRunning] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const canRun = hasMinRole(role as Role, 'advisor') && scenario.status !== 'locked';
  const canLock = hasMinRole(role as Role, 'admin') && scenario.status !== 'locked';
  const canDuplicate = hasMinRole(role as Role, 'advisor');
  const canChat = hasMinRole(role as Role, 'advisor') && scenario.status !== 'locked';

  async function handleRun() {
    setRunning(true);
    try {
      const res = await fetch(`/api/scenarios/${scenario.id}/run`, { method: 'POST' });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setRunning(false);
    }
  }

  async function handleLock() {
    if (!confirm('Lock this scenario? This action cannot be undone.')) return;
    await fetch(`/api/scenarios/${scenario.id}/lock`, { method: 'POST' });
    router.refresh();
  }

  async function handleDuplicate() {
    const name = prompt('Name for the duplicate scenario:');
    if (!name) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/scenarios/${scenario.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/scenarios/${data.scenario.id}`);
      }
    } finally {
      setDuplicating(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'forecast', label: 'Forecast' },
    { key: 'cashflow', label: 'Cash Flow' },
    { key: 'margins', label: 'Margins' },
    { key: 'unit-economics', label: 'Unit Economics' },
    { key: 'assumptions', label: 'Assumptions' },
    { key: 'ai-insights', label: 'AI Insights' },
  ];

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    locked: 'bg-gray-100 text-gray-800',
    archived: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/scenarios" className="text-sm text-muted-foreground hover:underline">Scenarios</Link>
            <span className="text-muted-foreground">/</span>
            <h2 className="text-2xl font-bold">{scenario.name}</h2>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[scenario.status] ?? ''}`}>
              {scenario.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
          {scenario.assumption_sets && (
            <p className="text-xs text-muted-foreground mt-1">
              Base: {scenario.assumption_sets.base_period_start.slice(0, 7)} to {scenario.assumption_sets.base_period_end.slice(0, 7)} | Forecast: {scenario.assumption_sets.forecast_horizon_months} months
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {canChat && (
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`rounded border px-3 py-1.5 text-sm hover:bg-muted ${chatOpen ? 'bg-muted' : ''}`}
            >
              {chatOpen ? 'Close Chat' : 'What-if Chat'}
            </button>
          )}
          {canDuplicate && (
            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="rounded border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              {duplicating ? 'Duplicating...' : 'Duplicate'}
            </button>
          )}
          {canLock && (
            <button
              onClick={handleLock}
              className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Lock
            </button>
          )}
          {canRun && (
            <button
              onClick={handleRun}
              disabled={running}
              className="rounded bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {running ? 'Running...' : 'Run Model'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {snapshots.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {(() => {
            const last = snapshots[snapshots.length - 1];
            return (
              <>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Revenue (Latest)</p>
                  <p className="text-2xl font-bold">${last.revenue.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className={`text-2xl font-bold ${last.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${last.net_profit.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Closing Cash</p>
                  <p className="text-2xl font-bold">${last.closing_cash.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    {last.burn_rate > 0 ? 'Runway' : 'Status'}
                  </p>
                  <p className="text-2xl font-bold">
                    {last.burn_rate > 0 ? `${last.runway_months.toFixed(1)} months` : 'Cash Positive'}
                  </p>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content + Chat Sidebar */}
      <div className={`flex gap-6 ${chatOpen ? '' : ''}`}>
        <div className="flex-1 min-w-0">
          {activeTab === 'forecast' && (
            snapshots.length > 0 ? (
              <ForecastChart snapshots={snapshots} />
            ) : (
              <p className="text-sm text-muted-foreground">No model results yet. Run the model to generate forecasts.</p>
            )
          )}
          {activeTab === 'cashflow' && (
            snapshots.length > 0 ? (
              <CashFlowChart snapshots={snapshots} />
            ) : (
              <p className="text-sm text-muted-foreground">No cash flow data yet.</p>
            )
          )}
          {activeTab === 'margins' && (
            snapshots.length > 0 ? (
              <MarginTrendChart snapshots={snapshots} />
            ) : (
              <p className="text-sm text-muted-foreground">No margin data yet.</p>
            )
          )}
          {activeTab === 'unit-economics' && (
            <UnitEconomicsTable data={unitEconomics} />
          )}
          {activeTab === 'assumptions' && (
            <AssumptionEditor
              assumptionSetId={scenario.assumption_set_id}
              values={assumptionValues}
              onValueAdded={() => router.refresh()}
            />
          )}
          {activeTab === 'ai-insights' && (
            <AICommentaryPanel commentary={commentary} />
          )}
        </div>

        {chatOpen && scenario.assumption_sets && (
          <div className="w-96 border-l pl-4" style={{ height: '600px' }}>
            <h3 className="text-sm font-medium mb-2">What-if Chat</h3>
            <ScenarioChatBuilder
              scenarioId={scenario.id}
              assumptionSetId={scenario.assumption_set_id}
              basePeriodStart={scenario.assumption_sets.base_period_start}
              basePeriodEnd={scenario.assumption_sets.base_period_end}
              forecastHorizonMonths={scenario.assumption_sets.forecast_horizon_months}
              onChangesApplied={() => router.refresh()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
