'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/ai-reasoning';
import { cn } from '@/lib/utils';
import { getCategoryConfig } from '@/lib/modules/renderer';
import type { ModuleDefinition, ModuleCategory, ModuleTier } from '@/types/playbook';
import { MODULE_CATEGORIES } from '@/types/playbook';

type ModulesMarketplaceProps = {
  modules: ModuleDefinition[];
  orgId: string;
};

const TIER_CONFIG: Record<ModuleTier, { label: string; color: string; bgColor: string }> = {
  free: { label: 'Free', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40' },
  starter: { label: 'Starter', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  professional: { label: 'Pro', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
  enterprise: { label: 'Enterprise', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/40' },
};

const CREDIT_BALANCE = 250; // placeholder current plan balance

export function ModulesMarketplace({ modules, orgId }: ModulesMarketplaceProps) {
  const [localModules, setLocalModules] = useState(modules);
  const [activating, setActivating] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{
    moduleId: string;
    currentActive: boolean;
    moduleName: string;
    credits: number;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory | 'all'>('all');

  const filteredModules =
    selectedCategory === 'all'
      ? localModules
      : localModules.filter((m) => m.category === selectedCategory);

  const activeCount = localModules.filter((m) => m.isActive).length;
  const creditsUsed = localModules
    .filter((m) => m.isActive)
    .reduce((sum, m) => sum + m.credits, 0);

  async function toggleModule(moduleId: string, currentActive: boolean) {
    setConfirmToggle(null);
    setActivating(moduleId);
    try {
      const res = await fetch(`/api/modules/${orgId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, active: !currentActive }),
      });

      if (res.ok) {
        setLocalModules((prev) =>
          prev.map((m) =>
            m.id === moduleId ? { ...m, isActive: !currentActive } : m
          )
        );
      }
    } catch {
      // Activation failed silently
    } finally {
      setActivating(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Credit Balance Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Credit Balance</p>
            <p className="text-2xl font-bold">
              {CREDIT_BALANCE - creditsUsed}
              <span className="text-sm font-normal text-muted-foreground">
                {' '}/ {CREDIT_BALANCE} credits
              </span>
            </p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Modules</p>
            <p className="text-2xl font-bold">{activeCount}</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">Credits Used</p>
            <p className="text-2xl font-bold">
              {creditsUsed}
              <span className="text-sm font-normal text-muted-foreground"> /mo</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/modules/credits"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Buy Credits
          </Link>
          <Link
            href="/modules/active"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Active Modules
          </Link>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          All Modules ({localModules.length})
        </button>
        {MODULE_CATEGORIES.map((cat) => {
          const config = getCategoryConfig(cat);
          const count = localModules.filter((m) => m.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Module Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredModules.map((mod) => {
          const category = getCategoryConfig(mod.category);
          const tierConfig = TIER_CONFIG[mod.tier];
          const isLoading = activating === mod.id;

          return (
            <Card key={mod.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <ModuleIcon icon={mod.icon} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base leading-tight">{mod.name}</CardTitle>
                    </div>
                  </div>
                  {mod.isActive && (
                    <Badge variant="default" className="shrink-0 text-[10px]">Active</Badge>
                  )}
                </div>
                {/* Badges row */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                      category.bgColor,
                      category.color
                    )}
                  >
                    {category.label}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                      tierConfig.bgColor,
                      tierConfig.color
                    )}
                  >
                    {tierConfig.label}
                  </span>
                </div>
                <CardDescription className="mt-2 text-xs">{mod.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col pt-0">
                <ul className="mb-4 flex-1 space-y-1.5">
                  {mod.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <svg
                        className="mt-0.5 h-3 w-3 shrink-0 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Pricing */}
                <div className="mb-3 flex items-baseline gap-2">
                  {mod.credits === 0 ? (
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      Included Free
                    </span>
                  ) : (
                    <>
                      <span className="text-lg font-bold">{mod.credits}</span>
                      <span className="text-xs text-muted-foreground">credits/mo</span>
                      {mod.monthlyPrice !== null && (
                        <span className="text-xs text-muted-foreground">
                          or &pound;{mod.monthlyPrice}/mo
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setConfirmToggle({
                        moduleId: mod.id,
                        currentActive: mod.isActive,
                        moduleName: mod.name,
                        credits: mod.credits,
                      })
                    }
                    disabled={isLoading}
                    className={cn(
                      'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
                      mod.isActive
                        ? 'border bg-background hover:bg-muted'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    )}
                  >
                    {isLoading
                      ? 'Processing...'
                      : mod.isActive
                        ? 'Deactivate'
                        : mod.credits === 0
                          ? 'Activate Free'
                          : 'Activate'}
                  </button>
                  {mod.isActive && (
                    <Link
                      href={`/modules/${mod.slug}`}
                      className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Open
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirmation dialog for module toggle */}
      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.currentActive ? 'Deactivate Module' : 'Activate Module'}
        description={
          confirmToggle?.currentActive
            ? `Are you sure you want to deactivate "${confirmToggle.moduleName}"? This will free up ${confirmToggle.credits} credits/month.`
            : `Activate "${confirmToggle?.moduleName ?? ''}"? ${
                confirmToggle?.credits
                  ? `This will use ${confirmToggle.credits} credits/month from your balance.`
                  : 'This module is free and included in all plans.'
              }`
        }
        confirmLabel={confirmToggle?.currentActive ? 'Deactivate' : 'Activate'}
        variant={confirmToggle?.currentActive ? 'warning' : 'default'}
        onConfirm={() => {
          if (confirmToggle) toggleModule(confirmToggle.moduleId, confirmToggle.currentActive);
        }}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}

function ModuleIcon({ icon }: { icon: string }) {
  const paths: Record<string, React.ReactNode> = {
    HeartPulse: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
    TrendingUp: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    Target: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 100 12 6 6 0 000-12zm0 4a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
    Calculator: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm2.25-2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM5.25 20.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    Receipt: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
    Layers: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    Users: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zm14 14v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    ClipboardList: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    GitBranch: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12M18 9a3 3 0 100 6 3 3 0 000-6zm0 6c0 2-2 3-6 3s-6 0-6-3" />
      </svg>
    ),
    Landmark: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
      </svg>
    ),
    Shield: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    Scale: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-9-9l3-6h12l3 6M6 12a3 3 0 01-3 3h6a3 3 0 01-3-3zm12 0a3 3 0 01-3 3h6a3 3 0 01-3-3z" />
      </svg>
    ),
    Rocket: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3m3 3a22 22 0 005-11 22 22 0 00-11 5l3 3 3 3zm-3-3l-4 4m7-1v3.87a.2.2 0 01-.34.14L8 18M5 16l-1.66 1.66a.2.2 0 00.14.34H7" />
      </svg>
    ),
    Briefcase: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
    ShoppingCart: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6m4 16a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" />
      </svg>
    ),
    BarChart: (
      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V10M18 20V4M6 20v-4" />
      </svg>
    ),
  };

  return <>{paths[icon] ?? <div className="h-5 w-5" />}</>;
}
