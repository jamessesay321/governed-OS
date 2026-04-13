/**
 * Shopify Metrics — Deterministic Computation Layer
 * --------------------------------------------------
 * Pure functions that take Shopify order data as input and return
 * pre-computed business metrics for a luxury bridal fashion house.
 *
 * DETERMINISTIC — no AI, no side effects, no database calls.
 * Follows the same pattern as buildSemanticPnL in src/lib/financial/aggregate.ts.
 *
 * Domain context (Alonuko):
 * - Shopify is used for consultation bookings, dress deposits, balance payments,
 *   accessories, and undergarments.
 * - A single bride may appear as 3-5 separate transactions (consultation fee,
 *   deposit, fittings, balance, alterations).
 * - Revenue from Shopify in Xero P&L appears under "Shopify Sales" but there
 *   is also consultation income and other sales that flow through Shopify.
 */

import type { ShopifyOrder, ShopifyLineItem } from './shopify';

// Re-export the Shopify types so consumers can import everything from one place
export type { ShopifyOrder, ShopifyLineItem };

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface OrderSummary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  ordersByStatus: Record<string, number>;
  revenueByMonth: { month: string; revenue: number; orderCount: number }[];
}

export type BridalProductCategory =
  | 'consultations'
  | 'deposits'
  | 'balance_payments'
  | 'delivery_fees'
  | 'accessories'
  | 'alterations'
  | 'other';

export interface ProductMixEntry {
  type: BridalProductCategory;
  label: string;
  count: number;
  revenue: number;
  avgPrice: number;
  pctOfRevenue: number;
}

export interface ProductMix {
  byProductType: ProductMixEntry[];
  totalRevenue: number;
  totalLineItems: number;
  uncategorisedTitles: string[];
}

export interface ChannelMetrics {
  /** Revenue from orders placed online (no POS location) */
  onlineRevenue: number;
  /** Revenue from in-store / POS orders */
  inStoreRevenue: number;
  /** Total value of fully refunded orders */
  refundTotal: number;
  /** Refund rate as a fraction 0-1 */
  refundRate: number;
  /** Fraction of customers with >1 order (0-1) */
  repeatCustomerRate: number;
  /** Total unique customers */
  uniqueCustomers: number;
  /** Customers with multiple orders (likely brides progressing through journey) */
  repeatCustomers: number;
}

export interface MonthlyRevenuePoint {
  month: string;
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
}

export interface RevenueTrend {
  monthlyRevenue: MonthlyRevenuePoint[];
  /** Month-over-month growth rate as a fraction (latest vs previous) */
  growthRate: number | null;
  /** Trailing 3-month average revenue */
  trailing3MonthAvg: number | null;
  /** Peak revenue month */
  peakMonth: MonthlyRevenuePoint | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function parsePrice(price: string | number): number {
  if (typeof price === 'number') return price;
  const cleaned = price.replace(/[^0-9.\-]/g, '');
  return parseFloat(cleaned) || 0;
}

function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Exclude voided and fully refunded orders from revenue calculations. */
function isRevenueOrder(order: ShopifyOrder): boolean {
  return (
    order.financial_status !== 'voided' &&
    order.financial_status !== 'refunded'
  );
}

// ---------------------------------------------------------------------------
// Product categorisation rules (bridal fashion domain)
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<BridalProductCategory, string> = {
  consultations: 'Consultations',
  deposits: 'Deposits',
  balance_payments: 'Balance Payments',
  delivery_fees: 'Delivery & Shipping Fees',
  accessories: 'Accessories',
  alterations: 'Alterations',
  other: 'Other',
};

/**
 * Classify a Shopify line item title into a bridal product category.
 * Uses keyword matching against common bridal fashion product names.
 * Case-insensitive.
 */
export function classifyLineItem(title: string): BridalProductCategory {
  const t = title.toLowerCase();

  // Consultations
  if (
    t.includes('consultation') ||
    t.includes('consult') ||
    t.includes('booking fee') ||
    t.includes('appointment') ||
    t.includes('bridal experience') ||
    t.includes('fitting fee') ||
    t.includes('session')
  ) {
    return 'consultations';
  }

  // Deposits
  if (
    t.includes('deposit') ||
    t.includes('down payment') ||
    t.includes('reservation') ||
    t.includes('hold')
  ) {
    return 'deposits';
  }

  // Balance payments (includes "Payment 2", "Payment 3" patterns)
  if (
    t.includes('balance') ||
    t.includes('final payment') ||
    t.includes('remaining') ||
    t.includes('settlement') ||
    t.includes('full payment') ||
    /payment\s*[2-9]/i.test(t) ||
    /\bpayment\s*#?\s*[2-9]/i.test(t)
  ) {
    return 'balance_payments';
  }

  // Delivery and shipping fees
  if (
    t.includes('delivery') ||
    t.includes('shipping') ||
    t.includes('postage') ||
    t.includes('courier') ||
    t.includes('dispatch fee') ||
    t.includes('swatch delivery') ||
    t.includes('toile shipping') ||
    t.includes('toile delivery')
  ) {
    return 'delivery_fees';
  }

  // Alterations
  if (
    t.includes('alteration') ||
    t.includes('adjustment') ||
    t.includes('hemming') ||
    t.includes('taking in') ||
    t.includes('letting out') ||
    t.includes('bustle') ||
    t.includes('shorten') ||
    t.includes('tailoring')
  ) {
    return 'alterations';
  }

  // Accessories
  if (
    t.includes('veil') ||
    t.includes('tiara') ||
    t.includes('headpiece') ||
    t.includes('belt') ||
    t.includes('sash') ||
    t.includes('undergarment') ||
    t.includes('underwear') ||
    t.includes('bra') ||
    t.includes('corset') ||
    t.includes('petticoat') ||
    t.includes('crinoline') ||
    t.includes('hoop') ||
    t.includes('fascinator') ||
    t.includes('jewellery') ||
    t.includes('jewelry') ||
    t.includes('earring') ||
    t.includes('necklace') ||
    t.includes('bracelet') ||
    t.includes('hair') ||
    t.includes('clip') ||
    t.includes('comb') ||
    t.includes('glove') ||
    t.includes('shawl') ||
    t.includes('wrap') ||
    t.includes('cape') ||
    t.includes('bolero') ||
    t.includes('jacket') ||
    t.includes('accessory') ||
    t.includes('accessories')
  ) {
    return 'accessories';
  }

  return 'other';
}

// ---------------------------------------------------------------------------
// 1. computeOrderSummary
// ---------------------------------------------------------------------------

/**
 * Compute a high-level order summary from Shopify orders.
 * Pure function — no side effects.
 */
export function computeOrderSummary(orders: ShopifyOrder[]): OrderSummary {
  const revenueOrders = orders.filter(isRevenueOrder);

  const totalRevenue = round2(
    revenueOrders.reduce((sum, o) => sum + parsePrice(o.total_price), 0)
  );

  const avgOrderValue =
    revenueOrders.length > 0
      ? round2(totalRevenue / revenueOrders.length)
      : 0;

  // Orders by financial_status
  const ordersByStatus: Record<string, number> = {};
  for (const order of orders) {
    const status = order.financial_status || 'unknown';
    ordersByStatus[status] = (ordersByStatus[status] ?? 0) + 1;
  }

  // Revenue by month (only revenue-bearing orders)
  const monthMap = new Map<string, { revenue: number; orderCount: number }>();
  for (const order of revenueOrders) {
    const month = toMonthKey(order.created_at);
    const existing = monthMap.get(month) ?? { revenue: 0, orderCount: 0 };
    existing.revenue += parsePrice(order.total_price);
    existing.orderCount += 1;
    monthMap.set(month, existing);
  }

  const revenueByMonth = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      revenue: round2(data.revenue),
      orderCount: data.orderCount,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalOrders: orders.length,
    totalRevenue,
    avgOrderValue,
    ordersByStatus,
    revenueByMonth,
  };
}

// ---------------------------------------------------------------------------
// 2. computeProductMix
// ---------------------------------------------------------------------------

/**
 * Categorise Shopify line items into bridal fashion product types and
 * compute revenue/count metrics per category.
 * Pure function — no side effects.
 */
export function computeProductMix(orders: ShopifyOrder[]): ProductMix {
  const revenueOrders = orders.filter(isRevenueOrder);

  const categoryMap = new Map<
    BridalProductCategory,
    { count: number; revenue: number }
  >();

  // Initialise all categories so they always appear in output
  const allCategories: BridalProductCategory[] = [
    'consultations',
    'deposits',
    'balance_payments',
    'delivery_fees',
    'accessories',
    'alterations',
    'other',
  ];
  for (const cat of allCategories) {
    categoryMap.set(cat, { count: 0, revenue: 0 });
  }

  let totalRevenue = 0;
  let totalLineItems = 0;
  const uncategorisedSet = new Set<string>();

  for (const order of revenueOrders) {
    for (const li of order.line_items) {
      const category = classifyLineItem(li.title);
      const lineRevenue = parsePrice(li.price) * li.quantity;

      const entry = categoryMap.get(category)!;
      entry.count += li.quantity;
      entry.revenue += lineRevenue;

      totalRevenue += lineRevenue;
      totalLineItems += li.quantity;

      if (category === 'other') {
        uncategorisedSet.add(li.title);
      }
    }
  }

  const byProductType: ProductMixEntry[] = allCategories.map((type) => {
    const data = categoryMap.get(type)!;
    return {
      type,
      label: CATEGORY_LABELS[type],
      count: data.count,
      revenue: round2(data.revenue),
      avgPrice: data.count > 0 ? round2(data.revenue / data.count) : 0,
      pctOfRevenue:
        totalRevenue > 0
          ? round2((data.revenue / totalRevenue) * 100)
          : 0,
    };
  });

  return {
    byProductType: byProductType.sort((a, b) => b.revenue - a.revenue),
    totalRevenue: round2(totalRevenue),
    totalLineItems,
    uncategorisedTitles: Array.from(uncategorisedSet).sort(),
  };
}

// ---------------------------------------------------------------------------
// 3. computeChannelMetrics
// ---------------------------------------------------------------------------

/**
 * Compute channel-level metrics: online vs in-store, refunds, repeat customers.
 *
 * Note: Shopify REST API orders do not include a top-level "channel" field,
 * but they do include `source_name` and `location_id` when available.
 * We use `fulfillment_status` and the presence of `customer` data as proxies.
 * Orders with financial_status === 'refunded' are counted as refunds.
 *
 * Pure function — no side effects.
 */
export function computeChannelMetrics(orders: ShopifyOrder[]): ChannelMetrics {
  let onlineRevenue = 0;
  let inStoreRevenue = 0;
  let refundTotal = 0;

  const customerOrderCounts = new Map<string, number>();

  for (const order of orders) {
    const price = parsePrice(order.total_price);

    // Refund tracking
    if (order.financial_status === 'refunded') {
      refundTotal += price;
      continue;
    }

    // Skip voided
    if (order.financial_status === 'voided') continue;

    // Channel heuristic: if fulfillment_status is null and order was placed
    // online, it is typically an in-person/consultation payment.
    // For Alonuko specifically, most orders are consultation-based (in-store).
    // We classify based on fulfillment: fulfilled = has shipped = online,
    // unfulfilled/null = in-store/consultation/service.
    if (
      order.fulfillment_status === 'fulfilled' ||
      order.fulfillment_status === 'partial'
    ) {
      onlineRevenue += price;
    } else {
      inStoreRevenue += price;
    }

    // Track customer for repeat rate
    const customerKey =
      order.customer?.email?.toLowerCase() || order.email?.toLowerCase();
    if (customerKey) {
      customerOrderCounts.set(
        customerKey,
        (customerOrderCounts.get(customerKey) ?? 0) + 1
      );
    }
  }

  const uniqueCustomers = customerOrderCounts.size;
  const repeatCustomers = Array.from(customerOrderCounts.values()).filter(
    (count) => count > 1
  ).length;

  const totalOrderCount = orders.filter(
    (o) => o.financial_status !== 'voided'
  ).length;
  const refundedCount = orders.filter(
    (o) => o.financial_status === 'refunded'
  ).length;

  return {
    onlineRevenue: round2(onlineRevenue),
    inStoreRevenue: round2(inStoreRevenue),
    refundTotal: round2(refundTotal),
    refundRate:
      totalOrderCount > 0
        ? round2(refundedCount / totalOrderCount)
        : 0,
    repeatCustomerRate:
      uniqueCustomers > 0
        ? round2(repeatCustomers / uniqueCustomers)
        : 0,
    uniqueCustomers,
    repeatCustomers,
  };
}

// ---------------------------------------------------------------------------
// 4. computeRevenueTrend
// ---------------------------------------------------------------------------

/**
 * Compute monthly revenue trend with growth rate and trailing averages.
 * Pure function — no side effects.
 */
export function computeRevenueTrend(orders: ShopifyOrder[]): RevenueTrend {
  const revenueOrders = orders.filter(isRevenueOrder);

  // Build monthly buckets
  const monthMap = new Map<string, { revenue: number; orderCount: number }>();

  for (const order of revenueOrders) {
    const month = toMonthKey(order.created_at);
    const existing = monthMap.get(month) ?? { revenue: 0, orderCount: 0 };
    existing.revenue += parsePrice(order.total_price);
    existing.orderCount += 1;
    monthMap.set(month, existing);
  }

  const monthlyRevenue: MonthlyRevenuePoint[] = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      revenue: round2(data.revenue),
      orderCount: data.orderCount,
      avgOrderValue:
        data.orderCount > 0
          ? round2(data.revenue / data.orderCount)
          : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Growth rate: latest complete month vs previous month
  let growthRate: number | null = null;
  if (monthlyRevenue.length >= 2) {
    const latest = monthlyRevenue[monthlyRevenue.length - 1];
    const previous = monthlyRevenue[monthlyRevenue.length - 2];
    if (previous.revenue !== 0) {
      growthRate = round2(
        ((latest.revenue - previous.revenue) / Math.abs(previous.revenue)) * 100
      );
    }
  }

  // Trailing 3-month average
  let trailing3MonthAvg: number | null = null;
  if (monthlyRevenue.length >= 3) {
    const last3 = monthlyRevenue.slice(-3);
    trailing3MonthAvg = round2(
      last3.reduce((sum, m) => sum + m.revenue, 0) / 3
    );
  }

  // Peak month
  const peakMonth =
    monthlyRevenue.length > 0
      ? monthlyRevenue.reduce((peak, m) =>
          m.revenue > peak.revenue ? m : peak
        )
      : null;

  return {
    monthlyRevenue,
    growthRate,
    trailing3MonthAvg,
    peakMonth,
  };
}

// ---------------------------------------------------------------------------
// Convenience: compute all metrics at once
// ---------------------------------------------------------------------------

export interface ShopifyMetricsSummary {
  orderSummary: OrderSummary;
  productMix: ProductMix;
  channelMetrics: ChannelMetrics;
  revenueTrend: RevenueTrend;
  computedAt: string;
  orderCount: number;
}

/**
 * Run all four computation functions on a single array of orders.
 * Returns the full metrics bundle. Pure function — no side effects.
 */
export function computeAllMetrics(orders: ShopifyOrder[]): ShopifyMetricsSummary {
  return {
    orderSummary: computeOrderSummary(orders),
    productMix: computeProductMix(orders),
    channelMetrics: computeChannelMetrics(orders),
    revenueTrend: computeRevenueTrend(orders),
    computedAt: new Date().toISOString(),
    orderCount: orders.length,
  };
}
