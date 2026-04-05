import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import {
  classifyCompany,
  calculateFilingDeadlines,
  assessGoingConcern,
  checkVATRegistration,
  calculateCorporationTax,
} from '@/lib/compliance/uk-company-classification';
import {
  fetchCompanyProfile,
  fetchCharges,
  buildComplianceSummary,
} from '@/lib/compliance/companies-house';

const ParamsSchema = z.object({
  orgId: z.string().uuid(),
});

/**
 * GET /api/compliance/check/[orgId]
 * Runs a comprehensive UK compliance and financial health check.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const resolvedParams = await params;
    const parsed = ParamsSchema.safeParse(resolvedParams);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid org ID' }, { status: 400 });
    }
    const { orgId } = parsed.data;

    // Auth check — viewer+ can read compliance data
    const { profile } = await requireRole('viewer');
    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const serviceClient = await createServiceClient();

    // Fetch org details
    const { data: org } = await serviceClient
      .from('organisations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    const result: Record<string, unknown> = {};
    const orgRecord = org as Record<string, unknown>;

    // 1. Companies House check (if company number available)
    const companyNumber = orgRecord.company_number as string | null;
    if (companyNumber) {
      const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
      const chProfile = await fetchCompanyProfile(companyNumber, apiKey ?? undefined);
      if (chProfile) {
        const charges = await fetchCharges(companyNumber, apiKey ?? undefined);
        result.companiesHouse = buildComplianceSummary(chProfile, charges);
      }
    }

    // 2. Fetch financial data for analysis
    const { data: financials } = await serviceClient
      .from('normalised_financials')
      .select('period, amount, account_id, chart_of_accounts!inner(id, name, type, class)')
      .eq('org_id', orgId)
      .order('period', { ascending: false });

    if (financials && financials.length > 0) {
      // Get latest period
      const latestPeriod = (financials[0] as Record<string, unknown>).period as string;
      const periodData = financials.filter(
        (f: Record<string, unknown>) => f.period === latestPeriod
      );

      // Aggregate by account class (Xero uses class, not type, for P&L classification)
      let revenue = 0;
      let costOfSales = 0;
      let expenses = 0;

      for (const row of periodData) {
        const r = row as Record<string, unknown>;
        const account = r.chart_of_accounts as Record<string, unknown>;
        const amount = r.amount as number;
        const accountClass = (account?.class as string)?.toUpperCase();

        if (accountClass === 'REVENUE' || accountClass === 'OTHERINCOME') {
          revenue += amount;
        } else if (accountClass === 'DIRECTCOSTS') {
          costOfSales += Math.abs(amount);
        } else if (accountClass === 'EXPENSE' || accountClass === 'OVERHEADS') {
          expenses += Math.abs(amount);
        }
      }

      // Annualise (multiply monthly by 12 as rough estimate)
      const annualRevenue = revenue * 12;
      const annualCostOfSales = costOfSales * 12;
      const annualExpenses = expenses * 12;
      const annualOperatingProfit = annualRevenue - annualCostOfSales - annualExpenses;
      const annualNetProfit = annualOperatingProfit; // Simplified - no tax deducted yet

      // 3. Company classification
      result.classification = classifyCompany({
        turnover: annualRevenue,
        balanceSheetTotal: 0, // Would need balance sheet data
        averageEmployees: (orgRecord.employee_count as number) ?? 10,
        financialYearStart: new Date('2025-01-01'),
      });

      // 4. VAT check
      result.vatCheck = checkVATRegistration(annualRevenue);

      // 5. Corporation tax estimate
      result.corporationTax = calculateCorporationTax(
        Math.max(0, annualOperatingProfit)
      );

      // 6. Going concern assessment
      result.goingConcern = assessGoingConcern({
        currentAssets: 0,
        currentLiabilities: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        operatingProfit: annualOperatingProfit,
        interestExpense: 0,
        hasOverdueTaxLiabilities: false,
        hasBreachedLoanCovenants: false,
        consecutiveLossYears: annualNetProfit < 0 ? 1 : 0,
      });

      // Monthly financial summary
      result.financialSummary = {
        latestPeriod,
        monthlyRevenue: revenue,
        monthlyCostOfSales: costOfSales,
        monthlyExpenses: expenses,
        monthlyOperatingProfit: revenue - costOfSales - expenses,
        annualisedRevenue: annualRevenue,
        annualisedOperatingProfit: annualOperatingProfit,
      };
    }

    // 7. Filing deadlines (if we have year-end info)
    const fyEndMonth = orgRecord.financial_year_end_month as number;
    if (fyEndMonth) {
      const yearEnd = new Date(2025, fyEndMonth - 1, 31); // Approximate
      result.filingDeadlines = calculateFilingDeadlines({
        yearEndDate: yearEnd,
        lastConfirmationStatementDate: new Date('2025-07-11'), // Would come from Companies House
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
    console.error('[compliance/check] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
