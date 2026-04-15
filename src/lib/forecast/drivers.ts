/**
 * Forecast Driver Engine for Advisory OS.
 *
 * Driver-based forecasting inspired by Fathom: define a driver template
 * (e.g. Seamstress, Trunk Show) with cost AND revenue components, then
 * add instances to cascade impact through the entire forecast.
 *
 * All calculations are deterministic — no AI, no side effects.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DriverCategory = 'staff' | 'event' | 'asset' | 'product' | 'custom';

export type CostComponent = {
  label: string;
  annualAmount: number;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one-off';
  category: 'salary' | 'nic' | 'pension' | 'overhead' | 'travel' | 'materials' | 'other';
};

export type RevenueComponent = {
  label: string;
  unitOutput: number; // units per period
  revenuePerUnit: number;
  frequency: 'monthly' | 'quarterly' | 'annual';
};

export type DriverTemplate = {
  id: string;
  name: string;
  description: string;
  category: DriverCategory;
  icon: string; // Lucide icon name
  costComponents: CostComponent[];
  revenueComponents: RevenueComponent[];
  defaultStartDate: string;
  defaultEndDate?: string;
  scalable: boolean; // Can you have multiples?
};

export type DriverInstance = {
  id: string;
  templateId: string;
  templateName: string;
  name: string; // e.g. "Seamstress #3"
  quantity: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  overrides: Record<string, number>; // Override specific cost/revenue amounts
  active: boolean;
};

export type DriverImpact = {
  month: string; // YYYY-MM
  totalCost: number;
  totalRevenue: number;
  netImpact: number;
  costBreakdown: { label: string; amount: number }[];
  revenueBreakdown: { label: string; amount: number }[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse YYYY-MM-DD or YYYY-MM into { year, month }.
 */
function parseMonth(dateStr: string): { year: number; month: number } {
  const parts = dateStr.split('-');
  return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
}

/**
 * Check whether a given month falls within the active window of a driver instance.
 */
function isMonthActive(month: string, startDate: string, endDate?: string): boolean {
  const m = parseMonth(month);
  const s = parseMonth(startDate);

  const monthVal = m.year * 12 + m.month;
  const startVal = s.year * 12 + s.month;

  if (monthVal < startVal) return false;

  if (endDate) {
    const e = parseMonth(endDate);
    const endVal = e.year * 12 + e.month;
    if (monthVal > endVal) return false;
  }

  return true;
}

/**
 * Check if a month is the start month for a driver instance (used for one-off costs).
 */
function isStartMonth(month: string, startDate: string): boolean {
  const m = parseMonth(month);
  const s = parseMonth(startDate);
  return m.year === s.year && m.month === s.month;
}

/**
 * Get cost amount for a component in a given month, considering frequency.
 * For one-off: only applies in the start month.
 * For monthly: annualAmount / 12 each month.
 * For quarterly: annualAmount / 4 in months 1, 4, 7, 10 relative to start.
 * For annual: full annualAmount in the start month anniversary.
 */
function getMonthlyCostAmount(
  component: CostComponent,
  month: string,
  startDate: string,
): number {
  switch (component.frequency) {
    case 'one-off':
      return isStartMonth(month, startDate) ? component.annualAmount : 0;

    case 'monthly':
      return component.annualAmount / 12;

    case 'quarterly': {
      const m = parseMonth(month);
      const s = parseMonth(startDate);
      const monthsFromStart = (m.year - s.year) * 12 + (m.month - s.month);
      return monthsFromStart % 3 === 0 ? component.annualAmount / 4 : 0;
    }

    case 'annual':
      return isStartMonth(month, startDate) ? component.annualAmount : 0;

    default:
      return 0;
  }
}

/**
 * Get revenue amount for a component in a given month, considering frequency.
 */
function getMonthlyRevenueAmount(
  component: RevenueComponent,
  month: string,
  startDate: string,
): number {
  const totalRevenue = component.unitOutput * component.revenuePerUnit;

  switch (component.frequency) {
    case 'monthly':
      return totalRevenue;

    case 'quarterly': {
      const m = parseMonth(month);
      const s = parseMonth(startDate);
      const monthsFromStart = (m.year - s.year) * 12 + (m.month - s.month);
      return monthsFromStart % 3 === 0 ? totalRevenue : 0;
    }

    case 'annual':
      return isStartMonth(month, startDate) ? totalRevenue : 0;

    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Core Calculation Functions
// ---------------------------------------------------------------------------

/**
 * Calculate monthly cost/revenue impact for a single driver instance.
 *
 * @param template  The driver template definition
 * @param instance  The specific instance (quantity, dates, overrides)
 * @param months    Array of YYYY-MM strings to calculate for
 * @returns         Array of DriverImpact, one per month
 */
export function calculateDriverImpact(
  template: DriverTemplate,
  instance: DriverInstance,
  months: string[],
): DriverImpact[] {
  return months.map((month) => {
    // If the driver is inactive or this month is outside its window, return zero
    if (!instance.active || !isMonthActive(month, instance.startDate, instance.endDate)) {
      return {
        month,
        totalCost: 0,
        totalRevenue: 0,
        netImpact: 0,
        costBreakdown: [],
        revenueBreakdown: [],
      };
    }

    // Calculate cost breakdown
    const costBreakdown = template.costComponents.map((comp) => {
      const overrideKey = `cost:${comp.label}`;
      const baseAmount = getMonthlyCostAmount(comp, month, instance.startDate);
      const amount = instance.overrides[overrideKey] !== undefined
        ? instance.overrides[overrideKey]
        : baseAmount;
      return {
        label: comp.label,
        amount: amount * instance.quantity,
      };
    });

    // Calculate revenue breakdown
    const revenueBreakdown = template.revenueComponents.map((comp) => {
      const overrideKey = `revenue:${comp.label}`;
      const baseAmount = getMonthlyRevenueAmount(comp, month, instance.startDate);
      const amount = instance.overrides[overrideKey] !== undefined
        ? instance.overrides[overrideKey]
        : baseAmount;
      return {
        label: comp.label,
        amount: amount * instance.quantity,
      };
    });

    const totalCost = costBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const totalRevenue = revenueBreakdown.reduce((sum, item) => sum + item.amount, 0);

    return {
      month,
      totalCost,
      totalRevenue,
      netImpact: totalRevenue - totalCost,
      costBreakdown,
      revenueBreakdown,
    };
  });
}

/**
 * Aggregate multiple driver impact arrays into a single combined impact by month.
 *
 * @param impactArrays  Array of DriverImpact arrays (one per driver instance)
 * @returns             Single merged DriverImpact array
 */
export function aggregateDriverImpacts(impactArrays: DriverImpact[][]): DriverImpact[] {
  if (impactArrays.length === 0) return [];

  // Use the first array as the template for months
  const months = impactArrays[0].map((impact) => impact.month);

  return months.map((month, monthIdx) => {
    let totalCost = 0;
    let totalRevenue = 0;
    const costMap = new Map<string, number>();
    const revenueMap = new Map<string, number>();

    for (const impacts of impactArrays) {
      const impact = impacts[monthIdx];
      if (!impact) continue;

      totalCost += impact.totalCost;
      totalRevenue += impact.totalRevenue;

      for (const item of impact.costBreakdown) {
        costMap.set(item.label, (costMap.get(item.label) || 0) + item.amount);
      }

      for (const item of impact.revenueBreakdown) {
        revenueMap.set(item.label, (revenueMap.get(item.label) || 0) + item.amount);
      }
    }

    return {
      month,
      totalCost,
      totalRevenue,
      netImpact: totalRevenue - totalCost,
      costBreakdown: Array.from(costMap.entries()).map(([label, amount]) => ({ label, amount })),
      revenueBreakdown: Array.from(revenueMap.entries()).map(([label, amount]) => ({ label, amount })),
    };
  });
}

// ---------------------------------------------------------------------------
// Built-in Alonuko Templates
// ---------------------------------------------------------------------------

/**
 * Return pre-built driver templates calibrated to Alonuko's actual numbers.
 */
export function getBuiltInTemplates(): DriverTemplate[] {
  return [
    // ── Seamstress ──────────────────────────────────────────────────
    {
      id: 'tmpl_seamstress',
      name: 'Seamstress',
      description: 'Full-time seamstress producing ~40 bespoke bridal dresses per year. Includes salary, employer NIC, pension, and workspace overhead.',
      category: 'staff',
      icon: 'Users',
      costComponents: [
        // Seamstress salary: £26K avg per draft accounts staff breakdown
        { label: 'Salary', annualAmount: 26_000, frequency: 'monthly', category: 'salary' },
        { label: 'Employer NIC', annualAmount: 3_588, frequency: 'monthly', category: 'nic' },
        { label: 'Employer Pension', annualAmount: 780, frequency: 'monthly', category: 'pension' },
        { label: 'Workspace Overhead', annualAmount: 1_200, frequency: 'monthly', category: 'overhead' },
      ],
      revenueComponents: [
        // ~40 dresses/year = 3.3/month × £7,000 avg (per draft accounts FY25)
        { label: 'Dress Production', unitOutput: 3.3, revenuePerUnit: 7_000, frequency: 'monthly' },
      ],
      defaultStartDate: new Date().toISOString().slice(0, 10),
      scalable: true,
    },

    // ── Trunk Show Event ────────────────────────────────────────────
    {
      id: 'tmpl_trunk_show',
      name: 'Trunk Show Event',
      description: 'Single trunk show event including travel, accommodation, freelancers, shipping, and F&B. Generates appointments that convert to orders.',
      category: 'event',
      icon: 'Plane',
      costComponents: [
        { label: 'Travel', annualAmount: 4_000, frequency: 'one-off', category: 'travel' },
        { label: 'Hotel & Accommodation', annualAmount: 3_000, frequency: 'one-off', category: 'travel' },
        { label: 'Freelancers', annualAmount: 2_000, frequency: 'one-off', category: 'other' },
        { label: 'Shipping & Logistics', annualAmount: 1_500, frequency: 'one-off', category: 'materials' },
        { label: 'Food & Drink', annualAmount: 500, frequency: 'one-off', category: 'other' },
      ],
      revenueComponents: [
        // 15 appointments × 65% conversion = ~10 bookings × £7,000 = ~£70,000
        { label: 'Show Orders', unitOutput: 9.75, revenuePerUnit: 7_000, frequency: 'monthly' },
      ],
      defaultStartDate: new Date().toISOString().slice(0, 10),
      scalable: true,
    },

    // ── Studio Lease ────────────────────────────────────────────────
    {
      id: 'tmpl_studio_lease',
      name: 'Studio Lease',
      description: 'Monthly studio space lease covering rent, utilities, and insurance. Enables capacity for seamstresses to operate.',
      category: 'asset',
      icon: 'Building',
      costComponents: [
        { label: 'Rent', annualAmount: 48_000, frequency: 'monthly', category: 'overhead' },
        { label: 'Utilities', annualAmount: 6_000, frequency: 'monthly', category: 'overhead' },
        { label: 'Insurance', annualAmount: 3_600, frequency: 'monthly', category: 'overhead' },
      ],
      revenueComponents: [],
      defaultStartDate: new Date().toISOString().slice(0, 10),
      scalable: false,
    },

    // ── Marketing Campaign ──────────────────────────────────────────
    {
      id: 'tmpl_marketing',
      name: 'Marketing Campaign',
      description: 'Digital or print marketing campaign. Variable spend with estimated lead generation, conversion rate, and average order value.',
      category: 'custom',
      icon: 'Megaphone',
      costComponents: [
        { label: 'Campaign Spend', annualAmount: 2_500, frequency: 'one-off', category: 'other' },
      ],
      revenueComponents: [
        // 20 leads × 25% conversion = 5 orders × £7,000 = £35,000
        { label: 'Campaign Orders', unitOutput: 5, revenuePerUnit: 7_000, frequency: 'monthly' },
      ],
      defaultStartDate: new Date().toISOString().slice(0, 10),
      scalable: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Month Generation Helper
// ---------------------------------------------------------------------------

/**
 * Generate an array of YYYY-MM strings starting from a given date.
 */
export function generateMonthRange(startDate: string, count: number): string[] {
  const start = parseMonth(startDate);
  const months: string[] = [];

  for (let i = 0; i < count; i++) {
    const totalMonths = start.month - 1 + i;
    const year = start.year + Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    months.push(`${year}-${String(month).padStart(2, '0')}`);
  }

  return months;
}
