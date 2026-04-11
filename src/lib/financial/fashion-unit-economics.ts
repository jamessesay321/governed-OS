/**
 * Fashion Unit Economics Engine
 * --------------------------------------------------
 * Calculates per-bride, per-product-line, and per-collection
 * economics by cross-referencing Shopify order data with Xero
 * cost accounts.
 *
 * DETERMINISTIC — all calculations are pure functions, no AI.
 *
 * v2: Added data quality alerts, sanity checks, upper bounds,
 *     overridable assumptions, and Xero type-aware classification.
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
  /** Whether this was classified by regex or by Xero class fallback */
  classifiedBy: 'regex' | 'xero_class' | 'override';
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

// ─── Data Quality ──────────────────────────────────────────

export type AlertActionType =
  | 'input_number'      // User types a number (bride count, avg order value)
  | 'reclassify'        // Show account reclassification UI
  | 'review_accounts'   // Navigate to account review
  | 'acknowledge';      // User confirms they've seen it

export interface DataQualityAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionType: AlertActionType;
  actionLabel: string;
  /** For input_number: which assumption key to override */
  assumptionKey?: keyof UnitEconomicsOverrides;
  /** For reclassify: which accounts need review */
  accountIds?: string[];
}

// ─── Overrides ─────────────────────────────────────────────

export interface UnitEconomicsOverrides {
  /** User-provided bride count for the period */
  brideCount?: number;
  /** Average bridal order value (used for sanity check) */
  avgBridalOrderValue?: number;
  /** Production rent allocation % (default 60%) */
  productionRentPct?: number;
  /** Account category overrides: accountId → category */
  accountOverrides?: Record<string, FashionCostCategory>;
}

export const DEFAULT_OVERRIDES: Required<Omit<UnitEconomicsOverrides, 'accountOverrides'>> = {
  brideCount: 0,    // 0 = auto-detect from Shopify
  avgBridalOrderValue: 5000,
  productionRentPct: 60,
};

// ─── Industry Benchmarks (for sanity checks) ──────────────

const BENCHMARKS = {
  revenuePerBride: { min: 1500, max: 25000, label: '£1,500-£25,000' },
  grossMarginPct: { min: 35, max: 80, label: '35-80%' },
  cogsPctOfRevenue: { min: 20, max: 65, label: '20-65% of revenue' },
  collectionCostPct: { min: 3, max: 20, label: '3-20% of revenue' },
  fabricPerDress: { min: 30, max: 500, label: '£30-£500/dress' },
} as const;

// ─── Existing types (unchanged) ────────────────────────────

export interface PerBrideEconomics {
  period: string;
  brideCount: number;
  /** Whether bride count was auto-detected or user-provided */
  brideCountSource: 'shopify' | 'estimated' | 'user_override';
  totalBridalRevenue: number;
  revenuePerBride: number;
  totalDirectCosts: number;
  directCostPerBride: number;
  grossMarginPerBride: number;
  grossMarginPct: number;
  avgItemsPerBride: number;
  consultationRevenue: number;
  consultationRevenuePerBride: number;
}

export interface ProductionEconomics {
  period: string;
  totalProductionStaffCost: number;
  estimatedGarments: number;
  ukCostPerGarment: number;
  labourCostPerGarment: number;
  premisesAllocationPerGarment: number;
  fabricCostPerGarment: number;
  fullyLoadedCostPerGarment: number;
  productionStaffAccounts: { name: string; amount: number }[];
}

export interface CollectionEconomics {
  period: string;
  photoshootCost: number;
  marketingCost: number;
  designStaffCost: number;
  totalCollectionCost: number;
  revenue: number;
  collectionCostPct: number;
  collectionROI: number;
}

export interface TrunkShowEconomics {
  period: string;
  foodDrinkCost: number;
  travelCost: number;
  accommodationCost: number;
  totalTrunkShowCost: number;
  periodRevenue: number;
}

export interface ChannelEconomics {
  online: { revenue: number; merchantFees: number; shippingCost: number; netMargin: number; marginPct: number };
  consultation: { revenue: number; premisesCost: number; staffCost: number; netMargin: number; marginPct: number };
}

export interface FashionUnitEconomicsSummary {
  period: string;
  perBride: PerBrideEconomics;
  production: ProductionEconomics;
  collection: CollectionEconomics;
  trunkShow: TrunkShowEconomics;
  channel: ChannelEconomics;
  costBreakdown: CostAccount[];
  kpis: FashionKPI[];
  /** Data quality alerts requiring user attention */
  alerts: DataQualityAlert[];
  /** Accounts that fell to 'other_overhead' — candidates for reclassification */
  unclassifiedAccounts: CostAccount[];
  /** Applied overrides */
  overrides: UnitEconomicsOverrides;
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
  severity?: 'good' | 'warning' | 'critical' | 'needs_verification';
}

// ─── Cost Classification ────────────────────────────────────

const FASHION_COST_PATTERNS: { pattern: RegExp; category: FashionCostCategory }[] = [
  // Materials
  { pattern: /^fabric$/i, category: 'fabric' },
  { pattern: /fabric/i, category: 'fabric' },
  { pattern: /embroidery/i, category: 'embroidery' },
  { pattern: /^purchases$/i, category: 'fabric' },  // generic "Purchases" in COGS = materials

  // Production staff — wide patterns to catch Xero naming variations
  { pattern: /bridal.*production.*salar/i, category: 'production_staff' },
  { pattern: /production.*salar/i, category: 'production_staff' },
  { pattern: /seamstress/i, category: 'production_staff' },
  { pattern: /pattern.*cut/i, category: 'production_staff' },
  { pattern: /samples.*production/i, category: 'production_staff' },
  { pattern: /production.*manager/i, category: 'production_staff' },
  { pattern: /production.*wage/i, category: 'production_staff' },
  { pattern: /direct.*labour/i, category: 'production_staff' },
  { pattern: /direct.*labor/i, category: 'production_staff' },
  // NIC and pension for production staff
  { pattern: /employer.*nic.*production/i, category: 'production_staff' },
  { pattern: /employer.*pension.*production/i, category: 'production_staff' },
  { pattern: /nic.*production/i, category: 'production_staff' },
  { pattern: /pension.*production/i, category: 'production_staff' },

  // Freelance/outsourced production
  { pattern: /freelance.*cogs/i, category: 'freelance_production' },
  { pattern: /freelance.*production/i, category: 'freelance_production' },
  { pattern: /freelance.*work/i, category: 'freelance_production' },
  { pattern: /outsourc/i, category: 'freelance_production' },
  { pattern: /subcontract/i, category: 'freelance_production' },

  // CoS sub-categories
  { pattern: /cos\s*-/i, category: 'fabric' }, // "CoS - Accessories", "CoS - Robes" etc.

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
  { pattern: /credit.*card.*fee/i, category: 'merchant_fees' },

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
  { pattern: /insurance/i, category: 'rent_premises' },

  // Design staff
  { pattern: /design.*salar/i, category: 'design_staff' },
  { pattern: /creative.*director/i, category: 'design_staff' },
  { pattern: /product.*dev/i, category: 'design_staff' },

  // Admin staff
  { pattern: /director.*remuneration/i, category: 'admin_staff' },
  { pattern: /wages.*salar/i, category: 'admin_staff' },
  { pattern: /employer.*nic$/i, category: 'admin_staff' },
  { pattern: /employer.*pension$/i, category: 'admin_staff' },
  { pattern: /staff.*training/i, category: 'admin_staff' },

  // Professional fees
  { pattern: /accountancy/i, category: 'professional_fees' },
  { pattern: /legal/i, category: 'professional_fees' },
  { pattern: /professional.*fee/i, category: 'professional_fees' },
  { pattern: /consultancy/i, category: 'professional_fees' },

  // Software
  { pattern: /subscription/i, category: 'software_subscriptions' },
  { pattern: /software/i, category: 'software_subscriptions' },

  // Finance
  { pattern: /interest/i, category: 'interest_finance' },
  { pattern: /bank.*charge/i, category: 'interest_finance' },
  { pattern: /bbl/i, category: 'interest_finance' },
  { pattern: /finance.*charge/i, category: 'interest_finance' },
];

/**
 * Classify a cost account into a fashion-specific category.
 * Uses regex first, then falls back to Xero class/type if no match.
 *
 * Key insight: In Xero, accounts with type=DIRECTCOSTS may have class=EXPENSE.
 * Salary/wage accounts under DIRECTCOSTS are almost certainly production staff.
 */
export function classifyFashionCost(
  accountName: string,
  xeroClass?: string,
  xeroType?: string
): { category: FashionCostCategory; classifiedBy: 'regex' | 'xero_class' } {
  // Try regex patterns first
  for (const { pattern, category } of FASHION_COST_PATTERNS) {
    if (pattern.test(accountName)) {
      return { category, classifiedBy: 'regex' };
    }
  }

  // Fallback: use Xero class/type to infer category
  const typeUpper = (xeroType ?? '').toUpperCase();
  const classUpper = (xeroClass ?? '').toUpperCase();

  // DIRECTCOSTS salary/wages accounts = production staff
  if (typeUpper === 'DIRECTCOSTS' || classUpper === 'DIRECTCOSTS') {
    if (/salar|wages|nic|pension|employer/i.test(accountName)) {
      return { category: 'production_staff', classifiedBy: 'xero_class' };
    }
    // Other DIRECTCOSTS are likely materials/fabric
    return { category: 'fabric', classifiedBy: 'xero_class' };
  }

  return { category: 'other_overhead', classifiedBy: 'xero_class' };
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

// ─── Sanity Checks ─────────────────────────────────────────

function buildAlerts(
  perBride: PerBrideEconomics,
  production: ProductionEconomics,
  costBreakdown: CostAccount[],
  totalRevenue: number,
  totalCOGS: number,
  shopifyProducts: ShopifyProductData[],
): DataQualityAlert[] {
  const alerts: DataQualityAlert[] = [];

  // 1. Bride count looks wrong
  if (perBride.brideCountSource === 'estimated') {
    alerts.push({
      id: 'bride_count_estimated',
      severity: 'critical',
      title: 'Bride count is estimated',
      message: `We couldn't match bridal products from Shopify, so bride count (${perBride.brideCount}) is a rough estimate. This makes per-bride metrics unreliable.`,
      actionType: 'input_number',
      actionLabel: 'Enter actual bride count',
      assumptionKey: 'brideCount',
    });
  }

  // 2. Revenue per bride exceeds upper bound
  if (perBride.revenuePerBride > BENCHMARKS.revenuePerBride.max) {
    alerts.push({
      id: 'revenue_per_bride_high',
      severity: 'warning',
      title: 'Revenue per bride seems too high',
      message: `£${Math.round(perBride.revenuePerBride).toLocaleString()} per bride is above the typical bridal range (${BENCHMARKS.revenuePerBride.label}). This usually means the bride count is too low or non-bridal revenue is included.`,
      actionType: 'input_number',
      actionLabel: 'Correct bride count',
      assumptionKey: 'brideCount',
    });
  }

  // 3. Gross margin unrealistically high
  if (perBride.grossMarginPct > BENCHMARKS.grossMarginPct.max) {
    alerts.push({
      id: 'margin_too_high',
      severity: 'critical',
      title: 'Gross margin is unrealistically high',
      message: `${perBride.grossMarginPct.toFixed(1)}% gross margin suggests direct costs are incomplete. Fashion businesses typically see ${BENCHMARKS.grossMarginPct.label} margins. Check that production staff salaries, fabric, and embroidery are classified under Cost of Sales.`,
      actionType: 'review_accounts',
      actionLabel: 'Review cost classification',
    });
  }

  // 4. COGS suspiciously low relative to revenue
  const cogsPct = totalRevenue > 0 ? (Math.abs(totalCOGS) / totalRevenue) * 100 : 0;
  if (totalRevenue > 0 && cogsPct < BENCHMARKS.cogsPctOfRevenue.min) {
    alerts.push({
      id: 'cogs_too_low',
      severity: 'warning',
      title: 'Cost of Sales looks too low',
      message: `COGS is only ${cogsPct.toFixed(1)}% of revenue (expected ${BENCHMARKS.cogsPctOfRevenue.label}). Staff salaries or material costs may be misclassified as operating expenses rather than direct costs in Xero.`,
      actionType: 'review_accounts',
      actionLabel: 'Review account classification',
    });
  }

  // 5. Production staff cost = 0 when it shouldn't be
  if (production.totalProductionStaffCost === 0 && totalRevenue > 1000) {
    const potentialStaffAccounts = costBreakdown.filter(
      (c) => c.costCategory === 'admin_staff' || c.costCategory === 'other_overhead'
    ).filter(
      (c) => /salar|wages|employer|nic|pension/i.test(c.accountName)
    );

    alerts.push({
      id: 'no_production_staff',
      severity: 'critical',
      title: 'No production staff costs detected',
      message: `Production staff cost is £0, but a fashion business with revenue needs seamstresses, pattern cutters, and production managers. ${potentialStaffAccounts.length > 0 ? `Found ${potentialStaffAccounts.length} salary account(s) that may be production staff.` : 'Check that production salary accounts exist in Xero.'}`,
      actionType: 'reclassify',
      actionLabel: potentialStaffAccounts.length > 0
        ? `Review ${potentialStaffAccounts.length} salary account(s)`
        : 'Review cost accounts',
      accountIds: potentialStaffAccounts.map((a) => a.accountId),
    });
  }

  // 6. No Shopify products found
  if (shopifyProducts.length === 0 && totalRevenue > 0) {
    alerts.push({
      id: 'no_shopify_products',
      severity: 'info',
      title: 'No Shopify order data for this period',
      message: 'Product-level revenue breakdown and bride count are unavailable. Connect Shopify and sync orders to enable per-bride and per-product analytics.',
      actionType: 'acknowledge',
      actionLabel: 'Understood',
    });
  }

  // 7. Large "other_overhead" bucket
  const otherOverheadTotal = costBreakdown
    .filter((c) => c.costCategory === 'other_overhead')
    .reduce((sum, c) => sum + c.amount, 0);
  const totalCosts = costBreakdown.reduce((sum, c) => sum + c.amount, 0);
  const otherOverheadPct = totalCosts > 0 ? (otherOverheadTotal / totalCosts) * 100 : 0;
  if (otherOverheadPct > 15 && otherOverheadTotal > 500) {
    const unclassifiedCount = costBreakdown.filter((c) => c.costCategory === 'other_overhead').length;
    alerts.push({
      id: 'large_other_overhead',
      severity: 'warning',
      title: `${unclassifiedCount} unclassified cost account(s)`,
      message: `${otherOverheadPct.toFixed(0)}% of costs (£${Math.round(otherOverheadTotal).toLocaleString()}) fell into "Other Overheads". Reclassifying these improves accuracy.`,
      actionType: 'reclassify',
      actionLabel: `Classify ${unclassifiedCount} account(s)`,
      accountIds: costBreakdown
        .filter((c) => c.costCategory === 'other_overhead')
        .map((c) => c.accountId),
    });
  }

  return alerts;
}

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
 * @param overrides - user-provided assumption overrides
 */
export function calculateFashionUnitEconomics(
  financials: NormalisedFinancial[],
  accounts: ChartOfAccount[],
  shopifyProducts: ShopifyProductData[],
  totalRevenue: number,
  totalCOGS: number,
  period: string,
  overrides: UnitEconomicsOverrides = {}
): FashionUnitEconomicsSummary {
  const productionRentPct = overrides.productionRentPct ?? DEFAULT_OVERRIDES.productionRentPct;

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
    const typeUpper = acc.type.toUpperCase();

    // Include DIRECTCOSTS (type or class) + EXPENSE + OVERHEADS
    const isCost = ['EXPENSE', 'OVERHEADS', 'DIRECTCOSTS'].includes(classUpper)
      || typeUpper === 'DIRECTCOSTS';
    if (!isCost) continue;

    // Check for user override first
    const userOverride = overrides.accountOverrides?.[acc.id];
    let category: FashionCostCategory;
    let classifiedBy: 'regex' | 'xero_class' | 'override';

    if (userOverride) {
      category = userOverride;
      classifiedBy = 'override';
    } else {
      const result = classifyFashionCost(acc.name, acc.class, acc.type);
      category = result.category;
      classifiedBy = result.classifiedBy;
    }

    const amount = Math.abs(Number(fin.amount));

    costBreakdown.push({
      accountId: acc.id,
      accountName: acc.name,
      accountCode: acc.code,
      amount,
      costCategory: category,
      classifiedBy,
    });

    costByCategory.set(category, (costByCategory.get(category) ?? 0) + amount);
  }

  const getCost = (cat: FashionCostCategory): number => costByCategory.get(cat) ?? 0;

  // ── Per-Bride Economics ──────────────────────────────

  // Identify bridal products from Shopify
  const bridalProducts = shopifyProducts.filter((p) =>
    /bridal|bespoke|mto|made.*to.*order|wedding|gown|dress|evening.*wear|custom/i.test(p.title)
  );
  const bridalRevenue = bridalProducts.reduce((sum, p) => sum + p.revenue, 0);
  const bridalUnits = bridalProducts.reduce((sum, p) => sum + p.units, 0);
  const shopifyBrideCount = bridalProducts.reduce((sum, p) => sum + p.orderCount, 0);

  // Total orders as fallback
  const totalShopifyOrders = shopifyProducts.reduce((sum, p) => sum + p.orderCount, 0);

  // Determine bride count source and value
  let effectiveBrideCount: number;
  let brideCountSource: 'shopify' | 'estimated' | 'user_override';

  if (overrides.brideCount && overrides.brideCount > 0) {
    // User explicitly told us the bride count
    effectiveBrideCount = overrides.brideCount;
    brideCountSource = 'user_override';
  } else if (shopifyBrideCount > 0) {
    // Matched bridal products in Shopify
    effectiveBrideCount = shopifyBrideCount;
    brideCountSource = 'shopify';
  } else if (totalShopifyOrders > 0) {
    // No bridal products matched, but we have orders — estimate
    // Use total orders as rough proxy (better than 1)
    effectiveBrideCount = totalShopifyOrders;
    brideCountSource = 'estimated';
  } else {
    // No Shopify data at all — estimate from revenue / avg order value
    const avgOrderValue = overrides.avgBridalOrderValue ?? DEFAULT_OVERRIDES.avgBridalOrderValue;
    effectiveBrideCount = totalRevenue > 0 ? Math.max(1, Math.round(totalRevenue / avgOrderValue)) : 0;
    brideCountSource = 'estimated';
  }

  // Consultation revenue
  const consultationProducts = shopifyProducts.filter((p) =>
    /consultation|fitting|appointment/i.test(p.title)
  );
  const consultationRevenue = consultationProducts.reduce((sum, p) => sum + p.revenue, 0);

  // Direct costs: use actual COGS from P&L (includes all DIRECTCOSTS accounts)
  const effectiveDirectCost = Math.abs(totalCOGS);

  // Use bridal revenue if identified, otherwise total revenue
  const effectiveBridalRevenue = bridalRevenue > 0 ? bridalRevenue : totalRevenue;

  const perBride: PerBrideEconomics = {
    period,
    brideCount: effectiveBrideCount,
    brideCountSource,
    totalBridalRevenue: effectiveBridalRevenue,
    revenuePerBride: effectiveBrideCount > 0 ? effectiveBridalRevenue / effectiveBrideCount : 0,
    totalDirectCosts: effectiveDirectCost,
    directCostPerBride: effectiveBrideCount > 0 ? effectiveDirectCost / effectiveBrideCount : 0,
    grossMarginPerBride: effectiveBrideCount > 0
      ? (effectiveBridalRevenue - effectiveDirectCost) / effectiveBrideCount
      : 0,
    grossMarginPct: effectiveBridalRevenue > 0
      ? ((effectiveBridalRevenue - effectiveDirectCost) / effectiveBridalRevenue) * 100
      : 0,
    avgItemsPerBride: effectiveBrideCount > 0 ? bridalUnits / effectiveBrideCount : 0,
    consultationRevenue,
    consultationRevenuePerBride: effectiveBrideCount > 0 ? consultationRevenue / effectiveBrideCount : 0,
  };

  // ── Production Economics ─────────────────────────────

  const productionStaffCost = getCost('production_staff');
  const rentCost = getCost('rent_premises');
  const productionRentAllocation = rentCost * (productionRentPct / 100);

  const totalUnitsProduced = shopifyProducts.reduce((sum, p) => sum + p.units, 0);
  const estimatedGarments = Math.max(1, totalUnitsProduced || effectiveBrideCount);

  const productionStaffAccounts = costBreakdown
    .filter((c) => c.costCategory === 'production_staff')
    .map((c) => ({ name: c.accountName, amount: c.amount }))
    .sort((a, b) => b.amount - a.amount);

  const fabricCost = getCost('fabric');
  const embroideryCost = getCost('embroidery');

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

  const onlineRevenue = shopifyProducts
    .filter((p) => !/consultation|fitting/i.test(p.title))
    .reduce((sum, p) => sum + p.revenue, 0);
  const onlineNetMargin = onlineRevenue - merchantFees - shippingCost;

  const consultationPremisesCost = rentCost * ((100 - productionRentPct) / 100);
  const consultationStaffCost = getCost('admin_staff') * 0.3;
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

  // ── Data Quality Alerts ──────────────────────────────

  const alerts = buildAlerts(perBride, production, costBreakdown, totalRevenue, totalCOGS, shopifyProducts);

  // Unclassified accounts (fell to other_overhead via xero_class fallback)
  const unclassifiedAccounts = costBreakdown.filter(
    (c) => c.costCategory === 'other_overhead' && c.classifiedBy !== 'override'
  );

  // ── KPI Cards ────────────────────────────────────────

  const formatGBP = (v: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(v);
  const formatPct = (v: number) => `${v.toFixed(1)}%`;

  // Severity with upper-bound checks
  function kpiSeverity(
    value: number,
    goodRange: [number, number],
  ): 'good' | 'warning' | 'critical' | 'needs_verification' {
    const [min, max] = goodRange;
    if (value >= min && value <= max) return 'good';
    if (value > max * 1.5 || value < min * 0.3) return 'needs_verification';
    if (value > max) return 'warning';
    if (value < min) return 'critical';
    return 'warning';
  }

  const kpis: FashionKPI[] = [
    {
      key: 'revenue_per_bride',
      label: 'Revenue per Bride',
      value: perBride.revenuePerBride,
      formattedValue: formatGBP(perBride.revenuePerBride),
      unit: 'GBP',
      benchmark: `Industry: ${BENCHMARKS.revenuePerBride.label}`,
      severity: perBride.brideCountSource === 'estimated'
        ? 'needs_verification'
        : kpiSeverity(perBride.revenuePerBride, [BENCHMARKS.revenuePerBride.min, BENCHMARKS.revenuePerBride.max]),
    },
    {
      key: 'gross_margin_per_bride',
      label: 'Gross Margin per Bride',
      value: perBride.grossMarginPct,
      formattedValue: formatPct(perBride.grossMarginPct),
      unit: '%',
      benchmark: `Target: ${BENCHMARKS.grossMarginPct.label}`,
      severity: kpiSeverity(perBride.grossMarginPct, [BENCHMARKS.grossMarginPct.min, BENCHMARKS.grossMarginPct.max]),
    },
    {
      key: 'bride_count',
      label: 'Brides This Month',
      value: perBride.brideCount,
      formattedValue: String(perBride.brideCount),
      unit: 'brides',
      severity: perBride.brideCountSource === 'estimated' ? 'needs_verification' : undefined,
      benchmark: perBride.brideCountSource === 'estimated'
        ? 'Estimated — enter actual count below'
        : perBride.brideCountSource === 'user_override'
          ? 'User-provided'
          : 'From Shopify orders',
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
      severity: production.totalProductionStaffCost === 0 && totalRevenue > 1000
        ? 'needs_verification'
        : undefined,
      benchmark: production.totalProductionStaffCost === 0
        ? 'Missing — review account classification'
        : undefined,
    },
    {
      key: 'collection_cost_pct',
      label: 'Collection Cost % Revenue',
      value: collection.collectionCostPct,
      formattedValue: formatPct(collection.collectionCostPct),
      unit: '%',
      benchmark: `Fashion norm: ${BENCHMARKS.collectionCostPct.label}`,
      severity: kpiSeverity(collection.collectionCostPct, [BENCHMARKS.collectionCostPct.min, BENCHMARKS.collectionCostPct.max]),
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
      benchmark: `Bridal: ${BENCHMARKS.fabricPerDress.label}`,
      severity: production.fabricCostPerGarment > 0
        ? kpiSeverity(production.fabricCostPerGarment, [BENCHMARKS.fabricPerDress.min, BENCHMARKS.fabricPerDress.max])
        : undefined,
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
    alerts,
    unclassifiedAccounts,
    overrides,
  };
}
