'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getGovernancePolicies,
  getAgentAuditTrail,
  getComplianceStatuses,
  getAIPreferences,
} from '@/lib/governance/governance-data';
import type {
  GovernancePolicy,
  AgentAuditEntry,
  ComplianceStatus,
  AIPreference,
} from '@/lib/governance/governance-data';

// ── Tab types ────────────────────────────────────────────────────

const TABS = [
  { key: 'privacy', label: 'Data & Privacy' },
  { key: 'activity', label: 'Agent Activity' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'preferences', label: 'Preferences' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ── Main client component ────────────────────────────────────────

const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

export function GovernanceClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: TabKey = tabParam && VALID_TABS.has(tabParam) ? (tabParam as TabKey) : 'privacy';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Sync tab when URL changes (sidebar navigation)
  useEffect(() => {
    if (tabParam && VALID_TABS.has(tabParam)) {
      setActiveTab(tabParam as TabKey);
    }
  }, [tabParam]);

  return (
    <IntelligencePageWrapper
      section="governance"
      title="Trust Centre"
      subtitle="Full transparency and control over your data and AI operations"
      showSearch={false}
      showRecommendations={false}
    >
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-border/40 -mx-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'shrink-0 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'privacy' && <DataPrivacyTab />}
        {activeTab === 'activity' && <AgentActivityTab />}
        {activeTab === 'compliance' && <ComplianceTab />}
        {activeTab === 'preferences' && <PreferencesTab />}
      </div>
    </IntelligencePageWrapper>
  );
}

// ── Tab 1: Data & Privacy ────────────────────────────────────────

function DataPrivacyTab() {
  const policies = getGovernancePolicies();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {policies.map((policy) => (
        <PolicyCard key={policy.id} policy={policy} />
      ))}
    </div>
  );
}

function PolicyCard({ policy }: { policy: GovernancePolicy }) {
  const categoryColors: Record<GovernancePolicy['category'], string> = {
    collection: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    retention: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    sharing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    deletion: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">{policy.title}</CardTitle>
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800"
          >
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{policy.description}</p>
        <span
          className={cn(
            'inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize',
            categoryColors[policy.category],
          )}
        >
          {policy.category}
        </span>
      </CardContent>
    </Card>
  );
}

// ── Tab 2: Agent Activity ────────────────────────────────────────

const AGENT_FILTERS = ['All', 'Setup', 'Finance', 'Secretarial'] as const;
const RESULT_FILTERS = ['All', 'Success', 'Review', 'Blocked'] as const;

function AgentActivityTab() {
  const auditTrail = getAgentAuditTrail();
  const [agentFilter, setAgentFilter] = useState<string>('All');
  const [resultFilter, setResultFilter] = useState<string>('All');

  const filtered = auditTrail.filter((entry) => {
    if (agentFilter !== 'All' && !entry.agentName.toLowerCase().includes(agentFilter.toLowerCase())) {
      return false;
    }
    if (resultFilter !== 'All' && entry.result !== resultFilter.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Agent:</span>
          {AGENT_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setAgentFilter(f)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                agentFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Result:</span>
          {RESULT_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setResultFilter(f)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                resultFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Time</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Agent</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Action</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Data Accessed</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr key={entry.id} className="border-b last:border-b-0">
                <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                  {formatTimestamp(entry.timestamp)}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap font-medium">{entry.agentName}</td>
                <td className="px-4 py-2.5">{entry.action}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{entry.dataAccessed}</td>
                <td className="px-4 py-2.5">
                  <ResultBadge result={entry.result} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="sm:hidden space-y-3">
        {filtered.map((entry) => (
          <Card key={entry.id} className="py-3">
            <CardContent className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{entry.agentName}</span>
                <ResultBadge result={entry.result} />
              </div>
              <p className="text-sm">{entry.action}</p>
              <p className="text-xs text-muted-foreground">{entry.dataAccessed}</p>
              <p className="text-xs text-muted-foreground">{formatTimestamp(entry.timestamp)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No audit entries match the current filters.
        </p>
      )}
    </div>
  );
}

function ResultBadge({ result }: { result: AgentAuditEntry['result'] }) {
  const styles: Record<AgentAuditEntry['result'], string> = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    blocked: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };

  return (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        styles[result],
      )}
    >
      {result}
    </span>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' ' +
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Tab 3: Compliance ────────────────────────────────────────────

function ComplianceTab() {
  const frameworks = getComplianceStatuses();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {frameworks.map((fw) => (
        <ComplianceCard key={fw.framework} framework={fw} />
      ))}
    </div>
  );
}

function ComplianceCard({ framework }: { framework: ComplianceStatus }) {
  const statusConfig: Record<ComplianceStatus['status'], { label: string; className: string }> = {
    compliant: {
      label: 'Compliant',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    },
    in_progress: {
      label: 'In Progress',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    },
    planned: {
      label: 'Planned',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    },
  };

  const config = statusConfig[framework.status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">{framework.framework}</CardTitle>
          <span
            className={cn(
              'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
              config.className,
            )}
          >
            {config.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Controls</span>
          <span className="font-medium">{framework.controls}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last reviewed</span>
          <span className="font-medium">{framework.lastReviewed}</span>
        </div>
        {framework.status === 'planned' && (
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">On our roadmap</p>
        )}
        {framework.status === 'in_progress' && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">In progress</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Tab 4: Preferences ───────────────────────────────────────────

function PreferencesTab() {
  const allPrefs = getAIPreferences();
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(allPrefs.map((p) => [p.id, p.enabled])),
  );

  function handleToggle(id: string) {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const categories: { key: AIPreference['category']; label: string }[] = [
    { key: 'automation', label: 'Automation' },
    { key: 'data', label: 'Data' },
    { key: 'communication', label: 'Communication' },
  ];

  return (
    <div className="space-y-8">
      {categories.map((cat) => {
        const prefs = allPrefs.filter((p) => p.category === cat.key);
        if (prefs.length === 0) return null;
        return (
          <div key={cat.key}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {cat.label}
            </h3>
            <div className="space-y-3">
              {prefs.map((pref) => (
                <Card key={pref.id} className="py-4">
                  <CardContent className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{pref.label}</p>
                      <p className="text-xs text-muted-foreground">{pref.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={toggles[pref.id]}
                      onClick={() => handleToggle(pref.id)}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors',
                        toggles[pref.id] ? 'bg-primary' : 'bg-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform',
                          toggles[pref.id] ? 'translate-x-5' : 'translate-x-0.5',
                          'mt-0.5',
                        )}
                      />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
