/**
 * Trunk Show Planner / Business Roadmap types.
 *
 * Used by the planner page, API route, and capacity calendar.
 */

export type TrunkShowStatus = 'planned' | 'confirmed' | 'completed' | 'cancelled';

export type PlannedTrunkShow = {
  id: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  staffRequired: number;
  freelancersRequired: number;
  hotelCostEstimate: number;
  travelCostEstimate: number;
  freelancerCostEstimate: number;
  shippingCostEstimate: number;
  expectedAppointments: number;
  conversionRate: number;
  averageDressPrice: number;
  expectedRevenue: number;
  totalCost: number;
  roi: number;
  status: TrunkShowStatus;
  notes?: string;
};

export type CapacitySlot = {
  month: string;
  resource: string;
  status: 'available' | 'booked' | 'conflict';
  trunkShowId?: string;
};

export type MonthlyFinancialImpact = {
  month: string;
  label: string;
  outflow: number;
  inflow: number;
  net: number;
};

export type AggregateImpact = {
  totalPlanned: number;
  totalEstimatedCost: number;
  totalExpectedRevenue: number;
  netRoi: number;
  roiPercent: number;
  monthlyImpact: MonthlyFinancialImpact[];
};

export type OptimalPlanRecommendation = {
  city: string;
  country: string;
  recommendedMonth: string;
  expectedRevenue: number;
  expectedCost: number;
  rationale: string;
};

export type TrunkShowPlannerData = {
  plans: PlannedTrunkShow[];
  historicalSpend: Record<string, number>;
  averageDressPrice: number;
  defaultConversionRate: number;
};
