export type PlanId = 'free' | 'starter' | 'growth' | 'enterprise';

export type PlanDefinition = {
  id: PlanId;
  name: string;
  price: number | 'custom';
  stripePriceId: string | null;
  tokenLimit: number;
  features: string[];
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    stripePriceId: null,
    tokenLimit: 100_000,
    features: [
      'Single Xero connection',
      '100K AI tokens/month',
      'Basic dashboard',
      'CSV exports',
      'Community support',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null,
    tokenLimit: 500_000,
    features: [
      'Everything in Free',
      '500K AI tokens/month',
      'KPI alerts & anomaly detection',
      'Scenario modelling',
      'Board pack generation',
      'Email support',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 99,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH ?? null,
    tokenLimit: 2_000_000,
    features: [
      'Everything in Starter',
      '2M AI tokens/month',
      'Multi-entity support',
      'Custom KPIs & dashboards',
      'Knowledge vault',
      'Priority support',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'custom',
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? null,
    tokenLimit: Infinity,
    features: [
      'Everything in Growth',
      'Unlimited AI tokens',
      'SSO & advanced security',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
};

/** Get a plan by ID, defaulting to free */
export function getPlan(planId: string): PlanDefinition {
  return PLANS[planId as PlanId] ?? PLANS.free;
}
