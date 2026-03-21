'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getMockServiceBreakdown,
  getMockInvoices,
  getRecommendedBundles,
} from '@/lib/billing/billing-data';

const TABS = ['Overview', 'Invoices', 'Payment'] as const;
type Tab = (typeof TABS)[number];

const AGENT_COLORS: Record<string, string> = {
  'Finance Agent': 'bg-blue-500',
  'Marketing Agent': 'bg-orange-500',
  'Project Management Agent': 'bg-violet-500',
  'Strategy Agent': 'bg-cyan-500',
  'Secretarial Agent': 'bg-rose-500',
};

const BUNDLE_BORDER_COLORS: Record<string, string> = {
  amber: 'border-t-amber-500',
  purple: 'border-t-purple-500',
  emerald: 'border-t-emerald-500',
};

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

export function BillingClient() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  const breakdown = getMockServiceBreakdown();
  const invoices = getMockInvoices();
  const bundles = getRecommendedBundles();

  const platformValue = breakdown.platform.reduce((s, f) => s + f.marketValue, 0);

  return (
    <div className="flex-1 space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-foreground">Billing</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Billing &amp; Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription, review invoices, and track the value you receive from Governed OS.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Included Free Forever */}
      <Card className="border-emerald-200">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Included Free Forever</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your foundation — on top of your free tier, bundles add specialist capabilities.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['AI Setup Assistant', 'Budget Manager', 'Chart of Accounts', 'Data Quality', 'Dashboard', 'KPI Tracker', 'Governance Centre'].map((f) => (
                  <Badge key={f} variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">{f}</Badge>
                ))}
              </div>
            </div>
            <Link href="/proposal" className="shrink-0">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                View AI Strategy
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/*  OVERVIEW TAB                                                    */}
      {/* ================================================================ */}
      {activeTab === 'Overview' && (
        <div className="space-y-8">
          {/* Monthly Summary Hero */}
          <div className="rounded-xl border p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Investment</p>
                <p className="mt-1 text-3xl font-bold">
                  &pound;{breakdown.totalMonthlyCharge}
                  <span className="text-base font-normal text-muted-foreground">/mo</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Total value: &pound;{breakdown.totalMonthlyValue}/mo
                </p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  You save &pound;{breakdown.totalMonthlyValue - breakdown.totalMonthlyCharge}/mo
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Next billing date: {breakdown.nextBillingDate} &middot; {breakdown.currentPlan} Plan
            </p>
          </div>

          {/* Platform Services */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform Services</CardTitle>
              <p className="text-sm text-muted-foreground">Included with your plan</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {breakdown.platform.map((feature) => (
                  <li key={feature.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-emerald-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {feature.name}
                    </span>
                    <span className="text-muted-foreground">
                      <span className="line-through text-muted-foreground/60">
                        &pound;{feature.marketValue}/mo
                      </span>{' '}
                      <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        Included
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t pt-4 text-sm font-medium text-muted-foreground">
                Total included value: &pound;{platformValue}/mo
              </div>
            </CardContent>
          </Card>

          {/* Active Modules */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Modules</CardTitle>
              <p className="text-sm text-muted-foreground">Pay-as-you-grow specialist tools</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {breakdown.modules.map((mod) => (
                  <li key={mod.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      {mod.name}
                      {mod.credits > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({mod.credits} credits)
                        </span>
                      )}
                    </span>
                    <span className="font-medium">
                      {mod.monthlyPrice === 0 ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        >
                          Complimentary
                        </Badge>
                      ) : (
                        <>&pound;{mod.monthlyPrice}/mo</>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t pt-4">
                <Link
                  href="/modules"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Browse full marketplace &rarr;
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Active Agents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Agents</CardTitle>
              <p className="text-sm text-muted-foreground">
                Autonomous agents working for your business
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {breakdown.agents.map((agent) => (
                  <li
                    key={agent.name}
                    className={cn(
                      'flex items-center justify-between text-sm',
                      !agent.active && 'opacity-50'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-block h-2.5 w-2.5 rounded-full',
                          agent.active
                            ? AGENT_COLORS[agent.name] ?? 'bg-gray-400'
                            : 'bg-gray-300 dark:bg-gray-600'
                        )}
                      />
                      {agent.name}
                    </span>
                    <span className="font-medium">
                      {agent.active ? (
                        <>&pound;{agent.monthlyPrice}/mo</>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not active</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-center text-sm">
                <p className="font-medium">Activate all 5 for &pound;499/mo</p>
                <p className="text-xs text-muted-foreground">
                  Save &pound;{breakdown.agents.reduce((s, a) => s + a.monthlyPrice, 0) - 499}/mo
                  versus individual pricing
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Bundles */}
          <div>
            <h2 className="text-lg font-semibold">Recommended for you</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Tailored package recommendations based on your business profile.
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              {bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className={cn(
                    'relative rounded-xl border border-t-4 bg-card p-6',
                    BUNDLE_BORDER_COLORS[bundle.color] ?? 'border-t-gray-400',
                    bundle.recommended && 'border-2 border-t-4 shadow-md'
                  )}
                >
                  {bundle.recommended && (
                    <Badge className="absolute -top-3 right-4 bg-purple-600 text-white">
                      Recommended
                    </Badge>
                  )}
                  <h3 className="text-lg font-bold">{bundle.name}</h3>
                  <p className="text-xs text-muted-foreground">{bundle.tagline}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{bundle.description}</p>

                  <div className="mt-4">
                    <span className="text-2xl font-bold">&pound;{bundle.monthlyPrice}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Save &pound;{bundle.savings}/mo (was &pound;{bundle.fullPrice})
                    </p>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Modules
                    </p>
                    <ul className="space-y-1">
                      {bundle.modules.map((m) => (
                        <li key={m} className="flex items-center gap-1.5 text-xs">
                          <svg
                            className="h-3 w-3 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Agents
                    </p>
                    <ul className="space-y-1">
                      {bundle.agents.map((a) => (
                        <li key={a} className="flex items-center gap-1.5 text-xs">
                          <span
                            className={cn(
                              'inline-block h-2 w-2 rounded-full',
                              AGENT_COLORS[a] ?? 'bg-gray-400'
                            )}
                          />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Features
                    </p>
                    <ul className="space-y-1">
                      {bundle.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs">
                          <svg
                            className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    className={cn('mt-6 w-full', !bundle.recommended && 'variant-outline')}
                    variant={bundle.recommended ? 'default' : 'outline'}
                  >
                    Select Bundle
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/*  INVOICES TAB                                                    */}
      {/* ================================================================ */}
      {activeTab === 'Invoices' && (
        <div className="space-y-8">
          {/* Invoice Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice History</CardTitle>
              <p className="text-sm text-muted-foreground">
                All invoices for your Governed OS subscription
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Period
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Total Value
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Amount Charged
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Savings
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-medium">{inv.period}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          &pound;{inv.subtotalValue}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          &pound;{inv.totalCharged}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                          You saved &pound;{inv.savings}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                              STATUS_STYLES[inv.status]
                            )}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="ghost" size="sm" className="text-xs">
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm">
                  Download all invoices
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Expanded Latest Invoice */}
          {invoices.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {invoices[0].period} &mdash; Detailed Breakdown
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Invoice {invoices[0].id}</p>
                  </div>
                  <span
                    className={cn(
                      'inline-block rounded-full px-3 py-1 text-xs font-medium capitalize',
                      STATUS_STYLES[invoices[0].status]
                    )}
                  >
                    {invoices[0].status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {/* Platform Items */}
                  <div className="mb-2">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Platform (Included)
                    </p>
                    {invoices[0].lineItems
                      .filter((li) => li.included)
                      .map((li) => (
                        <div
                          key={li.description}
                          className="flex items-center justify-between border-b py-2 text-sm last:border-b-0"
                        >
                          <span className="text-muted-foreground">{li.description}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground/60 line-through">
                              &pound;{li.fullValue}
                            </span>
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            >
                              Included
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Module Items */}
                  <div className="mb-2">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Modules
                    </p>
                    {invoices[0].lineItems
                      .filter((li) => !li.included && !li.description.includes('Agent') && !li.description.includes('Plan'))
                      .map((li) => (
                        <div
                          key={li.description}
                          className="flex items-center justify-between border-b py-2 text-sm last:border-b-0"
                        >
                          <span>{li.description}</span>
                          <div className="flex items-center gap-3">
                            {li.complimentary ? (
                              <>
                                <span className="text-xs text-muted-foreground/60 line-through">
                                  &pound;{li.fullValue}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                >
                                  Complimentary
                                </Badge>
                              </>
                            ) : (
                              <span className="font-medium">&pound;{li.amount}</span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Agent Items */}
                  <div className="mb-2">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Agents
                    </p>
                    {invoices[0].lineItems
                      .filter((li) => li.description.includes('Agent'))
                      .map((li) => (
                        <div
                          key={li.description}
                          className="flex items-center justify-between border-b py-2 text-sm last:border-b-0"
                        >
                          <span>{li.description}</span>
                          <span className="font-medium">&pound;{li.amount}</span>
                        </div>
                      ))}
                  </div>

                  {/* Plan */}
                  <div className="mb-2">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Plan
                    </p>
                    {invoices[0].lineItems
                      .filter((li) => li.description.includes('Plan'))
                      .map((li) => (
                        <div
                          key={li.description}
                          className="flex items-center justify-between border-b py-2 text-sm last:border-b-0"
                        >
                          <span>{li.description}</span>
                          <span className="font-medium">&pound;{li.amount}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="mt-4 space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Total value delivered</span>
                    <span>&pound;{invoices[0].subtotalValue}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>Your investment</span>
                    <span>&pound;{invoices[0].totalCharged}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Saving &pound;{invoices[0].savings}/mo
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/*  PAYMENT TAB                                                     */}
      {/* ================================================================ */}
      {activeTab === 'Payment' && (
        <div className="space-y-6">
          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-16 items-center justify-center rounded-lg border bg-muted text-xs font-bold tracking-wider text-muted-foreground">
                  VISA
                </div>
                <div>
                  <p className="font-medium">&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4242</p>
                  <p className="text-sm text-muted-foreground">Expires: 08/2028</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="outline">Update Payment Method</Button>
                <Button variant="outline">Add Payment Method</Button>
              </div>
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Billing Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm leading-relaxed">
                <p className="font-medium">ALONUKO Ltd</p>
                <p className="text-muted-foreground">45 Conduit Street</p>
                <p className="text-muted-foreground">Mayfair, London W1S 2YP</p>
              </div>
              <div className="mt-4 border-t pt-4 text-sm">
                <span className="text-muted-foreground">VAT Number:</span>{' '}
                <span className="font-medium">GB 123 456 789</span>
              </div>
              <div className="mt-4">
                <Button variant="outline">Edit Billing Address</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
