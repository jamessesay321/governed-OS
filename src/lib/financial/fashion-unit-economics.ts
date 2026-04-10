/**
 * Fashion Unit Economics Engine
 * --------------------------------------------------
 * Calculates per-bride, per-product-line, and per-collection
 * economics by cross-referencing Shopify order data with Xero
 * cost accounts.
 *
 * This is the module that turns a generic P&L into fashion-specific
 * intelligence: "What does it cost to produce and sell one bridal
 * piece? Is it more profitable to produce in the UK or outsource?"
 *
 * DETERMINISTIC — all calculations are pure functions, no AI.
 *
 * Key metrics:
 * 1. Per-bride economics (revenue, COGS, gross margin per bride)
 * 2. Production cost per garment (UK vs outsource comparison)
 * 3. Collection/photoshoot ROI
 * 4. Trunk show ROI
 * 5. Channel profitability (online vs consultation vs wholesale)
 * 6. Employee cost per production hour
 * 7. Fabric utilisation (cost per garment)
 * 8. Seasonal patterns (bride count by month)
 */

import type { ChartOfAccount, NormalisedFinancial } from '@/types';

// ─── Types ──────────────────────────────────────────────────

export interface ShopifyProductData {
  title: string;
  revenue: number;
  units: number;
  orderCount: number;
  percentage: number;
  sku?: string;
}

export interface CostAccount {
  accountId: string;
  accountName: string;
  accountCode: string;
  amount: number;
  costCategory: FashionCostCategory;
}

export type FashionCostCategory =
  | 'fabric'
  | 'embroidery'
  | 'production_staff'
  | 'freelance_production'
  | 'shipping_delivery'
  | 'merchant_fees'
  | 'photoshoot'
  | 'trunk_show'
  | 'marketing'
  | 'rent_premises'
  | 'design_staff'
  | 'admin_staff'
  | 'professional_fees'
  | 'software_subscriptions'
  | 'other_overhead'
  | 'interest_finance';

export interface PerBrideEconomics {
  period: string;
  brideCount: number;
  totalBridalRevenue: number;
  revenuePerBride: number;
  totalDirectCosts: number;
  directCostPerBride: number;
  grossMarginPerBride: number;
  grossMarginPct: number;
  avgItemsPerBride: number;
  /** Consultation income as separate stream */
  consultationRevenue: number;
  consultationRevenuePerBride: number;
}

export interface ProductionEconomics {
  period: string;
  /** Total production staff costs (seamstress, pattern cutter wages + NIC + pension) */
  totalProductionStaffCost: number;
  /** Estimated garments produced this month */
  estimatedGarments: number;
  /** UK production cost per garment (staff + rent allocation) */
  ukCostPerGarment: number;
  /** Just the labour component */
  labourCostPerGarment: number;
  /** Rent/premises allocation to production */
  premisesAllocationPerGarment: number;
  /** Fabric cost per garment */
  fabricCostPerGarment: number;
  /** Total fully-loaded cost per garment (materials + labour + premises) */
  fullyLoadedCostPerGarment: number;
  /** Employee details */
  productionStaffAccounts: { name: string; amount: number }[];
}

export interface CollectionEconomics {
  period: string;
  /** Photoshoot costs this period */
  photoshootCost: number;
  /** Marketing/advertising spend */
  marketingCost: number;
  /** Design staff costs */
  designStaffCost: number;
  /** Total collection development cost */
  totalCollectionCost: number;
  /** Revenue in the period */
  revenue: number;
  /** Collection cost as % of revenue */
  collectionCostPct: number;
  /** ROI: (Revenue - Collection Cost) / Collection Cost */
  collectionROI: number;
}

export interface TrunkShowEconomics {
  period: string;
  /** Trunk show food/drink costs */
  foodDrinkCost: number;
  /** Travel costs (assumed partially trunk show) */
  travelCost: number;
  /** Accommodation (assumed partially trunk show) */
  accommodationCost: number;
  /** Total trunk show investment */
  totalTrunkShowCost: number;
  /** Revenue in the period (assumes trunk shows drive some revenue) */
  periodRevenue: number;
}

export interface ChannelEconomics {
  /** Online (Shopify) revenue and estimated costs */
  online: { revenue: number; merchantFees: number; shippingCost: number; netMargin: number; marginPct: number };
  /** Consultation / in-person revenue */
  consultation: { revenue: number; premisesCost: number; staffCost: number; netMargin: number; marginPct: number };
}

export interface FashionUnitEconomicsSummary {
  period: string;
  perBride: PerBrideEconomics;
  production: ProductionEconomics;
  collection: CollectionEconomics;
  trunkShow: TrunkShowEconomics;
  channel: ChannelEconomics;
  /** All cost accounts classified */
  costBreakdown: CostAccount[];
  /** Key KPIs for dashboard cards */
  kpis: FashionKPI[];
}

export interface FashionKPI {
  key: string;
  label: string;
  value: number;
  formattedValue: string;
  unit: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: number;
  benchmark?: string;
  severity?: 'good' | 'warning' | 'critical';
}

// ─── Cost Classification ────────────────────────────────────

const FASHION_COST_PATTERNS: { pattern: RegExp; category: FashionCostCategory }[] = [
  // Materials
  { pattern: /^fabric$/i, category: 'fabric' },
  { pattern: /fabric.*purchase/i, category: 'fabric' },
  { pattern: /embroidery/i, category: 'embroidery' },

  // Production staff
  { pattern: /bridal.*production.*salar/i, category: 'production_staff' },
  { pattern: /production.*salar/i, category: 'production_staff' },
  { pattern: /seamstress/i, category: 'production_staff' },
  { pattern: /pattern.*cut/i, category: 'production_staff' },
  { pattern: /samples.*production/i, category: 'production_staff' },
  { pattern: /production.*manager/i, category: 'production_staff' },
  // NIC and pension for production staff
  { pattern: /employer.*nic.*production/i, category: 'production_staff' },
  { pattern: /employer.*pension.*production/i, category: 'production_staff' },

  // Freelance/outsourced production
  { pattern: /freelance.*cogs/i, category: 'freelance_production' },
  { pattern: /freelance.*production/i, category: 'freelance_production' },
  { pattern: /outsourc/i, category: 'freelance_production' },
  { pattern: /subcontract/i, category: 'freelance_production' },

  // Shipping
  { pattern: /courier/i, category: 'shipping_delivery' },
  { pattern: /delivery/i, category: 'shipping_delivery' },
  { pattern: /shipping.*cost/i, category: 'shipping_delivery' },
  { pattern: /postage/i, category: 'shipping_delivery' },

  // Merchant fees (online channel cost)
  { pattern: /merchant.*fee/i, category: 'merchant_fees' },
  { pattern: /shopify.*fee/i, category: 'merchant_fees' },
  { pattern: /stripe/i, category: 'merchant_fees' },
  { pattern: /payment.*fee/i, category: 'merchant_fees' },

  // Photoshoot & campaign
  { pattern: /photoshoot/i, category: 'photoshoot' },
  { pattern: /photography/i, category: 'photoshoot' },
  { pattern: /lookbook/i, category: 'photoshoot' },

  // Trunk shows
  { pattern: /trunk.*show/i, category: 'trunk_show' },

  // Marketing
  { pattern: /marketing/i, category: 'marketing' },
  { pattern: /advertising/i, category: 'marketing' },
  { pattern: /pr\b/i, category: 'marketing' },
  { pattern: /digital.*market/i, category: 'marketing' },
  { pattern: /social.*media/i, category: 'marketing' },

  // Rent & premises
  { pattern: /^rent$/i, category: 'rent_premises' },
  { pattern: /premises/i, category: 'rent_premises' },
  { pattern: /studio.*expense/i, category: 'rent_premises' },
  { pattern: /rates$/i, category: 'rent_premises' },
  { pattern: /cleaning/i, category: 'rent_premises' },

  // Design staff
  { pattern: /design.*salar/i, category: 'design_staff' },
  { pattern: /creative.*director/i, category: 'design_staff' },

  // Admin staff
  { pattern: /director.*remuneration/i, category: 'admin_staff' },
  { pattern: /wages.*salar/i, category: 'admin_staff' },
  { pattern: /employer.*nic$/i, category: 'admin_staff' },
  { pattern: /employer.*pension$/i, category: 'admin_staff' },

  // Professional fees
  { pattern: /accountancy/i, category: 'professional_fees' },
  { pattern: /legal/i, category: 'professional_fees' },
  { pattern: /professional.*fee/i, category: 'professional_fees' },

  // Software
  { pattern: /subscription/i, category: 'software_subscriptions' },
  { pattern: /software/i, category: 'software_subscriptions' },

  // Finance
  { pattern: /interest/i, category: 'interest_finance' },
  { pattern: /bank.*charge/i, category: 'interest_finance' },
  { pattern: /bbl/i, category: 'interest_finance' },
];

/**
 * Classify a cost account into a fashion-specific category.
 */
export function classifyFashionCost(accountName: string): FashionCostCategory {
  for (const { pattern, category } of FASHION_COST_PATTERNS) {
    if (pattern.test(accountName)) {
      return category;
    }
  }
  return 'other_overhead';
}

// ─── Cost Labels ────────────────────────────────────────────

export const FASHION_COST_LABELS: Record<FashionCostCategory, string> = {
  fabric: 'Fabric & Materials',
  embroidery: 'Embroidery',
  production_staff: 'Production Staff',
  freelance_production: 'Freelance / Outsourced Production',
  shipping_delivery: 'Shipping & Delivery',
  merchant_fees: 'Merchant / Payment Fees',
  photoshoot: 'Photoshoots & Campaigns',
  trunk_show: 'Trunk Shows & Events',
  marketing: 'Marketing & Advertising',
  rent_premises: 'Rent & Premises',
  design_staff: 'Design Staff',
  admin_staff: 'Admin & Director Costs',
  professional_fees: 'Professional Fees',
  software_subscriptions: 'Software & Subscriptions',
  other_overhead: 'Other Overheads',
  interest_finance: 'Interest & Finance',
};

// ─── Core Calculation ───────────────────────────────────────

/**
 * Build complete fashion unit economics from financial data and Shopify products.
 *
 * @param financials - normalised_financials rows for the period
 * @param accounts - chart_of_accounts for the org
 * @param shopifyProducts - product-level revenue from Shopify
 * @param totalRevenue - total revenue for the period
 * @param totalCOGS - total COGS for the period
 * @param period - YYYY-MM
 */
export function calculateFashionUnitEconomics(
  financials: NormalisedFinancial[],
  accounts: ChartOfAccount[],
  shopifyProducts: ShopifyProductData[],
  totalRevenue: number,
  totalCOGS: number,
  period: string
): FashionUnitEconomicsSummary {
  // Build account lookup
  const accountMap = new Map<string, ChartOfAccount>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  // Classify all cost accounts
  const costBreakdown: CostAccount[] = [];
  const costByCategory = new Map<FashionCostCategory, number>();

  for (const fin of financials) {
    const acc = accountMap.get(fin.account_id);
    if (!acc) continue;

    const classUpper = acc.class.toUpperCase();
    // Only classify cost accounts (skip revenue, assets, liabilities)
    if (!['EXPENSE', 'OVERHEADS', 'DIRECTCOSTS'].includes(classUpper)) continue;

    const category = classifyFashionCost(acc.name);
    const amount = Math.abs(Number(fin.amount));

    costBreakdown.push({
      accountId: acc.id,
      accountName: acc.name,
      accountCode: acc.code,
      amount,
      costCategory: category,
    });

    costByCategory.set(category, (costByCategory.get(category) ?? 0) + amount);
  }

  const getCost = (cat: FashionCostCategory): number => costByCategory.get(cat) ?? 0;

  // ── Per-Bride Economics ──────────────────────────────

  // Identify bridal products from Shopify
  const bridalProducts = shopifyProducts.filter((p) =>
    /bridal|bespoke|mto|made.*to.*order|wedding|gown|dress/i.test(p.title)
  );
  const bridalRevenue = bridalProducts.reduce((sum, p) => sum + p.revenue, 0);
  const bridalUnits = bridalProducts.reduce((sum, p) => sum + p.units, 0);
  // Each bridal order ≈ 1 bride (may have multiple items like dress + veil)
  const brideCount = bridalProducts.reduce((sum, p) => sum + p.orderCount, 0);
  // If no bridal products identified, estimate from total orders
  const effectiveBrideCount = brideCount > 0 ? brideCount : Math.max(1, Math.round(bridalUnits));

  // Consultation revenue
  const consultationProducts = shopifyProducts.filter((p) =>
    /consultation|fitting|appointment/i.test(p.title)
  );
  const consultationRevenue = consultationProducts.reduce((sum, p) => sum + p.revenue, 0);

  // Direct costs attributable to production
  const fabricCost = getCost('fabric');
  const embroideryCost = getCost('embroidery');
  const freelanceProductionCost = getCost('freelance_production');
  const directMaterialsCost = fabricCost + embroideryCost + freelanceProductionCost;
  // Use COGS as a more accurate direct cost if available
  const effectiveDirectCost = totalCOGS > 0 ? Math.abs(totalCOGS) : directMaterialsCost;

  const perBride: PerBrideEconomics = {
    period,
    brideCount: effectiveBrideCount,
    totalBridalRevenue: bridalRevenue > 0 ? bridalRevenue : totalRevenue,
    revenuePerBride: effectiveBrideCount > 0 ? (bridalRevenue > 0 ? bridalRevenue : totalRevenue) / effectiveBrideCount : 0,
    totalDirectCosts: effectiveDirectCost,
    directCostPerBride: effectiveBrideCount > 0 ? effectiveDirectCost / effectiveBrideCount : 0,
    grossMarginPerBride: effectiveBrideCount > 0
      ? ((bridalRevenue > 0 ? bridalRevenue : totalRevenue) - effectiveDirectCost) / effectiveBrideCount
      : 0,
    grossMarginPct: (bridalRevenue > 0 ? bridalRevenue : totalRevenue) > 0
      ? (((bridalRevenue > 0 ? bridalRevenue : totalRevenue) - effectiveDirectCost) / (bridalRevenue > 0 ? bridalRevenue : totalRevenue)) * 100
      : 0,
    avgItemsPerBride: effectiveBrideCount > 0 ? bridalUnits / effectiveBrideCount : 0,
    consultationRevenue,
    consultationRevenuePerBride: effectiveBrideCount > 0 ? consultationRevenue / effectiveBrideCount : 0,
  };

  // ── Production Economics ─────────────────────────────

  const productionStaffCost = getCost('production_staff');
  const rentCost = getCost('rent_premises');
  // Estimate: 60% of rent is production space (studio/atelier), 40% is showroom/office
  const productionRentAllocation = rentCost * 0.6;

  // Estimate garments produced: use total units from Shopify as proxy
  const totalUnitsProduced = shopifyProducts.reduce((sum, p) => sum + p.units, 0);
  const estimatedGarments = Math.max(1, totalUnitsProduced);

  const productionStaffAccounts = costBreakdown
    .filter((c) => c.costCategory === 'production_staff')
    .map((c) => ({ name: c.accountName, amount: c.amount }))
    .sort((a, b) => b.amount - a.amount);

  const production: ProductionEconomics = {
    period,
    totalProductionStaffCost: productionStaffCost,
    estimatedGarments,
    ukCostPerGarment: estimatedGarments > 0
      ? (productionStaffCost + productionRentAllocation) / estimatedGarments
      : 0,
    labourCostPerGarment: estimatedGarments > 0 ? productionStaffCost / estimatedGarments : 0,
    premisesAllocationPerGarment: estimatedGarments > 0 ? productionRentAllocation / estimatedGarments : 0,
    fabricCostPerGarment: estimatedGarments > 0 ? fabricCost / estimatedGarments : 0,
    fullyLoadedCostPerGarment: estimatedGarments > 0
      ? (productionStaffCost + productionRentAllocation + fabricCost + embroideryCost) / estimatedGarments
      : 0,
    productionStaffAccounts,
  };

  // ── Collection Economics ─────────────────────────────

  const photoshootCost = getCost('photoshoot');
  const marketingCost = getCost('marketing');
  const designStaffCost = getCost('design_staff');
  const totalCollectionCost = photoshootCost + marketingCost + designStaffCost;

  const collection: CollectionEconomics = {
    period,
    photoshootCost,
    marketingCost,
    designStaffCost,
    totalCollectionCost,
    revenue: totalRevenue,
    collectionCostPct: totalRevenue > 0 ? (totalCollectionCost / totalRevenue) * 100 : 0,
    collectionROI: totalCollectionCost > 0
      ? ((totalRevenue - totalCollectionCost) / totalCollectionCost) * 100
      : 0,
  };

  // ── Trunk Show Economics ─────────────────────────────

  const trunkShowCost = getCost('trunk_show');
  // Travel and accommodation partially attributable to trunk shows
  const travelAccounts = costBreakdown.filter((c) => /travel|subsistence/i.test(c.accountName));
  const accommAccounts = costBreakdown.filter((c) => /accommodation/i.test(c.accountName));
  const travelCost = travelAccounts.reduce((sum, c) => sum + c.amount, 0);
  const accommodationCost = accommAccounts.reduce((sum, c) => sum + c.amount, 0);

  const trunkShow: TrunkShowEconomics = {
    period,
    foodDrinkCost: trunkShowCost,
    travelCost,
    accommodationCost,
    totalTrunkShowCost: trunkShowCost + travelCost + accommodationCost,
    periodRevenue: totalRevenue,
  };

  // ── Channel Economics ────────────────────────────────

  const merchantFees = getCost('merchant_fees');
  const shippingCost = getCost('shipping_delivery');

  // Online = Shopify revenue minus merchant fees and shipping
  const onlineRevenue = shopifyProducts
    .filter((p) => !/consultation|fitting/i.test(p.title))
    .reduce((sum, p) => sum + p.revenue, 0);
  const onlineNetMargin = onlineRevenue - merchantFees - shippingCost;

  // Consultation = in-person / by-appointment revenue minus premises allocation
  const consultationPremisesCost = rentCost * 0.4; // 40% of rent is showroom
  const consultationStaffCost = getCost('admin_staff') * 0.3; // 30% of admin time on consultations
  const consultNetMargin = consultationRevenue - consultationPremisesCost - consultationStaffCost;

  const channel: ChannelEconomics = {
    online: {
      revenue: onlineRevenue,
      merchantFees,
      shippingCost,
      netMargin: onlineNetMargin,
      marginPct: onlineRevenue > 0 ? (onlineNetMargin / onlineRevenue) * 100 : 0,
    },
    consultation: {
      revenue: consultationRevenue,
      premisesCost: consultationPremisesCost,
      staffCost: consultationStaffCost,
      netMargin: consultNetMargin,
      marginPct: consultationRevenue > 0 ? (consultNetMargin / consultationRevenue) * 100 : 0,
    },
  };

  // ── KPI Cards ────────────────────────────────────────

  const formatGBP = (v: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(v);
  const formatPct = (v: number) => `${v.toFixed(1)}%`;

  const kpis: FashionKPI[] = [
    {
      key: 'revenue_per_bride',
      label: 'Revenue per Bride',
      value: perBride.revenuePerBride,
      formattedValue: formatGBP(perBride.revenuePerBride),
      unit: 'GBP',
      benchmark: 'Fashion avg: £2,000-£5,000',
      severity: perBride.revenuePerBride > 2000 ? 'good' : perBride.revenuePerBride > 1000 ? 'warning' : 'critical',
    },
    {
      key: 'gross_margin_per_bride',
      label: 'Gross Margin per Bride',
      value: perBride.grossMarginPct,
      formattedValue: formatPct(perBride.grossMarginPct),
      unit: '%',
      benchmark: 'Target: 60-75%',
      severity: perBride.grossMarginPct > 60 ? 'good' : perBride.grossMarginPct > 40 ? 'warning' : 'critical',
    },
    {
      key: 'bride_count',
      label: 'Brides This Month',
      value: perBride.brideCount,
      formattedValue: String(perBride.brideCount),
      unit: 'brides',
    },
    {
      key: 'uk_cost_per_garment',
      label: 'UK Cost per Garment',
      value: production.fullyLoadedCostPerGarment,
      formattedValue: formatGBP(production.fullyLoadedCostPerGarment),
      unit: 'GBP',
      benchmark: 'Outsource comparison: £200-£500',
    },
    {
      key: 'production_staff_cost',
      label: 'Production Staff Cost',
      value: production.totalProductionStaffCost,
      formattedValue: formatGBP(production.totalProductionStaffCost),
      unit: 'GBP/month',
    },
    {
      key: 'collection_cost_pct',
      label: 'Collection Cost % Revenue',
      value: collection.collectionCostPct,
      formattedValue: formatPct(collection.collectionCostPct),
      unit: '%',
      benchmark: 'Fashion norm: 8-15% of revenue',
      severity: collection.collectionCostPct < 15 ? 'good' : collection.collectionCostPct < 25 ? 'warning' : 'critical',
    },
    {
      key: 'trunk_show_investment',
      label: 'Trunk Show Investment',
      value: trunkShow.totalTrunkShowCost,
      formattedValue: formatGBP(trunkShow.totalTrunkShowCost),
      unit: 'GBP/month',
    },
    {
      key: 'fabric_cost_per_garment',
      label: 'Fabric Cost per Garment',
      value: production.fabricCostPerGarment,
      formattedValue: formatGBP(production.fabricCostPerGarment),
      unit: 'GBP',
      benchmark: 'Bridal fabric: £50-£300/dress',
    },
  ];

  return {
    period,
    perBride,
    production,
    collection,
    trunkShow,
    channel,
    costBreakdown,
    kpis,
  };
}
