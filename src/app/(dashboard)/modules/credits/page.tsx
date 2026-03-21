'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

const CREDIT_PACKS = [
  { id: 'pack-50', credits: 50, price: 19, perCredit: 0.38, popular: false },
  { id: 'pack-150', credits: 150, price: 49, perCredit: 0.33, popular: true },
  { id: 'pack-500', credits: 500, price: 129, perCredit: 0.26, popular: false },
  { id: 'pack-1000', credits: 1000, price: 199, perCredit: 0.20, popular: false },
];

const USAGE_HISTORY = [
  { date: '2026-03-18', module: 'Cash Flow Forecaster', credits: 5, type: 'debit' as const },
  { date: '2026-03-15', module: 'Investment Readiness', credits: 10, type: 'debit' as const },
  { date: '2026-03-12', module: 'Budget Builder', credits: 5, type: 'debit' as const },
  { date: '2026-03-01', module: 'Monthly Plan Allocation', credits: 250, type: 'credit' as const },
  { date: '2026-02-27', module: 'SaaS Metrics Suite', credits: 10, type: 'debit' as const },
  { date: '2026-02-22', module: 'Pricing & Margin Analyser', credits: 5, type: 'debit' as const },
  { date: '2026-02-18', module: 'Three-Way Forecasting', credits: 10, type: 'debit' as const },
  { date: '2026-02-01', module: 'Monthly Plan Allocation', credits: 250, type: 'credit' as const },
];

const PLAN_TIERS = [
  { name: 'Starter', credits: 100, price: 29, current: false },
  { name: 'Professional', credits: 250, price: 79, current: true },
  { name: 'Enterprise', credits: 750, price: 199, current: false },
];

export default function CreditsPage() {
  const balance = 230;
  const included = 250;

  return (
    <div className="flex-1 space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/modules" className="hover:text-foreground">Marketplace</Link>
        <span>/</span>
        <span className="text-foreground">Credits</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Credits &amp; Billing</h1>
        <p className="text-muted-foreground">Manage your credit balance, view usage history and purchase additional credits.</p>
      </div>

      {/* Balance Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
          <p className="mt-1 text-3xl font-bold">{balance}</p>
          <p className="mt-1 text-xs text-muted-foreground">of {included} monthly credits</p>
          <div className="mt-3 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${(balance / included) * 100}%` }}
            />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Credits Used This Month</p>
          <p className="mt-1 text-3xl font-bold">{included - balance}</p>
          <p className="mt-1 text-xs text-muted-foreground">across 4 active modules</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
          <p className="mt-1 text-3xl font-bold">Professional</p>
          <p className="mt-1 text-xs text-muted-foreground">&pound;79/mo &middot; {included} credits included</p>
        </div>
      </div>

      {/* Plan Comparison */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_TIERS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'rounded-lg border p-6',
                plan.current ? 'border-primary bg-primary/5' : 'bg-card'
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{plan.name}</h3>
                {plan.current && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-bold">&pound;{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="mt-1 text-sm text-muted-foreground">{plan.credits} credits/month included</p>
              <button
                disabled={plan.current}
                className={cn(
                  'mt-4 w-full rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  plan.current
                    ? 'border bg-background text-muted-foreground'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {plan.current ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Buy Credit Packs */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Buy Additional Credits</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={cn(
                'relative rounded-lg border bg-card p-6',
                pack.popular && 'border-primary'
              )}
            >
              {pack.popular && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Most Popular
                </span>
              )}
              <p className="text-2xl font-bold">{pack.credits}</p>
              <p className="text-sm text-muted-foreground">credits</p>
              <p className="mt-2 text-lg font-semibold">&pound;{pack.price}</p>
              <p className="text-xs text-muted-foreground">&pound;{pack.perCredit.toFixed(2)} per credit</p>
              <button className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Purchase
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Usage History */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Usage History</h2>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Credits</th>
              </tr>
            </thead>
            <tbody>
              {USAGE_HISTORY.map((entry, i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="px-4 py-3 text-muted-foreground">{entry.date}</td>
                  <td className="px-4 py-3">{entry.module}</td>
                  <td
                    className={cn(
                      'px-4 py-3 text-right font-medium',
                      entry.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                    )}
                  >
                    {entry.type === 'credit' ? '+' : '-'}{entry.credits}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
