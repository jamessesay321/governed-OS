/**
 * Monday.com Bridal Orders — Deterministic Computation Layer
 *
 * Pure functions that take bridal_orders data as input and compute
 * pipeline, production, revenue, client, and WIP metrics.
 *
 * These functions are side-effect-free and deterministic: same input
 * always produces the same output. They never touch the database or
 * any external API — the caller is responsible for fetching data.
 */

// ---------------------------------------------------------------------------
// Input Type (mirrors the bridal_orders Supabase table shape)
// ---------------------------------------------------------------------------

export interface BridalOrder {
  id: string;
  org_id: string;
  client_id: string | null;
  client_name: string;
  email: string | null;
  phone: string | null;
  status: 'confirmed' | 'on_hold' | 'cancelled' | 'completed' | 'enquiry';
  dress_style: string | null;
  dress_name: string | null;
  dress_price: number | null;
  actual_dress_choice: string | null;
  wedding_date: string | null;
  event_type: string | null;
  order_date: string | null;
  fitting_date: string | null;
  completion_date: string | null;
  notes: string | null;
  tags: string[];
  monday_item_id: string | null;
  monday_board_id: string | null;
  order_code: string | null;
  total_paid: number | null;
  outstanding_balance: number | null;
  source: 'manual' | 'monday' | 'wip_import';
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Output Types
// ---------------------------------------------------------------------------

export interface OrderPipelineMetrics {
  totalConfirmed: number;
  totalInProduction: number;
  totalCompleted: number;
  totalCancelled: number;
  /** Sum of dress_price for all confirmed + on_hold orders (active pipeline) */
  pipelineValue: number;
  /** Completed / (Completed + Confirmed + On Hold) as a percentage 0-100 */
  completionRate: number;
}

export interface ProductionMetrics {
  /** Average days from order_date to completion_date for completed orders */
  avgFulfillmentDays: number;
  /** Orders past their wedding_date that are not completed or cancelled */
  ordersOverdue: number;
  /** Confirmed/on_hold orders whose wedding_date is still in the future */
  ordersOnTrack: number;
  /** Average days an active order has spent in its current status (since updated_at vs now) */
  avgDaysInCurrentStatus: number;
  /** Count of confirmed + on_hold orders (active work in progress) */
  productionBacklog: number;
}

export interface RevenueByMonth {
  /** YYYY-MM */
  month: string;
  revenue: number;
  orderCount: number;
}

export interface RevenueMetrics {
  /** Sum of total_paid across all orders */
  totalDepositsCollected: number;
  /** Sum of outstanding_balance across all orders */
  totalOutstandingBalances: number;
  /** Average dress_price for orders that have a price set */
  avgOrderValue: number;
  /** Revenue (total_paid) grouped by order_date month */
  revenueByMonth: RevenueByMonth[];
  /** Ratio object for at-a-glance comparison */
  depositsVsBalances: {
    deposits: number;
    balances: number;
    /** deposits / (deposits + balances) as a percentage 0-100 */
    collectionRate: number;
  };
}

export interface ClientMetrics {
  totalClients: number;
  newClientsThisMonth: number;
  clientsByStatus: Record<BridalOrder['status'], number>;
  avgOrdersPerClient: number;
  topClientsByValue: Array<{
    clientName: string;
    totalValue: number;
    orderCount: number;
  }>;
}

export interface WIPAgeing {
  under30d: number;
  '30to60d': number;
  '60to90d': number;
  over90d: number;
}

export interface WIPMetrics {
  /** Sum of dress_price for all active (confirmed + on_hold) orders */
  totalWIPValue: number;
  /** WIP value broken down by status */
  wipByStage: Record<string, { count: number; value: number }>;
  /** Ageing buckets based on days since order was created */
  wipAgeing: WIPAgeing;
  /** WIP value / completed revenue — indicates production efficiency */
  wipToRevenueRatio: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function toDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function safeNum(v: number | null | undefined): number {
  return typeof v === 'number' && !isNaN(v) ? v : 0;
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function isActiveOrder(o: BridalOrder): boolean {
  return o.status === 'confirmed' || o.status === 'on_hold';
}

// ---------------------------------------------------------------------------
// 1. Order Pipeline Metrics
// ---------------------------------------------------------------------------

export function computeOrderPipelineMetrics(
  orders: BridalOrder[]
): OrderPipelineMetrics {
  const totalConfirmed = orders.filter((o) => o.status === 'confirmed').length;
  // "In production" = confirmed (actively being worked on)
  const totalInProduction = totalConfirmed;
  const totalCompleted = orders.filter((o) => o.status === 'completed').length;
  const totalCancelled = orders.filter((o) => o.status === 'cancelled').length;

  // Pipeline value = sum of dress_price for active orders
  const pipelineValue = orders
    .filter(isActiveOrder)
    .reduce((sum, o) => sum + safeNum(o.dress_price), 0);

  // Completion rate = completed / (completed + active) — excludes cancelled & enquiry
  const completionPool = totalCompleted + totalConfirmed + orders.filter((o) => o.status === 'on_hold').length;
  const completionRate =
    completionPool > 0
      ? Math.round((totalCompleted / completionPool) * 10000) / 100
      : 0;

  return {
    totalConfirmed,
    totalInProduction,
    totalCompleted,
    totalCancelled,
    pipelineValue,
    completionRate,
  };
}

// ---------------------------------------------------------------------------
// 2. Production Metrics
// ---------------------------------------------------------------------------

export function computeProductionMetrics(
  orders: BridalOrder[],
  now: Date = new Date()
): ProductionMetrics {
  // Average fulfillment days: completed orders with both order_date and completion_date
  const completedWithDates = orders.filter((o) => {
    if (o.status !== 'completed') return false;
    return toDate(o.order_date) !== null && toDate(o.completion_date) !== null;
  });

  let avgFulfillmentDays = 0;
  if (completedWithDates.length > 0) {
    const totalDays = completedWithDates.reduce((sum, o) => {
      const start = toDate(o.order_date)!;
      const end = toDate(o.completion_date)!;
      return sum + daysBetween(start, end);
    }, 0);
    avgFulfillmentDays = Math.round(totalDays / completedWithDates.length);
  }

  // Overdue: active orders whose wedding_date is in the past
  const activeOrders = orders.filter(isActiveOrder);
  const ordersOverdue = activeOrders.filter((o) => {
    const wd = toDate(o.wedding_date);
    return wd !== null && wd < now;
  }).length;

  // On track: active orders whose wedding_date is in the future (or no date set)
  const ordersOnTrack = activeOrders.filter((o) => {
    const wd = toDate(o.wedding_date);
    return wd === null || wd >= now;
  }).length;

  // Average days in current status: days since updated_at for active orders
  let avgDaysInCurrentStatus = 0;
  if (activeOrders.length > 0) {
    const totalDays = activeOrders.reduce((sum, o) => {
      const updated = toDate(o.updated_at);
      return sum + (updated ? daysBetween(updated, now) : 0);
    }, 0);
    avgDaysInCurrentStatus = Math.round(totalDays / activeOrders.length);
  }

  // Production backlog = count of active orders
  const productionBacklog = activeOrders.length;

  return {
    avgFulfillmentDays,
    ordersOverdue,
    ordersOnTrack,
    avgDaysInCurrentStatus,
    productionBacklog,
  };
}

// ---------------------------------------------------------------------------
// 3. Revenue Metrics
// ---------------------------------------------------------------------------

export function computeRevenueMetrics(
  orders: BridalOrder[]
): RevenueMetrics {
  // Total deposits collected = sum of total_paid
  const totalDepositsCollected = orders.reduce(
    (sum, o) => sum + safeNum(o.total_paid),
    0
  );

  // Total outstanding balances
  const totalOutstandingBalances = orders.reduce(
    (sum, o) => sum + safeNum(o.outstanding_balance),
    0
  );

  // Average order value (only orders with a price)
  const pricedOrders = orders.filter(
    (o) => o.dress_price !== null && o.dress_price > 0
  );
  const avgOrderValue =
    pricedOrders.length > 0
      ? Math.round(
          pricedOrders.reduce((sum, o) => sum + safeNum(o.dress_price), 0) /
            pricedOrders.length
        )
      : 0;

  // Revenue by month (based on order_date, falling back to created_at)
  const monthMap = new Map<string, { revenue: number; orderCount: number }>();
  for (const o of orders) {
    const dateStr = o.order_date ?? o.created_at;
    const d = toDate(dateStr);
    if (!d) continue;
    const key = monthKey(d);
    const existing = monthMap.get(key) ?? { revenue: 0, orderCount: 0 };
    existing.revenue += safeNum(o.total_paid);
    existing.orderCount += 1;
    monthMap.set(key, existing);
  }
  const revenueByMonth: RevenueByMonth[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  // Deposits vs Balances
  const totalPool = totalDepositsCollected + totalOutstandingBalances;
  const collectionRate =
    totalPool > 0
      ? Math.round((totalDepositsCollected / totalPool) * 10000) / 100
      : 0;

  return {
    totalDepositsCollected,
    totalOutstandingBalances,
    avgOrderValue,
    revenueByMonth,
    depositsVsBalances: {
      deposits: totalDepositsCollected,
      balances: totalOutstandingBalances,
      collectionRate,
    },
  };
}

// ---------------------------------------------------------------------------
// 4. Client Metrics
// ---------------------------------------------------------------------------

export function computeClientMetrics(
  orders: BridalOrder[],
  now: Date = new Date()
): ClientMetrics {
  // Unique clients by name (normalised lowercase)
  const clientMap = new Map<
    string,
    { name: string; totalValue: number; orderCount: number }
  >();

  for (const o of orders) {
    const key = o.client_name.toLowerCase().trim();
    const existing = clientMap.get(key) ?? {
      name: o.client_name,
      totalValue: 0,
      orderCount: 0,
    };
    existing.totalValue += safeNum(o.dress_price);
    existing.orderCount += 1;
    // Keep the original-cased name from the first occurrence
    clientMap.set(key, existing);
  }

  const totalClients = clientMap.size;

  // New clients this month (based on created_at)
  const currentMonth = monthKey(now);
  const newClientsThisMonthSet = new Set<string>();
  for (const o of orders) {
    const d = toDate(o.created_at);
    if (d && monthKey(d) === currentMonth) {
      newClientsThisMonthSet.add(o.client_name.toLowerCase().trim());
    }
  }
  const newClientsThisMonth = newClientsThisMonthSet.size;

  // Clients by status — count unique clients per status
  const statusSets: Record<BridalOrder['status'], Set<string>> = {
    confirmed: new Set(),
    on_hold: new Set(),
    cancelled: new Set(),
    completed: new Set(),
    enquiry: new Set(),
  };
  for (const o of orders) {
    statusSets[o.status].add(o.client_name.toLowerCase().trim());
  }
  const clientsByStatus: Record<BridalOrder['status'], number> = {
    confirmed: statusSets.confirmed.size,
    on_hold: statusSets.on_hold.size,
    cancelled: statusSets.cancelled.size,
    completed: statusSets.completed.size,
    enquiry: statusSets.enquiry.size,
  };

  // Average orders per client
  const avgOrdersPerClient =
    totalClients > 0
      ? Math.round((orders.length / totalClients) * 100) / 100
      : 0;

  // Top clients by value (top 10)
  const topClientsByValue = Array.from(clientMap.values())
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10)
    .map(({ name, totalValue, orderCount }) => ({
      clientName: name,
      totalValue,
      orderCount,
    }));

  return {
    totalClients,
    newClientsThisMonth,
    clientsByStatus,
    avgOrdersPerClient,
    topClientsByValue,
  };
}

// ---------------------------------------------------------------------------
// 5. WIP (Work In Progress) Metrics
// ---------------------------------------------------------------------------

export function computeWIPMetrics(
  orders: BridalOrder[],
  now: Date = new Date()
): WIPMetrics {
  const activeOrders = orders.filter(isActiveOrder);

  // Total WIP value
  const totalWIPValue = activeOrders.reduce(
    (sum, o) => sum + safeNum(o.dress_price),
    0
  );

  // WIP by stage (status)
  const wipByStage: Record<string, { count: number; value: number }> = {};
  for (const o of activeOrders) {
    const stage = o.status;
    if (!wipByStage[stage]) {
      wipByStage[stage] = { count: 0, value: 0 };
    }
    wipByStage[stage].count += 1;
    wipByStage[stage].value += safeNum(o.dress_price);
  }

  // WIP ageing based on created_at
  const ageing: WIPAgeing = {
    under30d: 0,
    '30to60d': 0,
    '60to90d': 0,
    over90d: 0,
  };

  for (const o of activeOrders) {
    const created = toDate(o.created_at);
    if (!created) {
      ageing.over90d += 1; // unknown age goes to oldest bucket
      continue;
    }
    const days = daysBetween(created, now);
    if (days < 30) ageing.under30d += 1;
    else if (days < 60) ageing['30to60d'] += 1;
    else if (days < 90) ageing['60to90d'] += 1;
    else ageing.over90d += 1;
  }

  // WIP to revenue ratio: total WIP value / completed orders total revenue
  const completedRevenue = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + safeNum(o.total_paid), 0);

  const wipToRevenueRatio =
    completedRevenue > 0
      ? Math.round((totalWIPValue / completedRevenue) * 100) / 100
      : totalWIPValue > 0
        ? Infinity
        : 0;

  return {
    totalWIPValue,
    wipByStage,
    wipAgeing: ageing,
    wipToRevenueRatio,
  };
}

// ---------------------------------------------------------------------------
// Aggregate: Compute all metrics in one call
// ---------------------------------------------------------------------------

export interface AllBridalMetrics {
  pipeline: OrderPipelineMetrics;
  production: ProductionMetrics;
  revenue: RevenueMetrics;
  clients: ClientMetrics;
  wip: WIPMetrics;
  meta: {
    totalOrders: number;
    computedAt: string;
  };
}

export function computeAllMetrics(
  orders: BridalOrder[],
  now: Date = new Date()
): AllBridalMetrics {
  return {
    pipeline: computeOrderPipelineMetrics(orders),
    production: computeProductionMetrics(orders, now),
    revenue: computeRevenueMetrics(orders),
    clients: computeClientMetrics(orders, now),
    wip: computeWIPMetrics(orders, now),
    meta: {
      totalOrders: orders.length,
      computedAt: now.toISOString(),
    },
  };
}
