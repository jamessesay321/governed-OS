'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AccountMapping = {
  source_pattern: string;
  target_category: string;
  target_subcategory: string;
};

type BlueprintKPI = {
  key: string;
  label: string;
  priority: 'high' | 'medium' | 'low';
};

type DashboardWidget = {
  type: string;
  label: string;
  size: string;
  order: number;
};

type Blueprint = {
  id: string;
  slug: string;
  name: string;
  industry: string;
  description: string;
  account_mappings: AccountMapping[];
  kpi_definitions: BlueprintKPI[];
  dashboard_template: { id?: string; name?: string; widgets?: DashboardWidget[] };
  interview_prompts: Array<{ question: string; context: string }>;
  common_integrations: string[];
  created_from_org_id: string | null;
  version: number;
  is_active: boolean;
};

/* ------------------------------------------------------------------ */
/*  Industry Icons                                                     */
/* ------------------------------------------------------------------ */

const INDUSTRY_ICONS: Record<string, string> = {
  Technology: '\u{1F4BB}',
  Retail: '\u{1F6D2}',
  Services: '\u{1F4BC}',
  Fashion: '\u{2702}\uFE0F',
  Hospitality: '\u{1F37D}\uFE0F',
  Healthcare: '\u{1FA7A}',
  Construction: '\u{1F3D7}\uFE0F',
  Creative: '\u{1F3A8}',
};

function getIndustryIcon(industry: string): string {
  return INDUSTRY_ICONS[industry] ?? '\u{1F3E2}';
}

/* ------------------------------------------------------------------ */
/*  Hardcoded blueprints (loaded client-side from templates)           */
/* ------------------------------------------------------------------ */

import { BLUEPRINT_TEMPLATES } from '@/lib/blueprints/templates';

function templatesToBlueprintList(): Blueprint[] {
  return BLUEPRINT_TEMPLATES.map((t) => ({
    id: `template-${t.slug}`,
    slug: t.slug,
    name: t.name,
    industry: t.industry,
    description: t.description,
    account_mappings: t.account_mappings,
    kpi_definitions: t.kpi_definitions,
    dashboard_template: t.dashboard_template as Blueprint['dashboard_template'],
    interview_prompts: t.interview_prompts,
    common_integrations: t.common_integrations,
    created_from_org_id: null,
    version: 1,
    is_active: true,
  }));
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function BlueprintsPage() {
  const [blueprints] = useState<Blueprint[]>(templatesToBlueprintList);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [activeBlueprint, setActiveBlueprint] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [applying, setApplying] = useState(false);
  const [learning, setLearning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selected = blueprints.find((b) => b.slug === selectedSlug) ?? null;

  // Filter blueprints by search query
  const filtered = blueprints.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.industry.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q)
    );
  });

  // Unique industries for filter pills
  const industries = Array.from(new Set(blueprints.map((b) => b.industry)));
  const [industryFilter, setIndustryFilter] = useState<string | null>(null);

  const displayedBlueprints = industryFilter
    ? filtered.filter((b) => b.industry === industryFilter)
    : filtered;

  const clearMessage = useCallback(() => {
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (message) return clearMessage();
  }, [message, clearMessage]);

  // Apply blueprint
  const handleApply = async () => {
    if (!selected) return;
    setApplying(true);
    setMessage(null);

    try {
      // We need the orgId. In a real scenario this comes from context/session.
      // For now, call the API and let the server determine the org from the session.
      const res = await fetch('/api/blueprints/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: 'current', blueprintSlug: selected.slug }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to apply blueprint');
      }

      const data = await res.json();
      setActiveBlueprint(selected.slug);
      setMessage({ type: 'success', text: data.message || `Applied ${selected.name} blueprint` });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setApplying(false);
    }
  };

  // Learn from current setup
  const handleLearn = async () => {
    setLearning(true);
    setMessage(null);

    try {
      const res = await fetch('/api/blueprints/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: 'current' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create blueprint');
      }

      const data = await res.json();
      setMessage({ type: 'success', text: data.message || 'Blueprint created from your setup' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setLearning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Industry Blueprints</h2>
          <p className="text-muted-foreground mt-1">
            Pre-built configurations tailored to your industry. Apply a blueprint to get
            recommended account mappings, KPIs, and a dashboard layout in one click.
          </p>
        </div>
        <button
          onClick={handleLearn}
          disabled={learning}
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
        >
          {learning ? 'Saving...' : 'Create Blueprint from Current Setup'}
        </button>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={cn(
            'rounded-md px-4 py-3 text-sm',
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
              : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
          )}
        >
          {message.text}
        </div>
      )}

      {/* Active blueprint banner */}
      {activeBlueprint && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  Active Blueprint: {blueprints.find((b) => b.slug === activeBlueprint)?.name}
                </CardTitle>
                <Badge variant="outline" className="text-primary border-primary/30">
                  Active
                </Badge>
              </div>
              <button
                onClick={() => setActiveBlueprint(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Change
              </button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Search and filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search blueprints..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 sm:w-64"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIndustryFilter(null)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              !industryFilter
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            All
          </button>
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => setIndustryFilter(industryFilter === ind ? null : ind)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                industryFilter === ind
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {getIndustryIcon(ind)} {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Blueprint grid + preview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Blueprint list */}
        <div className="space-y-3 lg:col-span-1">
          {displayedBlueprints.length === 0 && (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No blueprints match your search.
            </p>
          )}
          {displayedBlueprints.map((bp) => (
            <button
              key={bp.slug}
              onClick={() => setSelectedSlug(bp.slug)}
              className={cn(
                'w-full rounded-lg border p-4 text-left transition-colors',
                selectedSlug === bp.slug
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'hover:border-primary/30 hover:bg-muted/50',
                activeBlueprint === bp.slug && 'border-primary/40'
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getIndustryIcon(bp.industry)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{bp.name}</span>
                    {activeBlueprint === bp.slug && (
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {bp.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {bp.common_integrations.slice(0, 3).map((int) => (
                      <Badge key={int} variant="secondary" className="text-[10px] capitalize">
                        {int}
                      </Badge>
                    ))}
                    {bp.common_integrations.length > 3 && (
                      <Badge variant="secondary" className="text-[10px]">
                        +{bp.common_integrations.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Preview panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span>{getIndustryIcon(selected.industry)}</span>
                      {selected.name}
                    </CardTitle>
                    <CardDescription className="mt-1">{selected.description}</CardDescription>
                  </div>
                  <button
                    onClick={handleApply}
                    disabled={applying || activeBlueprint === selected.slug}
                    className={cn(
                      'rounded-md px-4 py-2 text-sm font-medium',
                      activeBlueprint === selected.slug
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
                    )}
                  >
                    {applying
                      ? 'Applying...'
                      : activeBlueprint === selected.slug
                        ? 'Currently Active'
                        : 'Apply Blueprint'}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Account Mappings */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    Account Mappings ({selected.account_mappings.length})
                  </h4>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Source Pattern</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Subcategory</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.account_mappings.map((m, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-3 py-2 font-mono text-xs">{m.source_pattern}</td>
                            <td className="px-3 py-2">{m.target_category}</td>
                            <td className="px-3 py-2 text-muted-foreground">{m.target_subcategory}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* KPI Definitions */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    Recommended KPIs ({selected.kpi_definitions.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selected.kpi_definitions.map((kpi) => (
                      <Badge
                        key={kpi.key}
                        variant={kpi.priority === 'high' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {kpi.label}
                        {kpi.priority === 'high' && (
                          <span className="ml-1 opacity-60">*</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">* High priority KPIs</p>
                </div>

                {/* Dashboard Widgets */}
                {selected.dashboard_template.widgets && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      Dashboard Layout ({selected.dashboard_template.widgets.length} widgets)
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selected.dashboard_template.widgets.map((w, i) => (
                        <div
                          key={i}
                          className={cn(
                            'rounded-md border bg-muted/30 px-3 py-2 text-xs',
                            w.size === 'full' && 'col-span-2'
                          )}
                        >
                          <span className="font-medium">{w.label}</span>
                          <span className="text-muted-foreground ml-2">({w.size})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common Integrations */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Common Integrations</h4>
                  <div className="flex flex-wrap gap-2">
                    {selected.common_integrations.map((int) => (
                      <Badge key={int} variant="outline" className="capitalize">
                        {int}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Interview Prompts */}
                {selected.interview_prompts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      Additional Onboarding Questions
                    </h4>
                    <div className="space-y-2">
                      {selected.interview_prompts.map((p, i) => (
                        <div key={i} className="rounded-md border px-3 py-2">
                          <p className="text-sm">{p.question}</p>
                          <p className="text-xs text-muted-foreground mt-1">{p.context}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center min-h-[400px]">
              <CardContent>
                <p className="text-muted-foreground text-sm text-center">
                  Select a blueprint from the list to preview what it includes.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
