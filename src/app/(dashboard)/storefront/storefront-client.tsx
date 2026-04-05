'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderSummary = {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  currency: string;
};

type OrderRow = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  totalPrice: string;
  currency: string;
  financialStatus: string;
  fulfillmentStatus: string | null;
  customerName: string;
  lineItemCount: number;
};

type RevenueByPeriod = {
  period: string;
  revenue: number;
  orderCount: number;
};

type TopProduct = {
  title: string;
  revenue: number;
  unitsSold: number;
};

type Reconciliation = {
  shopifyTotal: number;
  xeroTotal: number;
  difference: number;
  differencePercent: number;
  status: 'matched' | 'minor_gap' | 'significant_gap';
  orderCount: number;
};

type Props = {
  orgId: string;
  connected: boolean;
  summary: OrderSummary | null;
  orders: OrderRow[];
  revenueByPeriod: RevenueByPeriod[];
  topProducts: TopProduct[];
  reconciliation: Reconciliation | null;
  lastSyncAt: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  authorized: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  partially_paid: 'bg-amber-100 text-amber-800',
  partially_refunded: 'bg-orange-100 text-orange-800',
  refunded: 'bg-red-100 text-red-800',
  voided: 'bg-gray-100 text-gray-800',
};

const FULFILLMENT_STYLES: Record<string, string> = {
  fulfilled: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  unfulfilled: 'bg-gray-100 text-gray-600',
};

const RECONCILIATION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  matched: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', label: 'Matched' },
  minor_gap: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', label: 'Minor Gap' },
  significant_gap: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', label: 'Significant Gap' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StorefrontClient({
  connected,
  summary,
  orders,
  revenueByPeriod,
  topProducts,
  reconciliation,
  lastSyncAt,
}: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; synced: number; error?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'reconciliation'>('overview');

  async function handleSync(action: string = 'full_sync') {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/integrations/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      setSyncResult({
        success: res.ok,
        synced: data.synced ?? 0,
        error: data.error,
      });
      if (res.ok) router.refresh();
    } catch {
      setSyncResult({ success: false, synced: 0, error: 'Network error' });
    } finally {
      setSyncing(false);
    }
  }

  // ---- Not connected state ----
  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Storefront</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your Shopify store to track orders, revenue, and product performance.
          </p>
        </div>

        <div className="rounded-lg border">
          <div className="p-8 text-center">
            {/* Shopify icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#96bf48]/10">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#96bf48]" fill="currentColor">
                <path d="M15.337 3.415c-.043-.18-.198-.28-.337-.297a3.6 3.6 0 0 0-.563-.005s-1.137.114-1.137.114a.37.37 0 0 1-.1-.02c-.2-.54-.558-1.036-1.182-1.036h-.084C11.59 1.727 11.148 1.5 10.773 1.5c-2.508.007-3.713 3.133-4.088 4.727l-1.762.546c-.546.172-.563.188-.635.706l-1.345 10.34L10.953 19.5l6.49-1.407s-2.063-14.496-2.106-14.678zM11.24 5.24c0 .063-.54.168-.54.168s-1.132.35-1.132.35c.316-1.218.912-1.81 1.432-2.033.15.39.24.905.24 1.515zm-.936-2.14c.095 0 .187.032.273.094-.682.32-1.41 1.136-1.72 2.762l-.896.278C8.383 4.785 9.263 3.1 10.304 3.1zm.364 7.75s-.475-.252-1.055-.252c-.852 0-.895.535-.895.67 0 .735 1.916 1.017 1.916 2.74 0 1.355-.858 2.228-2.017 2.228-1.39 0-2.1-.865-2.1-.865l.372-1.23s.73.627 1.346.627a.547.547 0 0 0 .568-.548c0-.96-1.572-1.003-1.572-2.58 0-1.327.952-2.612 2.877-2.612.74 0 1.107.213 1.107.213l-.547 1.61z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Shopify</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Link your Shopify store to automatically import orders, track revenue,
              and reconcile against your accounting data in Xero.
            </p>
            <a
              href="/api/integrations/shopify/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-[#96bf48] px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#7da03e] transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Connect Shopify
            </a>
            <p className="text-xs text-muted-foreground mt-4">
              Read-only access. We import order and product data but never modify your store.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currency = summary?.currency ?? 'GBP';

  // ---- Connected state ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Storefront</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Shopify order and revenue intelligence.
            {lastSyncAt && (
              <span className="ml-2 text-xs">
                Last synced {formatDateTime(lastSyncAt)}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => handleSync('full_sync')}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {syncing ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Now
            </>
          )}
        </button>
      </div>

      {/* Sync result feedback */}
      {syncResult && (
        <div className={`rounded-lg p-3 text-sm ${syncResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {syncResult.success
            ? `Sync complete: ${syncResult.synced.toLocaleString()} records updated.`
            : `Sync failed: ${syncResult.error || 'Unknown error'}`}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Total Orders"
            value={summary.totalOrders.toLocaleString()}
            icon={
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
            }
          />
          <SummaryCard
            label="Total Revenue"
            value={formatCurrency(summary.totalRevenue, currency)}
            icon={
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            }
          />
          <SummaryCard
            label="Avg Order Value"
            value={formatCurrency(summary.avgOrderValue, currency)}
            icon={
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            }
          />
          <SummaryCard
            label="Top Product"
            value={topProducts[0]?.title ?? 'N/A'}
            subtitle={topProducts[0] ? formatCurrency(topProducts[0].revenue, currency) : undefined}
            icon={
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Tab navigation */}
      <div className="border-b">
        <nav className="flex gap-6">
          {(['overview', 'orders', 'products', 'reconciliation'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab
          revenueByPeriod={revenueByPeriod}
          topProducts={topProducts}
          currency={currency}
        />
      )}

      {activeTab === 'orders' && (
        <OrdersTab orders={orders} currency={currency} />
      )}

      {activeTab === 'products' && (
        <ProductsTab topProducts={topProducts} currency={currency} />
      )}

      {activeTab === 'reconciliation' && (
        <ReconciliationTab reconciliation={reconciliation} currency={currency} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  subtitle,
  icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="text-xl font-bold truncate">{value}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function OverviewTab({
  revenueByPeriod,
  topProducts,
  currency,
}: {
  revenueByPeriod: RevenueByPeriod[];
  topProducts: TopProduct[];
  currency: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Revenue by period */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-medium">Monthly Revenue</h3>
        </div>
        <div className="p-4">
          {revenueByPeriod.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No revenue data yet.</p>
          ) : (
            <div className="space-y-3">
              {revenueByPeriod.slice(-6).map((item) => {
                const maxRevenue = Math.max(...revenueByPeriod.map((r) => r.revenue));
                const widthPct = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={item.period}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{item.period}</span>
                      <span className="font-medium">
                        {formatCurrency(item.revenue, currency)}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({item.orderCount} orders)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#96bf48] rounded-full transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top products mini-table */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-medium">Top Products by Revenue</h3>
        </div>
        <div className="divide-y">
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No product data yet.</p>
          ) : (
            topProducts.slice(0, 5).map((product, idx) => (
              <div key={product.title} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {idx + 1}
                  </span>
                  <span className="truncate max-w-[200px]">{product.title}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(product.revenue, currency)}</p>
                  <p className="text-xs text-muted-foreground">{product.unitsSold} units</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function OrdersTab({ orders, currency }: { orders: OrderRow[]; currency: string }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fulfillment</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{order.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{order.customerName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[order.financialStatus] ?? 'bg-gray-100 text-gray-800'}`}>
                      {order.financialStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${FULFILLMENT_STYLES[order.fulfillmentStatus ?? 'unfulfilled'] ?? 'bg-gray-100 text-gray-600'}`}>
                      {order.fulfillmentStatus ?? 'unfulfilled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(parseFloat(order.totalPrice), order.currency || currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {orders.length >= 100 && (
        <div className="border-t px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            Showing first 100 orders. Use the API or sync to access the full order history.
          </p>
        </div>
      )}
    </div>
  );
}

function ProductsTab({ topProducts, currency }: { topProducts: TopProduct[]; currency: string }) {
  const totalProductRevenue = topProducts.reduce((s, p) => s + p.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border overflow-hidden">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-medium">Product Performance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Revenue and units sold by product (from recent order history)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Units Sold</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No product data available.
                  </td>
                </tr>
              ) : (
                topProducts.map((product, idx) => {
                  const pct = totalProductRevenue > 0
                    ? Math.round((product.revenue / totalProductRevenue) * 1000) / 10
                    : 0;
                  return (
                    <tr key={product.title} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{product.title}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(product.revenue, currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {product.unitsSold.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#96bf48] rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReconciliationTab({
  reconciliation,
  currency,
}: {
  reconciliation: Reconciliation | null;
  currency: string;
}) {
  if (!reconciliation) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Reconciliation data is not available. Ensure both Shopify and Xero are connected and synced.
        </p>
      </div>
    );
  }

  const style = RECONCILIATION_STYLES[reconciliation.status];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`rounded-lg border p-4 ${style.bg}`}>
        <div className="flex items-center gap-3">
          {reconciliation.status === 'matched' ? (
            <svg className="h-6 w-6 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : reconciliation.status === 'minor_gap' ? (
            <svg className="h-6 w-6 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
          )}
          <div>
            <p className={`font-medium ${style.text}`}>
              Shopify vs Xero: {style.label}
            </p>
            <p className={`text-sm mt-0.5 ${style.text}`}>
              {reconciliation.status === 'matched'
                ? 'Revenue figures are within 1% tolerance. No action required.'
                : reconciliation.status === 'minor_gap'
                  ? 'A small discrepancy exists between Shopify and Xero totals. Review recommended.'
                  : 'A significant gap exists between Shopify and Xero revenue. Investigation required.'}
            </p>
          </div>
        </div>
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Shopify Revenue</p>
          <p className="text-xl font-bold">{formatCurrency(reconciliation.shopifyTotal, currency)}</p>
          <p className="text-xs text-muted-foreground mt-1">{reconciliation.orderCount} orders</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Xero Revenue</p>
          <p className="text-xl font-bold">{formatCurrency(reconciliation.xeroTotal, currency)}</p>
          <p className="text-xs text-muted-foreground mt-1">Normalised financial data</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground mb-1">Difference</p>
          <p className={`text-xl font-bold ${reconciliation.difference === 0 ? 'text-green-600' : reconciliation.differencePercent < 5 ? 'text-amber-600' : 'text-red-600'}`}>
            {formatCurrency(reconciliation.difference, currency)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{reconciliation.differencePercent}% variance</p>
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-lg border p-4">
        <h4 className="text-sm font-medium mb-2">About Reconciliation</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This view compares total Shopify order revenue (from synced transactions) against
          Xero normalised financial data for the current period. Differences may arise from
          timing (orders placed but not yet invoiced), refunds processed in one system but
          not the other, or currency conversion discrepancies. A variance under 1% is
          considered matched; under 5% is a minor gap worth reviewing; above 5% warrants
          investigation.
        </p>
      </div>
    </div>
  );
}
