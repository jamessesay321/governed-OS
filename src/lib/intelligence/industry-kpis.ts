/**
 * Industry-Specific KPIs — Product Intelligence Layer
 *
 * Defines KPIs that leverage product-level metrics from line-item parsing.
 * Fashion/luxury KPIs use bridal-specific categories; generic KPIs
 * use aggregate transaction data.
 *
 * DETERMINISTIC — all calculations are pure TypeScript, no AI.
 */

import type { ProductIntelligenceResult, ProductMetrics } from './line-item-parser';

// ─── Types ─────────────────────────────────────────────────────────

export interface ProductKPI {
  key: string;
  label: string;
  description: string;
  plainEnglish: string;
  value: number | null;
  formattedValue: string;
  format: 'currency' | 'percentage' | 'number' | 'ratio';
  higherIsBetter: boolean;
  category: 'product' | 'customer' | 'efficiency';
}

// ─── Helpers ───────────────────────────────────────────────────────

function safeDivide(num: number, den: number): number | null {
  if (den === 0) return null;
  return num / den;
}

function formatGBP(pence: number): string {
  // Product metrics are in pounds (from Xero line amounts), not pence
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pence);
}

function formatPct(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

function formatNum(value: number | null): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-GB').format(Math.round(value));
}

function formatValue(value: number | null, format: string): string {
  if (value === null) return 'N/A';
  switch (format) {
    case 'currency':
      return formatGBP(value);
    case 'percentage':
      return formatPct(value);
    case 'number':
      return formatNum(value);
    case 'ratio':
      return value !== null ? `${value.toFixed(1)}x` : 'N/A';
    default:
      return String(value);
  }
}

// ─── Fashion / Luxury KPIs ─────────────────────────────────────────

function getCategoryMetrics(
  metrics: ProductMetrics[],
  category: string
): { units: number; revenue: number; customers: Set<string> } {
  const matching = metrics.filter((m) => m.category === category);
  const customers = new Set<string>();
  for (const m of matching) {
    for (const name of m.customerNames) {
      customers.add(name);
    }
  }
  return {
    units: matching.reduce((s, m) => s + m.unitsSold, 0),
    revenue: matching.reduce((s, m) => s + m.totalRevenue, 0),
    customers,
  };
}

export function calculateFashionKPIs(result: ProductIntelligenceResult): ProductKPI[] {
  const mto = getCategoryMetrics(result.metrics, 'MTO Bridal');
  const consultations = getCategoryMetrics(result.metrics, 'Consultations');
  const trunkShows = getCategoryMetrics(result.metrics, 'Trunk Shows & Events');

  // Consultation to Order Rate: contacts with consultations who also have MTO orders
  const consultationContacts = consultations.customers;
  const mtoContacts = mto.customers;
  let consultationToOrderCount = 0;
  for (const contact of consultationContacts) {
    if (mtoContacts.has(contact)) {
      consultationToOrderCount++;
    }
  }
  const consultationToOrderRate = safeDivide(
    consultationToOrderCount * 100,
    consultationContacts.size
  );

  // Revenue per Bride
  const revenuePerBride = safeDivide(result.totalRevenue, mto.customers.size);

  const kpis: ProductKPI[] = [
    {
      key: 'confirmed_brides',
      label: 'Confirmed Brides',
      description: 'Unique contacts with MTO Bridal category transactions',
      plainEnglish: 'How many brides have placed a made-to-order dress order',
      value: mto.customers.size,
      formattedValue: formatNum(mto.customers.size),
      format: 'number',
      higherIsBetter: true,
      category: 'customer',
    },
    {
      key: 'mto_dresses_sold',
      label: 'MTO Dresses Sold',
      description: 'Total quantity of items in the MTO Bridal category',
      plainEnglish: 'Number of made-to-order dresses sold this period',
      value: mto.units,
      formattedValue: formatNum(mto.units),
      format: 'number',
      higherIsBetter: true,
      category: 'product',
    },
    {
      key: 'avg_mto_price',
      label: 'Avg MTO Dress Price',
      description: 'Total MTO Bridal revenue divided by units sold',
      plainEnglish: 'The average price of each made-to-order dress',
      value: safeDivide(mto.revenue, mto.units),
      formattedValue: formatValue(safeDivide(mto.revenue, mto.units), 'currency'),
      format: 'currency',
      higherIsBetter: true,
      category: 'product',
    },
    {
      key: 'revenue_per_bride',
      label: 'Revenue per Bride',
      description: 'Total revenue divided by unique bride count',
      plainEnglish: 'How much each bride spends on average across all products',
      value: revenuePerBride,
      formattedValue: formatValue(revenuePerBride, 'currency'),
      format: 'currency',
      higherIsBetter: true,
      category: 'customer',
    },
    {
      key: 'consultation_to_order_rate',
      label: 'Consultation to Order Rate',
      description: 'Percentage of consultation contacts who place MTO orders',
      plainEnglish: 'What percentage of consultations turn into dress orders',
      value: consultationToOrderRate,
      formattedValue: formatPct(consultationToOrderRate),
      format: 'percentage',
      higherIsBetter: true,
      category: 'efficiency',
    },
    {
      key: 'trunk_show_revenue',
      label: 'Trunk Show Revenue',
      description: 'Total revenue from trunk shows and events',
      plainEnglish: 'Revenue generated from trunk shows, exhibitions, and pop-ups',
      value: trunkShows.revenue,
      formattedValue: formatGBP(trunkShows.revenue),
      format: 'currency',
      higherIsBetter: true,
      category: 'product',
    },
  ];

  // Product Mix (as individual KPIs per category)
  for (const cat of result.categoryBreakdown) {
    if (cat.revenue > 0) {
      kpis.push({
        key: `product_mix_${cat.category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        label: `${cat.category} Share`,
        description: `${cat.category} as a percentage of total revenue`,
        plainEnglish: `What share of revenue comes from ${cat.category}`,
        value: cat.percentage,
        formattedValue: formatPct(cat.percentage),
        format: 'percentage',
        higherIsBetter: false, // No inherent direction for mix
        category: 'product',
      });
    }
  }

  return kpis;
}

// ─── Generic / Other Industries KPIs ───────────────────────────────

export function calculateGenericKPIs(result: ProductIntelligenceResult): ProductKPI[] {
  const avgTransactionValue = safeDivide(result.totalRevenue, result.totalUnits);
  const revenuePerCustomer = safeDivide(result.totalRevenue, result.uniqueCustomers);

  const kpis: ProductKPI[] = [
    {
      key: 'total_units_sold',
      label: 'Units Sold',
      description: 'Total line item quantities across all transactions',
      plainEnglish: 'How many individual items or services were sold',
      value: result.totalUnits,
      formattedValue: formatNum(result.totalUnits),
      format: 'number',
      higherIsBetter: true,
      category: 'product',
    },
    {
      key: 'avg_transaction_value',
      label: 'Avg Transaction Value',
      description: 'Average revenue per line item unit',
      plainEnglish: 'The average price of each item or service sold',
      value: avgTransactionValue,
      formattedValue: formatValue(avgTransactionValue, 'currency'),
      format: 'currency',
      higherIsBetter: true,
      category: 'product',
    },
    {
      key: 'unique_customers',
      label: 'Unique Customers',
      description: 'Number of distinct contacts with transactions',
      plainEnglish: 'How many different customers bought from you',
      value: result.uniqueCustomers,
      formattedValue: formatNum(result.uniqueCustomers),
      format: 'number',
      higherIsBetter: true,
      category: 'customer',
    },
    {
      key: 'revenue_per_customer',
      label: 'Revenue per Customer',
      description: 'Total revenue divided by unique customer count',
      plainEnglish: 'How much each customer spends on average',
      value: revenuePerCustomer,
      formattedValue: formatValue(revenuePerCustomer, 'currency'),
      format: 'currency',
      higherIsBetter: true,
      category: 'customer',
    },
  ];

  // Top product/service by revenue
  if (result.categoryBreakdown.length > 0) {
    const top = result.categoryBreakdown[0];
    kpis.push({
      key: 'top_product_revenue',
      label: `Top: ${top.category}`,
      description: `Revenue from the highest-earning product/service category`,
      plainEnglish: `Your top-selling product/service is ${top.category}`,
      value: top.revenue,
      formattedValue: `${formatGBP(top.revenue)} (${formatPct(top.percentage)})`,
      format: 'currency',
      higherIsBetter: true,
      category: 'product',
    });
  }

  return kpis;
}

// ─── Industry Router ───────────────────────────────────────────────

const FASHION_INDUSTRIES = [
  'fashion', 'luxury', 'bridal', 'couture', 'clothing', 'apparel',
  'designer', 'atelier', 'wedding', 'dressmaking',
];

export function calculateIndustryKPIs(
  result: ProductIntelligenceResult,
  industry: string
): ProductKPI[] {
  const lower = industry.toLowerCase();
  const isFashion = FASHION_INDUSTRIES.some((k) => lower.includes(k));

  if (isFashion) {
    return calculateFashionKPIs(result);
  }

  return calculateGenericKPIs(result);
}
