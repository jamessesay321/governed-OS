'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getCategoryConfig } from '@/lib/modules/renderer';
import type { ModuleDefinition } from '@/types/playbook';

type ModulesMarketplaceProps = {
  modules: ModuleDefinition[];
  orgId: string;
};

export function ModulesMarketplace({ modules, orgId }: ModulesMarketplaceProps) {
  const [localModules, setLocalModules] = useState(modules);
  const [activating, setActivating] = useState<string | null>(null);

  async function toggleModule(moduleId: string, currentActive: boolean) {
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
    <div className="grid gap-6 sm:grid-cols-2">
      {localModules.map((mod) => {
        const category = getCategoryConfig(mod.category);
        const isLoading = activating === mod.id;

        return (
          <Card key={mod.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ModuleIcon icon={mod.icon} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{mod.name}</CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', category.bgColor, category.color)}>
                        {category.label}
                      </span>
                      {mod.isActive && (
                        <Badge variant="default" className="text-[10px]">Active</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <CardDescription className="mt-2">{mod.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <ul className="mb-4 flex-1 space-y-1.5">
                {mod.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <svg className="mt-0.5 h-3 w-3 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleModule(mod.id, mod.isActive)}
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
  };

  return paths[icon] ?? <div className="h-5 w-5" />;
}
