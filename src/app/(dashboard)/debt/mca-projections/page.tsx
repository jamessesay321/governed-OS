import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import type { DebtFacility } from '@/types/debt';
import {
  debtFacilityToMCA,
  projectAllMCAFacilities,
  type MCAProjectionResult,
  type CashflowProjectionInput,
} from '@/lib/financial/mca-projection';
import { MCAProjectionsClient } from './mca-projections-client';

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Get sorted period list for the last N months from a given latest period.
 */
function getRecentPeriods(latestPeriod: string, count: number): string[] {
  const [y, m] = latestPeriod.substring(0, 7).split('-').map(Number);
  const periods: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const totalMonths = y * 12 + (m - 1) - i;
    const py = Math.floor(totalMonths / 12);
    const pm = (totalMonths % 12) + 1;
    periods.push(`${py}-${String(pm).padStart(2, '0')}`);
  }
  return periods;
}

// ── Page ─────────────────────────────────────────────────────────────

export default async function MCAProjectionsPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // 1. Fetch active MCA facilities
  const { data: rawFacilities } = await supabase
    .from('debt_facilities')
    .select('*')
    .eq('org_id', orgId)
    .eq('facility_type', 'mca')
    .eq('status', 'active')
    .order('current_balance', { ascending: false });

  const mcaFacilities = (rawFacilities ?? []) as unknown as DebtFacility[];

  // 2. Get latest period from normalised_financials
  const { data: latestPeriodRow } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId)
    .order('period', { ascending: false })
    .limit(1);

  const latestPeriod = (latestPeriodRow as unknown as Array<{ period: string }> | null)?.[0]?.period;

  // 3. Fetch historical revenue data
  // We need to identify revenue by source (Shopify vs Stripe)
  // Strategy: Check chart_of_accounts for Shopify/Stripe tagged revenue accounts
  // Fall back to total revenue split by known ratio if source breakdown unavailable

  let historicalShopifyRevenue: { period: string; amount: number }[] = [];
  let historicalStripeRevenue: { period: string; amount: number }[] = [];
  let hasSourceBreakdown = false;

  if (latestPeriod) {
    const recentPeriods = getRecentPeriods(latestPeriod, 12);

    // Fetch chart of accounts for revenue classification
    const { data: coaData } = await supabase
      .from('chart_of_accounts')
      .select('id, name, class, type')
      .eq('org_id', orgId);

    const coaRows = (coaData ?? []) as unknown as Array<{
      id: string; name: string; class: string; type: string;
    }>;

    // Identify Shopify and Stripe revenue accounts by name patterns
    const shopifyAccountIds: string[] = [];
    const stripeAccountIds: string[] = [];
    const revenueAccountIds: string[] = [];

    for (const acct of coaRows) {
      const cls = (acct.class ?? '').toUpperCase();
      const name = (acct.name ?? '').toLowerCase();
      if (cls !== 'REVENUE' && cls !== 'OTHERINCOME') continue;
      revenueAccountIds.push(acct.id);
      if (name.includes('shopify')) {
        shopifyAccountIds.push(acct.id);
      } else if (name.includes('stripe') || name.includes('acuity') || name.includes('consultation')) {
        stripeAccountIds.push(acct.id);
      }
    }

    hasSourceBreakdown = shopifyAccountIds.length > 0 || stripeAccountIds.length > 0;

    // Fetch financial data for recent periods
    const { data: financialData } = await supabase
      .from('normalised_financials')
      .select('period, amount, account_id')
      .eq('org_id', orgId)
      .in('account_id', revenueAccountIds.length > 0 ? revenueAccountIds : ['__none__'])
      .order('period', { ascending: true });

    const finRows = (financialData ?? []) as unknown as Array<{
      period: string; amount: number; account_id: string;
    }>;

    // Aggregate by period and source
    const shopifyByPeriod = new Map<string, number>();
    const stripeByPeriod = new Map<string, number>();
    const totalByPeriod = new Map<string, number>();

    for (const row of finRows) {
      const p = row.period?.substring(0, 7); // Normalise to YYYY-MM
      if (!p) continue;
      // Only include recent periods
      if (!recentPeriods.includes(p)) continue;

      const amount = Math.abs(Number(row.amount) || 0);
      totalByPeriod.set(p, (totalByPeriod.get(p) ?? 0) + amount);

      if (shopifyAccountIds.includes(row.account_id)) {
        shopifyByPeriod.set(p, (shopifyByPeriod.get(p) ?? 0) + amount);
      }
      if (stripeAccountIds.includes(row.account_id)) {
        stripeByPeriod.set(p, (stripeByPeriod.get(p) ?? 0) + amount);
      }
    }

    if (hasSourceBreakdown) {
      // Use actual source breakdown
      for (const period of recentPeriods) {
        const shopifyAmt = shopifyByPeriod.get(period) ?? 0;
        const stripeAmt = stripeByPeriod.get(period) ?? 0;
        if (shopifyAmt > 0) historicalShopifyRevenue.push({ period, amount: shopifyAmt });
        if (stripeAmt > 0) historicalStripeRevenue.push({ period, amount: stripeAmt });
      }
    } else {
      // Fallback: split total revenue using known Alonuko ratios
      // Shopify is ~75% of revenue (dress deposits + balance payments)
      // Stripe is ~25% (Acuity consultation/appointment income)
      const SHOPIFY_RATIO = 0.75;
      const STRIPE_RATIO = 0.25;

      for (const period of recentPeriods) {
        const total = totalByPeriod.get(period) ?? 0;
        if (total > 0) {
          historicalShopifyRevenue.push({ period, amount: total * SHOPIFY_RATIO });
          historicalStripeRevenue.push({ period, amount: total * STRIPE_RATIO });
        }
      }
    }
  }

  // 4. Convert facilities and run projections
  const mcaInputs = mcaFacilities.map(debtFacilityToMCA);

  const projectionInput: CashflowProjectionInput = {
    historicalShopifyRevenue,
    historicalStripeRevenue,
    monthlyGrowthRate: 0, // Conservative flat projection
  };

  const projections: MCAProjectionResult[] = projectAllMCAFacilities(
    mcaInputs, projectionInput,
  );

  return (
    <MCAProjectionsClient
      projections={projections}
      hasData={mcaFacilities.length > 0}
      hasSourceBreakdown={hasSourceBreakdown}
      historicalShopifyRevenue={historicalShopifyRevenue}
      historicalStripeRevenue={historicalStripeRevenue}
    />
  );
}
