'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const MODULES = [
  { id: 'tax-calculator', name: 'Tax Calculator', description: 'Corp Tax, VAT, PAYE calculations for UK businesses', category: 'Finance', active: false },
  { id: 'debt-overview', name: 'Debt Overview', description: 'Loan tracking, repayment schedules, refinancing analysis', category: 'Finance', active: false },
  { id: 'working-capital', name: 'Working Capital', description: 'AR/AP days, cash conversion cycle, working capital trends', category: 'Finance', active: false },
  { id: 'goalseek', name: 'Goalseek', description: 'Reverse scenario planning: "What do I need to hit target X?"', category: 'Intelligence', active: true },
  { id: 'benchmarks', name: 'Industry Benchmarks', description: 'Compare your metrics against industry averages', category: 'Intelligence', active: false },
  { id: 'headcount', name: 'Headcount Planning', description: 'Workforce planning, salary budgets, cost per hire', category: 'People', active: false },
  { id: 'consolidation', name: 'Multi-Entity', description: 'Group consolidation across multiple companies', category: 'Enterprise', active: false },
];

export default function ModulesSettingsPage() {
  const [modules, setModules] = useState(MODULES);

  const toggleModule = (id: string) => {
    setModules((prev) => prev.map((m) => m.id === id ? { ...m, active: !m.active } : m));
  };

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">&larr; Settings</Link>
      <div>
        <h2 className="text-2xl font-bold">Modules</h2>
        <p className="text-sm text-muted-foreground mt-1">Enable or disable optional features</p>
      </div>
      <div className="space-y-3">
        {modules.map((mod) => (
          <div key={mod.id} className="rounded-lg border bg-card p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{mod.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{mod.category}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
            </div>
            <button
              onClick={() => toggleModule(mod.id)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                mod.active ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                mod.active ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
