'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Zap, Shield, Star, Check, ExternalLink } from 'lucide-react';
import { ROLE_HIERARCHY, type Role } from '@/types';

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type SubscriptionInfo = {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
};

type BudgetInfo = {
  used: number;
  limit: number; // -1 = unlimited
  resetDate: string;
};

type PlanCard = {
  id: string;
  name: string;
  price: number | 'custom';
  tokenLimit: string;
  features: string[];
  popular?: boolean;
};

const PLAN_CARDS: PlanCard[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    tokenLimit: '100K',
    features: [
      'Single Xero connection',
      '100K AI tokens/month',
      'Basic dashboard',
      'CSV exports',
      'Community support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    tokenLimit: '500K',
    popular: true,
    features: [
      'Everything in Free',
      '500K AI tokens/month',
      'KPI alerts & anomaly detection',
      'Scenario modelling',
      'Board pack generation',
      'Email support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 99,
    tokenLimit: '2M',
    features: [
      'Everything in Starter',
      '2M AI tokens/month',
      'Multi-entity support',
      'Custom KPIs & dashboards',
      'Knowledge vault',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'custom',
    tokenLimit: 'Unlimited',
    features: [
      'Everything in Growth',
      'Unlimited AI tokens',
      'SSO & advanced security',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'default';
    case 'past_due':
      return 'destructive';
    case 'cancelled':
      return 'secondary';
    default:
      return 'outline';
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function BillingClient({
  orgId,
  role,
  subscription,
  budget,
}: {
  orgId: string;
  role: string;
  subscription: SubscriptionInfo | null;
  budget: BudgetInfo;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = subscription?.plan ?? 'free';
  const canManage = hasMinRole(role as Role, 'admin');
  const isUnlimited = budget.limit === -1;
  const usagePct = isUnlimited ? 0 : Math.min(100, (budget.used / budget.limit) * 100);

  async function handleCheckout(planId: string) {
    if (!canManage) return;
    setLoading(planId);
    setError(null);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, orgId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create checkout session');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError('Failed to connect to billing service');
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    if (!canManage) return;
    setLoading('portal');
    setError(null);

    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to open billing portal');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError('Failed to connect to billing service');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: '#1c1b1b' }}>Billing & Plans</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription, view usage, and compare plans.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Current plan overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-100">
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <CardTitle className="text-base">Current Plan</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl font-bold capitalize" style={{ color: '#1c1b1b' }}>
                {currentPlan}
              </span>
              {subscription && (
                <Badge variant={statusBadgeVariant(subscription.status)} className="capitalize">
                  {subscription.status.replace('_', ' ')}
                </Badge>
              )}
            </div>

            {subscription?.cancelAtPeriodEnd && (
              <p className="text-sm text-amber-600 mb-2">
                Cancels at end of period ({subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : 'unknown'})
              </p>
            )}

            {subscription?.currentPeriodEnd && !subscription.cancelAtPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}

            {canManage && subscription?.hasStripeCustomer && (
              <button
                onClick={handlePortal}
                disabled={loading === 'portal'}
                className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4" />
                {loading === 'portal' ? 'Opening...' : 'Manage Billing'}
              </button>
            )}
          </CardContent>
        </Card>

        {/* Token usage */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-100">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-base">Token Usage</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">
                    {formatTokens(budget.used)} used
                  </span>
                  <span className="font-medium">
                    {isUnlimited ? 'Unlimited' : formatTokens(budget.limit)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePct > 80 ? 'bg-red-500' : usagePct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: isUnlimited ? '0%' : `${Math.min(100, usagePct)}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Resets {new Date(budget.resetDate).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan comparison grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#1c1b1b' }}>Compare Plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_CARDS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isUpgrade = getPlanRank(plan.id) > getPlanRank(currentPlan);
            const isDowngrade = getPlanRank(plan.id) < getPlanRank(currentPlan);

            return (
              <Card
                key={plan.id}
                className={`relative ${plan.popular ? 'border-emerald-300 shadow-md' : ''} ${
                  isCurrent ? 'ring-2 ring-emerald-500' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.price === 'custom' ? (
                      <span className="text-2xl font-bold" style={{ color: '#1c1b1b' }}>Custom</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold" style={{ color: '#1c1b1b' }}>
                          ${plan.price}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                      </>
                    )}
                  </CardDescription>
                  <p className="text-xs text-muted-foreground mt-1">
                    {plan.tokenLimit} AI tokens/month
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="w-full rounded-md border border-emerald-200 bg-emerald-50 py-2 text-center text-sm font-medium text-emerald-700">
                      Current Plan
                    </div>
                  ) : canManage && plan.id !== 'free' && plan.price !== 'custom' ? (
                    <button
                      onClick={() => handleCheckout(plan.id)}
                      disabled={loading === plan.id}
                      className={`w-full rounded-md py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                        isUpgrade
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {loading === plan.id
                        ? 'Redirecting...'
                        : isUpgrade
                          ? 'Upgrade'
                          : isDowngrade
                            ? 'Downgrade'
                            : 'Select'}
                    </button>
                  ) : canManage && plan.price === 'custom' ? (
                    <a
                      href="mailto:sales@grove.dev"
                      className="block w-full rounded-md border border-gray-300 py-2 text-center text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Contact Sales
                    </a>
                  ) : !canManage ? (
                    <div className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 text-center text-sm text-muted-foreground">
                      <Shield className="h-3 w-3 inline mr-1" />
                      Admin required
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getPlanRank(planId: string): number {
  const ranks: Record<string, number> = { free: 0, starter: 1, growth: 2, enterprise: 3 };
  return ranks[planId] ?? 0;
}
