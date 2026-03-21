'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AGENTS, BUNDLE_PRICE, type AgentDefinition } from '@/lib/agents/registry';
import { getRecommendedBundles } from '@/lib/billing/billing-data';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PLAN_TIERS = [
  { name: 'Starter', credits: 100, price: 29, maxCredits: 149 },
  { name: 'Professional', credits: 250, price: 79, maxCredits: 499 },
  { name: 'Enterprise', credits: 750, price: 199, maxCredits: 1000 },
];

const PLATFORM_FEATURES = [
  'Financial Dashboard & KPI Tracking',
  'Variance Analysis & AI Intelligence',
  'Report Builder & Knowledge Vault',
  'Scenario Modelling & Playbook',
  'Xero Integration & Bank Feeds',
  'Unlimited team members',
];

const agentColorMap: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-500',    ring: 'ring-blue-500' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-500',  ring: 'ring-purple-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-500', ring: 'ring-emerald-500' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-500',   ring: 'ring-amber-500' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-500',    ring: 'ring-rose-500' },
};

const bundleColorMap: Record<string, { border: string; bg: string; text: string }> = {
  amber:   { border: 'border-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700' },
  purple:  { border: 'border-purple-500',  bg: 'bg-purple-50',  text: 'text-purple-700' },
  emerald: { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  const [creditSlider, setCreditSlider] = useState(250);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set(['agent-finance', 'agent-secretarial']));

  const bundles = getRecommendedBundles();

  // Determine plan tier from credit slider
  const currentTier = useMemo(() => {
    return PLAN_TIERS.find((t) => creditSlider <= t.maxCredits) ?? PLAN_TIERS[PLAN_TIERS.length - 1];
  }, [creditSlider]);

  // Calculate agent pricing
  const allSelected = selectedAgents.size === AGENTS.length;
  const agentTotal = useMemo(() => {
    if (allSelected) return BUNDLE_PRICE;
    return AGENTS.filter((a) => selectedAgents.has(a.id)).reduce((sum, a) => sum + a.monthlyPrice, 0);
  }, [selectedAgents, allSelected]);

  const individualAgentTotal = AGENTS.filter((a) => selectedAgents.has(a.id)).reduce((sum, a) => sum + a.monthlyPrice, 0);
  const bundleSavings = allSelected ? individualAgentTotal - BUNDLE_PRICE : 0;

  // Total
  const totalMonthly = currentTier.price + agentTotal;

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex-1 space-y-8 p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/billing" className="hover:text-foreground">Billing</Link>
        <span>/</span>
        <span className="text-foreground">Pricing</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1c1b1b' }}>
          Estimate Your Monthly Investment
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Your platform access is included. Choose the modules and agents that fit your business —
          adjust anytime as you grow.
        </p>
      </div>

      {/* Platform Base — Always Included */}
      <Card className="border-t-4" style={{ borderTopColor: 'oklch(0.65 0.22 25)' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Platform Access</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Everything you need to run your financial command centre</p>
            </div>
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
              Included
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {PLATFORM_FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Credits Slider */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Module Credits</CardTitle>
          <p className="text-xs text-muted-foreground">
            Credits unlock specialist modules. Slide to estimate your monthly needs.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Monthly credits</span>
              <span className="text-lg font-bold">{creditSlider}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1000}
              step={10}
              value={creditSlider}
              onChange={(e) => setCreditSlider(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[oklch(0.65_0.22_25)]"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0</span>
              <span>250</span>
              <span>500</span>
              <span>750</span>
              <span>1000</span>
            </div>
          </div>

          {/* Tier indicator */}
          <div className="grid gap-3 md:grid-cols-3">
            {PLAN_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={cn(
                  'rounded-lg border p-4 transition-all',
                  currentTier.name === tier.name
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'bg-card'
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{tier.name}</p>
                  {currentTier.name === tier.name && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                      Selected
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xl font-bold">
                  £{tier.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground">{tier.credits} credits included</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">AI Agents</CardTitle>
              <p className="text-xs text-muted-foreground">Select the agents you need. All 5 unlocks bundle pricing.</p>
            </div>
            {allSelected && (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                Bundle applied, saving £{bundleSavings}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AGENTS.map((agent) => {
              const selected = selectedAgents.has(agent.id);
              const colors = agentColorMap[agent.color] ?? agentColorMap.blue;

              return (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={cn(
                    'rounded-lg border p-4 text-left transition-all',
                    selected
                      ? `${colors.bg} ${colors.border} ring-1 ${colors.ring}`
                      : 'bg-card hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className={cn('text-sm font-semibold', selected ? colors.text : 'text-foreground')}>
                      {agent.name}
                    </p>
                    <div className={cn(
                      'h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
                      selected ? `${colors.border} ${colors.bg}` : 'border-muted-foreground/30'
                    )}>
                      {selected && (
                        <svg className={cn('h-3 w-3', colors.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{agent.tagline}</p>
                  <p className={cn('text-sm font-bold mt-2', selected ? colors.text : 'text-foreground')}>
                    £{agent.monthlyPrice}<span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                </button>
              );
            })}
          </div>
          {allSelected && (
            <div className="mt-4 rounded-lg p-3 text-center text-sm" style={{ backgroundColor: '#f1edea' }}>
              <span className="font-semibold" style={{ color: '#1c1b1b' }}>
                Bundle pricing applied: £{BUNDLE_PRICE}/mo
              </span>
              <span className="text-muted-foreground"> (save £{bundleSavings} vs individual)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Estimate */}
      <Card className="border-2" style={{ borderColor: 'oklch(0.65 0.22 25)' }}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Estimated monthly investment</p>
              <p className="text-4xl font-bold mt-1" style={{ color: '#1c1b1b' }}>
                £{totalMonthly.toLocaleString()}
                <span className="text-lg font-normal text-muted-foreground">/mo</span>
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                <span>Platform: Included</span>
                <span>Modules: £{currentTier.price}</span>
                <span>Agents: £{agentTotal}</span>
              </div>
            </div>
            <Button size="lg" className="shrink-0">
              Get Started
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Bundles */}
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#1c1b1b' }}>Recommended for You</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Tailored package recommendations based on your business profile.
        </p>
        <div className="grid gap-6 lg:grid-cols-3">
          {bundles.map((bundle) => {
            const colors = bundleColorMap[bundle.color] ?? bundleColorMap.purple;
            return (
              <Card
                key={bundle.id}
                className={cn(
                  'flex flex-col border-t-4',
                  colors.border,
                  bundle.recommended && 'ring-2 ring-primary'
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{bundle.name}</CardTitle>
                    {bundle.recommended && (
                      <Badge className="bg-primary text-primary-foreground text-[10px]">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{bundle.tagline}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <div>
                    <p className={cn('text-2xl font-bold', colors.text)}>
                      £{bundle.monthlyPrice}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="line-through">£{bundle.fullPrice}</span>{' '}
                      <span className="text-emerald-600 font-medium">Save £{bundle.savings}/mo</span>
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{bundle.description}</p>

                  {/* Includes */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
                      Modules
                    </p>
                    <div className="space-y-1">
                      {bundle.modules.map((m) => (
                        <p key={m} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', colors.border.replace('border', 'bg'))} />
                          {m}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
                      Agents
                    </p>
                    <div className="space-y-1">
                      {bundle.agents.map((a) => (
                        <p key={a} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', colors.border.replace('border', 'bg'))} />
                          {a}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mt-auto">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
                      Key benefits
                    </p>
                    <ul className="space-y-1.5">
                      {bundle.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <svg className={cn('h-3 w-3 mt-0.5 shrink-0', colors.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    className="w-full mt-2"
                    variant={bundle.recommended ? 'default' : 'outline'}
                  >
                    Select {bundle.name}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Enterprise CTA */}
      <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: '#f1edea' }}>
        <h3 className="text-lg font-semibold" style={{ color: '#1c1b1b' }}>
          Need custom limits or dedicated support?
        </h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          We work with growing businesses that need tailored solutions. Let&apos;s discuss what Grove can do for you.
        </p>
        <Button variant="outline" className="mt-4">
          Contact Us
        </Button>
      </div>
    </div>
  );
}
