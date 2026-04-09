/**
 * Post-Onboarding Business Intelligence Derivation Pipeline
 * ----------------------------------------------------------
 * When a new org completes Xero sync + interview, this pipeline
 * auto-derives validation rules and business intelligence that powers
 * every other skill. It runs the 4 intelligence modules and stores
 * results in company_skills for platform-wide consumption.
 *
 * Trigger conditions:
 *  - After a new org completes Xero sync
 *  - After onboarding interview is completed
 *  - When a sync reveals significant new data
 *  - On-demand via settings or admin
 *
 * Skill references:
 *  - client-context-derivation.md
 *  - seasonality-awareness.md
 *  - revenue-model-awareness.md
 *  - cost-structure-analysis.md
 *  - debt-service-reality.md
 */

import { createUntypedServiceClient } from '@/lib/supabase/server';
import { detectSeasonalProfile, type SeasonalProfile } from '@/lib/financial/seasonal-profile';
import { detectRevenueModel, type RevenueModelProfile } from '@/lib/financial/revenue-model';
import { fetchFinanceCosts } from '@/lib/financial/finance-costs';
import { diagnoseCashFlow, computeDebtServiceMetrics, type CashFlowDiagnosis, type DebtServiceMetrics } from '@/lib/financial/cash-flow-analysis';
import { analyseCostStructure, type CostStructureSummary } from '@/lib/financial/cost-structure';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';

// ─── Types ──────────────────────────────────────────────────

export interface DerivedBusinessIntelligence {
  orgId: string;
  derivedAt: string;
  version: number;

  /** Seasonal pattern detection results */
  seasonalProfile: SeasonalProfile;

  /** Revenue model classification */
  revenueModel: RevenueModelProfile;

  /** Cost structure analysis (fixed vs variable) */
  costStructure: CostStructureSummary | null;

  /** Cash flow root cause diagnosis */
  cashFlowDiagnosis: CashFlowDiagnosis | null;

  /** Debt service metrics (if debt exists) */
  debtMetrics: DebtServiceMetrics | null;

  /** Derived validation rules for this specific business */
  validationRules: {
    /** How to count clients for this revenue model */
    clientCountSource: string;
    /** Whether P&L must include finance costs */
    mustIncludeFinanceCosts: boolean;
    /** Expected direction of cash flow */
    expectedCashFlowDirection: 'positive' | 'negative' | 'breakeven';
    /** Anomaly threshold multiplier for seasonal businesses */
    anomalyThresholdMultiplier: number;
    /** Expected gross margin range [min, max] as percentages */
    expectedGrossMarginRange: [number, number];
    /** Revenue model-specific primary KPIs */
    primaryKPIs: string[];
  };
}

// ─── Main Pipeline ──────────────────────────────────────────

/**
 * Run the full business intelligence derivation pipeline for an org.
 * This is the orchestrator that calls all 4 intelligence modules
 * and combines their output into a unified profile.
 */
export async function deriveBusinessIntelligence(
  orgId: string
): Promise<DerivedBusinessIntelligence> {
  const svc = await createUntypedServiceClient();

  // Fetch interview data for revenue model detection
  const { data: orgData } = await svc
    .from('organisations')
    .select('raw_interview_data, industry')
    .eq('id', orgId)
    .single();

  const interviewData = (orgData?.raw_interview_data as Record<string, unknown>) ?? null;
  const industry = (orgData?.industry as string) ?? '';

  // Run all intelligence modules in parallel
  const [seasonalProfile, revenueModel, financeCosts] = await Promise.all([
    detectSeasonalProfile(orgId),
    detectRevenueModel(orgId, interviewData),
    fetchFinanceCosts(orgId),
  ]);

  // For cost structure and cash flow, we need P&L data
  let costStructure: CostStructureSummary | null = null;
  let cashFlowDiagnosis: CashFlowDiagnosis | null = null;
  let debtMetrics: DebtServiceMetrics | null = null;

  // Fetch financials for P&L computation
  const { data: financials } = await svc
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId);

  const { data: accounts } = await svc
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  if (financials && accounts && financials.length > 0) {
    const periods = getAvailablePeriods(financials);
    const latestPeriod = periods[0];

    if (latestPeriod) {
      const pnl = buildPnL(financials, accounts, latestPeriod);
      const operatingProfit = pnl.grossProfit - pnl.expenses;

      // Cash flow diagnosis
      cashFlowDiagnosis = diagnoseCashFlow(
        pnl.revenue,
        operatingProfit,
        financeCosts,
        pnl.expenses
      );

      // Debt service metrics
      if (financeCosts.hasDebt) {
        debtMetrics = computeDebtServiceMetrics(
          operatingProfit,
          pnl.revenue,
          financeCosts
        );
      }
    }

    // Cost structure analysis (needs cost accounts)
    const costAccounts = (accounts as Array<{
      id: string; name: string; code: string; class: string;
    }>).filter(a => ['EXPENSE', 'DIRECTCOSTS', 'OVERHEADS'].includes(a.class.toUpperCase()));

    if (costAccounts.length > 0) {
      // Aggregate totals per account across all periods
      const accountTotals = new Map<string, number>();
      for (const f of financials as Array<{ account_id: string; amount: number }>) {
        const current = accountTotals.get(f.account_id) ?? 0;
        accountTotals.set(f.account_id, current + Math.abs(Number(f.amount)));
      }

      // Get total revenue for ratio calculations
      const revenueAccounts = (accounts as Array<{
        id: string; class: string;
      }>).filter(a => ['REVENUE', 'OTHERINCOME'].includes(a.class.toUpperCase()));

      let totalRevenue = 0;
      for (const f of financials as Array<{ account_id: string; amount: number }>) {
        if (revenueAccounts.some(ra => ra.id === f.account_id)) {
          totalRevenue += Number(f.amount);
        }
      }

      const periods = getAvailablePeriods(financials);
      costStructure = analyseCostStructure(
        costAccounts.map(a => ({
          accountId: a.id,
          accountName: a.name,
          accountCode: a.code,
          xeroClass: a.class,
          total: accountTotals.get(a.id) ?? 0,
        })),
        totalRevenue,
        periods.length
      );
    }
  }

  // Derive validation rules from all the intelligence
  const validationRules = deriveValidationRules(
    seasonalProfile,
    revenueModel,
    financeCosts.hasDebt,
    cashFlowDiagnosis,
    industry
  );

  const result: DerivedBusinessIntelligence = {
    orgId,
    derivedAt: new Date().toISOString(),
    version: 1,
    seasonalProfile,
    revenueModel,
    costStructure,
    cashFlowDiagnosis,
    debtMetrics,
    validationRules,
  };

  // Store in company_skills as extended data
  await svc.from('company_skills').upsert({
    org_id: orgId,
    version: 3,
    skill_data: {
      // Preserve existing skill data structure by wrapping intelligence
      businessIntelligence: result,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'org_id' });

  return result;
}

// ─── Validation Rule Derivation ─────────────────────────────

function deriveValidationRules(
  seasonal: SeasonalProfile,
  revenueModel: RevenueModelProfile,
  hasDebt: boolean,
  cashFlow: CashFlowDiagnosis | null,
  industry: string
): DerivedBusinessIntelligence['validationRules'] {
  // Expected gross margin ranges by industry
  let expectedGrossMarginRange: [number, number] = [30, 70]; // default
  const lower = industry.toLowerCase();
  if (/saas|software/i.test(lower)) expectedGrossMarginRange = [70, 90];
  if (/manufacturing/i.test(lower)) expectedGrossMarginRange = [25, 50];
  if (/professional.*service|consulting/i.test(lower)) expectedGrossMarginRange = [50, 80];
  if (/retail|ecommerce/i.test(lower)) expectedGrossMarginRange = [30, 60];
  if (/fashion|luxury|bridal/i.test(lower)) expectedGrossMarginRange = [40, 70];

  // Expected cash flow direction from diagnosis
  let expectedCashFlowDirection: 'positive' | 'negative' | 'breakeven' = 'positive';
  if (cashFlow) {
    if (cashFlow.rootCause === 'operational_loss' || cashFlow.rootCause === 'profitable_debt_strain') {
      expectedCashFlowDirection = 'negative';
    } else if (cashFlow.rootCause === 'breakeven') {
      expectedCashFlowDirection = 'breakeven';
    }
  }

  return {
    clientCountSource: revenueModel.clientCountMethod,
    mustIncludeFinanceCosts: hasDebt,
    expectedCashFlowDirection,
    anomalyThresholdMultiplier: seasonal.isSeasonal
      ? Math.max(1.5, 1 + seasonal.seasonalAmplitude)
      : 1.0,
    expectedGrossMarginRange,
    primaryKPIs: revenueModel.primaryKPIs,
  };
}

/**
 * Get cached business intelligence for an org.
 * Returns null if not yet derived.
 */
export async function getCachedBusinessIntelligence(
  orgId: string
): Promise<DerivedBusinessIntelligence | null> {
  const svc = await createUntypedServiceClient();

  const { data } = await svc
    .from('company_skills')
    .select('skill_data')
    .eq('org_id', orgId)
    .single();

  if (!data) return null;

  const skillData = data.skill_data as Record<string, unknown>;
  return (skillData?.businessIntelligence as DerivedBusinessIntelligence) ?? null;
}
