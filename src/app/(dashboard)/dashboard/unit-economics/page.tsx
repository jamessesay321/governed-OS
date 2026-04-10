import { createClient } from '@/lib/supabase/server';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { calculateFashionUnitEconomics } from '@/lib/financial/fashion-unit-economics';
import type { ShopifyProductData } from '@/lib/financial/fashion-unit-economics';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';
import UnitEconomicsClient from './unit-economics-client';

/**
 * Unit Economics — Server Component
 *
 * Fetches normalised financials, chart of accounts, and Shopify product
 * data, then runs the fashion unit economics engine server-side.
 * Passes pre-computed results to the client component.
 */
export default async function UnitEconomicsPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  /* ── Check Xero connection ── */
  const { data: xeroConn } = await supabase
    .from('xero_connections')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .maybeSingle();

  const connected = !!xeroConn;

  /* ── Fetch financial data ── */
  const { data: financialsRaw } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId);

  const { data: accountsRaw } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  const financials = (financialsRaw ?? []) as NormalisedFinancial[];
  const accounts = (accountsRaw ?? []) as ChartOfAccount[];

  /* ── Available periods ── */
  const availablePeriods = getAvailablePeriods(financials);
  const sortedPeriods = [...availablePeriods].sort();

  /* ── Fetch Shopify product data for each period ── */
  const db = await createUntypedServiceClient();

  const periodSummaries: Array<{
    period: string;
    summary: ReturnType<typeof calculateFashionUnitEconomics>;
    shopifyProducts: ShopifyProductData[];
  }> = [];

  for (const period of sortedPeriods) {
    // Fetch Shopify products for this period
    let shopifyProducts: ShopifyProductData[] = [];
    try {
      // Query staged_transactions directly for Shopify orders
      const [year, month] = period.split('-').map(Number);
      const startDate = `${period}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      const { data: orders } = await db
        .from('staged_transactions')
        .select('raw_data')
        .eq('org_id', orgId)
        .eq('source', 'shopify')
        .gte('raw_data->>date', startDate)
        .lt('raw_data->>date', endDate);

      if (orders && orders.length > 0) {
        // Aggregate line items by product title (same logic as API endpoint)
        const productMap = new Map<string, {
          revenue: number;
          units: number;
          orderCount: number;
          skus: Set<string>;
        }>();

        let totalRevenue = 0;

        for (const row of orders) {
          const rawData = row.raw_data as Record<string, unknown>;
          const financialStatus = rawData.financial_status as string | undefined;
          if (financialStatus === 'voided' || financialStatus === 'refunded') continue;

          const lineItems = rawData.line_items as Array<{
            title?: string;
            quantity?: number;
            price?: string | number;
            sku?: string | null;
          }> | undefined;

          if (!lineItems || !Array.isArray(lineItems)) continue;

          for (const item of lineItems) {
            const title = item.title ?? 'Unknown Product';
            const quantity = typeof item.quantity === 'number' ? item.quantity : 1;
            const price = typeof item.price === 'number'
              ? item.price
              : parseFloat(String(item.price ?? '0'));
            const lineRevenue = price * quantity;

            const existing = productMap.get(title) ?? {
              revenue: 0,
              units: 0,
              orderCount: 0,
              skus: new Set<string>(),
            };

            existing.revenue += lineRevenue;
            existing.units += quantity;
            existing.orderCount++;

            productMap.set(title, existing);
            totalRevenue += lineRevenue;
          }
        }

        shopifyProducts = Array.from(productMap.entries())
          .map(([title, data]) => ({
            title,
            revenue: Math.round(data.revenue * 100) / 100,
            units: data.units,
            orderCount: data.orderCount,
            percentage: totalRevenue > 0
              ? Math.round((data.revenue / totalRevenue) * 1000) / 10
              : 0,
          }))
          .sort((a, b) => b.revenue - a.revenue);
      }
    } catch {
      // Shopify data not available — proceed with financials only
    }

    // Build P&L for the period
    const pnl = buildPnL(financials, accounts, period);

    // Run the fashion unit economics engine
    const periodFinancials = financials.filter((f) => f.period === period);
    const summary = calculateFashionUnitEconomics(
      periodFinancials,
      accounts,
      shopifyProducts,
      pnl.revenue,
      pnl.costOfSales,
      period
    );

    periodSummaries.push({ period, summary, shopifyProducts });
  }

  /* ── Fetch last sync time ── */
  const { data: syncLog } = await supabase
    .from('sync_log')
    .select('completed_at')
    .eq('org_id', orgId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  return (
    <UnitEconomicsClient
      orgId={orgId}
      connected={connected}
      periodSummaries={periodSummaries.map((ps) => ({
        period: ps.period,
        summary: {
          ...ps.summary,
          // Strip Set objects for JSON serialisation
          costBreakdown: ps.summary.costBreakdown,
        },
        shopifyProductCount: ps.shopifyProducts.length,
      }))}
      availablePeriods={sortedPeriods}
      lastSync={{ completedAt: syncLog?.completed_at ?? null }}
    />
  );
}
