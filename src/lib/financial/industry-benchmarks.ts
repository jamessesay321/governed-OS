/**
 * Industry benchmark data for reconciliation sanity checks.
 * DETERMINISTIC — pure data lookup, no side effects.
 */

export interface IndustryBenchmarks {
  grossMarginRange: [number, number]; // [min%, max%]
  netMarginRange: [number, number];
  maxPlausibleNetMargin: number;
  expectsCOGS: boolean;
  expectsDepreciation: boolean;
  expectsStockMovements: boolean;
  expectsInterestExpense: boolean;
}

const BENCHMARKS: Record<string, IndustryBenchmarks> = {
  'technology-saas': {
    grossMarginRange: [55, 85],
    netMarginRange: [-20, 30],
    maxPlausibleNetMargin: 50,
    expectsCOGS: true, // hosting, infrastructure
    expectsDepreciation: false,
    expectsStockMovements: false,
    expectsInterestExpense: false,
  },
  'fashion-luxury': {
    grossMarginRange: [30, 65],
    netMarginRange: [-15, 20],
    maxPlausibleNetMargin: 35,
    expectsCOGS: true, // materials, labour, subcontractors
    expectsDepreciation: true,
    expectsStockMovements: true,
    expectsInterestExpense: true, // often debt-financed
  },
  retail: {
    grossMarginRange: [20, 55],
    netMarginRange: [-5, 15],
    maxPlausibleNetMargin: 25,
    expectsCOGS: true,
    expectsDepreciation: true,
    expectsStockMovements: true,
    expectsInterestExpense: false,
  },
  hospitality: {
    grossMarginRange: [20, 45],
    netMarginRange: [-10, 15],
    maxPlausibleNetMargin: 25,
    expectsCOGS: true, // food, beverage
    expectsDepreciation: true,
    expectsStockMovements: true,
    expectsInterestExpense: true,
  },
  'professional-services': {
    grossMarginRange: [50, 85],
    netMarginRange: [5, 35],
    maxPlausibleNetMargin: 50,
    expectsCOGS: false, // people cost is often in expenses
    expectsDepreciation: false,
    expectsStockMovements: false,
    expectsInterestExpense: false,
  },
  construction: {
    grossMarginRange: [10, 35],
    netMarginRange: [-5, 15],
    maxPlausibleNetMargin: 25,
    expectsCOGS: true, // materials, subcontractors
    expectsDepreciation: true,
    expectsStockMovements: true, // WIP
    expectsInterestExpense: true,
  },
  healthcare: {
    grossMarginRange: [30, 60],
    netMarginRange: [0, 20],
    maxPlausibleNetMargin: 35,
    expectsCOGS: true,
    expectsDepreciation: true,
    expectsStockMovements: false,
    expectsInterestExpense: false,
  },
  'creative-agency': {
    grossMarginRange: [40, 70],
    netMarginRange: [0, 25],
    maxPlausibleNetMargin: 40,
    expectsCOGS: false,
    expectsDepreciation: false,
    expectsStockMovements: false,
    expectsInterestExpense: false,
  },
};

const DEFAULT_BENCHMARKS: IndustryBenchmarks = {
  grossMarginRange: [15, 80],
  netMarginRange: [-20, 40],
  maxPlausibleNetMargin: 60,
  expectsCOGS: true,
  expectsDepreciation: false,
  expectsStockMovements: false,
  expectsInterestExpense: false,
};

/**
 * Look up industry benchmarks by slug. Returns default if not found.
 */
export function getBenchmarks(industrySlug: string | null): IndustryBenchmarks {
  if (!industrySlug) return DEFAULT_BENCHMARKS;

  const normalised = industrySlug.toLowerCase().replace(/\s+/g, '-');

  // Exact match
  if (BENCHMARKS[normalised]) return BENCHMARKS[normalised];

  // Partial match
  for (const [key, benchmarks] of Object.entries(BENCHMARKS)) {
    if (normalised.includes(key) || key.includes(normalised)) {
      return benchmarks;
    }
  }

  return DEFAULT_BENCHMARKS;
}

/**
 * Get all available industry slugs (for UI dropdowns etc.)
 */
export function getAvailableIndustries(): string[] {
  return Object.keys(BENCHMARKS);
}
