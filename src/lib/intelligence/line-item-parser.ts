/**
 * Line-Item Parser — Product Intelligence Engine
 *
 * Parses raw_transactions.line_items JSONB to extract product-level data.
 * Classifies line items into product categories using pattern matching,
 * with industry-specific rules (fashion/luxury) and generic fallbacks.
 *
 * DETERMINISTIC — all classification is pattern-based, no AI.
 */

import { createServiceClient } from '@/lib/supabase/server';

// ─── Types ─────────────────────────────────────────────────────────

export interface ParsedLineItem {
  transactionId: string;
  date: string;
  contactName: string;
  description: string;
  quantity: number;
  unitAmount: number;
  lineAmount: number;
  productCategory: string;
  accountCode: string;
}

export interface ProductMetrics {
  period: string;
  category: string;
  unitsSold: number;
  totalRevenue: number;
  averagePrice: number;
  uniqueCustomers: number;
  customerNames: string[];
}

export interface ProductIntelligenceResult {
  metrics: ProductMetrics[];
  lineItems: ParsedLineItem[];
  totalUnits: number;
  totalRevenue: number;
  uniqueCustomers: number;
  topCategory: string | null;
  categoryBreakdown: { category: string; revenue: number; percentage: number }[];
}

// ─── Fashion / Luxury Classification Rules ─────────────────────────

const FASHION_PATTERNS: [RegExp, string][] = [
  [/\b(bridal|bride|wedding|MTO|made\s*to\s*order|bespoke|custom\s*dress|custom\s*gown)\b/i, 'MTO Bridal'],
  [/\b(ready\s*to\s*wear|RTW|off\s*the\s*rack|stock\s*dress|sample\s*sale)\b/i, 'Ready to Wear'],
  [/\b(robe|silk\s*robe|dressing\s*gown|kimono|wrap)\b/i, 'Robes & Accessories'],
  [/\b(consultation|fitting|appointment|design\s*session|measuring)\b/i, 'Consultations'],
  [/\b(trunk\s*show|exhibition|event|showcase|pop[\s-]*up)\b/i, 'Trunk Shows & Events'],
  [/\b(alteration|adjustment|hemming|tailoring|resize)\b/i, 'Alterations'],
  [/\b(veil|tiara|headpiece|accessory|accessories|jewellery|jewelry)\b/i, 'Robes & Accessories'],
  [/\b(deposit|balance\s*payment|final\s*payment)\b/i, 'MTO Bridal'],
];

const FASHION_INDUSTRIES = [
  'fashion', 'luxury', 'bridal', 'couture', 'clothing', 'apparel',
  'designer', 'atelier', 'wedding', 'dressmaking',
];

// ─── Classification Logic ──────────────────────────────────────────

function isFashionIndustry(industry: string): boolean {
  const lower = industry.toLowerCase();
  return FASHION_INDUSTRIES.some((keyword) => lower.includes(keyword));
}

function classifyLineItem(
  description: string,
  accountName: string,
  industry: string
): string {
  if (isFashionIndustry(industry)) {
    // Try fashion-specific patterns against description
    for (const [pattern, category] of FASHION_PATTERNS) {
      if (pattern.test(description)) {
        return category;
      }
    }
    // Also try against account name
    for (const [pattern, category] of FASHION_PATTERNS) {
      if (pattern.test(accountName)) {
        return category;
      }
    }
  }

  // Generic fallback: use account name as category
  if (accountName) {
    return accountName;
  }

  // Last resort: uncategorised
  return 'Uncategorised';
}

// ─── Raw Line Item Shape (from Xero JSONB) ─────────────────────────

interface XeroLineItem {
  Description?: string;
  description?: string;
  Quantity?: number;
  quantity?: number;
  UnitAmount?: number;
  unitAmount?: number;
  LineAmount?: number;
  lineAmount?: number;
  AccountCode?: string;
  accountCode?: string;
  AccountName?: string;
  accountName?: string;
}

function normaliseLineItem(raw: XeroLineItem): {
  description: string;
  quantity: number;
  unitAmount: number;
  lineAmount: number;
  accountCode: string;
  accountName: string;
} {
  return {
    description: raw.Description ?? raw.description ?? '',
    quantity: raw.Quantity ?? raw.quantity ?? 1,
    unitAmount: raw.UnitAmount ?? raw.unitAmount ?? 0,
    lineAmount: raw.LineAmount ?? raw.lineAmount ?? 0,
    accountCode: raw.AccountCode ?? raw.accountCode ?? '',
    accountName: raw.AccountName ?? raw.accountName ?? '',
  };
}

// ─── Core Parser ───────────────────────────────────────────────────

/**
 * Parse line items from raw_transactions for an org within a date range.
 * Returns product metrics aggregated by period + category.
 */
export async function parseLineItems(
  orgId: string,
  startDate: string,
  endDate: string,
  industry: string = ''
): Promise<ProductIntelligenceResult> {
  const supabase = await createServiceClient();

  // Query raw transactions for the org + date range (revenue transactions only)
  const { data: transactions, error } = await supabase
    .from('raw_transactions')
    .select('id, date, contact_name, line_items, type')
    .eq('org_id', orgId)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('type', ['invoice', 'credit_note'])
    .order('date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch raw transactions: ${error.message}`);
  }

  const allLineItems: ParsedLineItem[] = [];

  for (const tx of transactions ?? []) {
    const lineItems = (tx.line_items as XeroLineItem[]) ?? [];
    const isCreditNote = tx.type === 'credit_note';

    for (const rawItem of lineItems) {
      const item = normaliseLineItem(rawItem);

      // Skip zero-amount items
      if (item.lineAmount === 0 && item.unitAmount === 0) continue;

      const category = classifyLineItem(
        item.description,
        item.accountName,
        industry
      );

      const multiplier = isCreditNote ? -1 : 1;

      allLineItems.push({
        transactionId: tx.id as string,
        date: tx.date as string,
        contactName: (tx.contact_name as string) ?? 'Unknown',
        description: item.description,
        quantity: item.quantity * multiplier,
        unitAmount: item.unitAmount,
        lineAmount: item.lineAmount * multiplier,
        productCategory: category,
        accountCode: item.accountCode,
      });
    }
  }

  // Aggregate by period (YYYY-MM) + category
  const aggregateMap = new Map<string, {
    units: number;
    revenue: number;
    customers: Set<string>;
    customerList: string[];
  }>();

  for (const item of allLineItems) {
    const period = item.date.substring(0, 7); // YYYY-MM
    const key = `${period}::${item.productCategory}`;

    if (!aggregateMap.has(key)) {
      aggregateMap.set(key, {
        units: 0,
        revenue: 0,
        customers: new Set(),
        customerList: [],
      });
    }

    const agg = aggregateMap.get(key)!;
    agg.units += Math.abs(item.quantity);
    agg.revenue += item.lineAmount;
    if (item.contactName && item.contactName !== 'Unknown') {
      if (!agg.customers.has(item.contactName)) {
        agg.customers.add(item.contactName);
        agg.customerList.push(item.contactName);
      }
    }
  }

  // Build ProductMetrics array
  const metrics: ProductMetrics[] = [];
  for (const [key, agg] of aggregateMap) {
    const [period, category] = key.split('::');
    metrics.push({
      period,
      category,
      unitsSold: agg.units,
      totalRevenue: agg.revenue,
      averagePrice: agg.units > 0 ? agg.revenue / agg.units : 0,
      uniqueCustomers: agg.customers.size,
      customerNames: agg.customerList,
    });
  }

  // Sort by revenue descending
  metrics.sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Calculate summary stats
  const totalRevenue = metrics.reduce((sum, m) => sum + m.totalRevenue, 0);
  const totalUnits = metrics.reduce((sum, m) => sum + m.unitsSold, 0);
  const allCustomers = new Set(allLineItems.map((i) => i.contactName).filter((n) => n !== 'Unknown'));

  // Category breakdown (aggregated across all periods)
  const categoryTotals = new Map<string, number>();
  for (const m of metrics) {
    categoryTotals.set(
      m.category,
      (categoryTotals.get(m.category) ?? 0) + m.totalRevenue
    );
  }

  const categoryBreakdown = Array.from(categoryTotals.entries())
    .map(([category, revenue]) => ({
      category,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0].category : null;

  return {
    metrics,
    lineItems: allLineItems,
    totalUnits,
    totalRevenue,
    uniqueCustomers: allCustomers.size,
    topCategory,
    categoryBreakdown,
  };
}

/**
 * Get the period range for a YYYY-MM period string.
 * Returns { startDate, endDate } as YYYY-MM-DD strings.
 */
export function getPeriodDateRange(period: string): { startDate: string; endDate: string } {
  const [year, month] = period.split('-').map(Number);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

  // Last day of month
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { startDate, endDate };
}
