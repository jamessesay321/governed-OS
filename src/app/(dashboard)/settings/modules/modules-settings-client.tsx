'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';

/* ─── Types ─── */

interface ModuleItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  tier: string;
  credits: number;
  monthlyPrice: number | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  'financial-analysis': 'Financial Analysis',
  'forecasting-planning': 'Forecasting & Planning',
  'compliance-governance': 'Compliance & Governance',
  'growth-strategy': 'Growth & Strategy',
  'industry-packs': 'Industry Packs',
};

const TIER_COLOURS: Record<string, string> = {
  free: 'bg-emerald-100 text-emerald-800',
  starter: 'bg-blue-100 text-blue-800',
  professional: 'bg-violet-100 text-violet-800',
  enterprise: 'bg-amber-100 text-amber-800',
};

const STORAGE_KEY = 'grove_module_activations';

/* ─── Component ─── */

export function ModulesSettingsClient({
  orgId,
  role,
}: {
  orgId: string;
  role: string;
}) {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const canManage = role === 'owner' || role === 'admin' || role === 'advisor';

  // Load modules from API + merge with localStorage for persistence
  const loadModules = useCallback(async () => {
    try {
      const res = await fetch('/api/modules');
      if (res.ok) {
        const data = await res.json();
        const apiModules = data.modules as ModuleItem[];

        // Merge with localStorage activations for persistence across cold starts
        const stored = localStorage.getItem(`${STORAGE_KEY}_${orgId}`);
        const storedActive = stored ? (JSON.parse(stored) as string[]) : null;

        if (storedActive) {
          const storedSet = new Set(storedActive);
          setModules(
            apiModules.map((m) => ({
              ...m,
              isActive: m.isActive || storedSet.has(m.id),
            }))
          );
        } else {
          setModules(apiModules);
        }
      }
    } catch {
      console.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // Persist active module IDs to localStorage
  const persistToStorage = (updatedModules: ModuleItem[]) => {
    const activeIds = updatedModules.filter((m) => m.isActive).map((m) => m.id);
    localStorage.setItem(`${STORAGE_KEY}_${orgId}`, JSON.stringify(activeIds));
  };

  const toggleModule = async (moduleId: string) => {
    if (!canManage) return;
    setToggling(moduleId);

    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;

    const newActive = !mod.isActive;

    // Optimistic update
    const updated = modules.map((m) =>
      m.id === moduleId ? { ...m, isActive: newActive } : m
    );
    setModules(updated);
    persistToStorage(updated);

    try {
      const res = await fetch(`/api/modules/${orgId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, active: newActive }),
      });

      if (!res.ok) {
        // Revert on failure
        const reverted = modules.map((m) =>
          m.id === moduleId ? { ...m, isActive: !newActive } : m
        );
        setModules(reverted);
        persistToStorage(reverted);
      }
    } catch {
      // Revert on error
      const reverted = modules.map((m) =>
        m.id === moduleId ? { ...m, isActive: !newActive } : m
      );
      setModules(reverted);
      persistToStorage(reverted);
    } finally {
      setToggling(null);
    }
  };

  const categories = [...new Set(modules.map((m) => m.category))];
  const filteredModules = categoryFilter
    ? modules.filter((m) => m.category === categoryFilter)
    : modules;

  const activeCount = modules.filter((m) => m.isActive).length;

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/settings"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Settings
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Modules</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enable or disable optional features for your organisation
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{activeCount}</span> of{' '}
          {modules.length} active
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            !categoryFilter
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              cat === categoryFilter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading modules...
        </div>
      ) : (
        <div className="space-y-3">
          {filteredModules.map((mod) => (
            <div
              key={mod.id}
              className={cn(
                'rounded-lg border bg-card p-4 flex items-center justify-between transition-colors',
                mod.isActive && 'border-primary/30 bg-primary/5'
              )}
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{mod.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                    {CATEGORY_LABELS[mod.category] ?? mod.category}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0',
                      TIER_COLOURS[mod.tier] ?? ''
                    )}
                  >
                    {mod.tier}
                  </Badge>
                  {mod.monthlyPrice !== null && mod.monthlyPrice > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      £{mod.monthlyPrice}/mo
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {mod.description}
                </p>
              </div>
              <button
                onClick={() => toggleModule(mod.id)}
                disabled={!canManage || toggling === mod.id}
                className={cn(
                  'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
                  mod.isActive ? 'bg-primary' : 'bg-muted'
                )}
                title={
                  canManage
                    ? mod.isActive
                      ? 'Deactivate module'
                      : 'Activate module'
                    : 'Only admins can manage modules'
                }
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    mod.isActive ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {!canManage && (
        <p className="text-xs text-muted-foreground text-center">
          Only owners, admins, and advisors can manage modules.
        </p>
      )}
    </div>
  );
}
