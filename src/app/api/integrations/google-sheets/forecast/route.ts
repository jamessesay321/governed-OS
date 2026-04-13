import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import {
  parseCashflowForecast,
  computeCashflowSummary,
  computeForecastVsActuals,
  computeCashRunway,
  type XeroActualRow,
} from '@/lib/integrations/cashflow-forecast-metrics';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GOOGLE_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1t9-DJ2NgdKOayB1HNS1nZY75dUzvDr8lEVHiTd1ojVo/export?format=csv';

/**
 * GET /api/integrations/google-sheets/forecast
 *
 * Fetches Alonuko's 2026 cashflow forecast from Google Sheets,
 * parses it, computes summary metrics, and optionally compares
 * against Xero actuals from normalised_financials.
 *
 * Query params:
 *   ?cash=50000  — current cash balance for runway calc (default 0)
 */
export async function GET(request: Request) {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    const url = new URL(request.url);
    const currentCash = parseFloat(url.searchParams.get('cash') ?? '0') || 0;

    // ------------------------------------------------------------------
    // 1. Fetch CSV from Google Sheets
    // ------------------------------------------------------------------
    const csvResponse = await fetch(GOOGLE_SHEET_CSV_URL, {
      next: { revalidate: 300 }, // cache for 5 minutes
    });

    if (!csvResponse.ok) {
      console.error(
        '[FORECAST] Google Sheets fetch failed:',
        csvResponse.status,
        await csvResponse.text().catch(() => '')
      );
      return NextResponse.json(
        { error: 'Failed to fetch cashflow forecast from Google Sheets' },
        { status: 502 }
      );
    }

    const csvText = await csvResponse.text();

    // ------------------------------------------------------------------
    // 2. Parse the CSV
    // ------------------------------------------------------------------
    const forecast = parseCashflowForecast(csvText);

    // ------------------------------------------------------------------
    // 3. Compute summary metrics
    // ------------------------------------------------------------------
    const summary = computeCashflowSummary(forecast, currentCash);
    const runway = computeCashRunway(forecast, currentCash);

    // ------------------------------------------------------------------
    // 4. Fetch Xero actuals for comparison (revenue accounts only)
    // ------------------------------------------------------------------
    let forecastVsActuals = null;
    try {
      const supabase = await createServiceClient();

      // Get revenue account IDs (class = REVENUE) for this org
      const { data: revenueAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('org_id', orgId)
        .eq('class', 'REVENUE');

      if (revenueAccounts && revenueAccounts.length > 0) {
        const accountIds = revenueAccounts.map((a) => a.id);

        // Fetch normalised_financials for 2026 revenue
        const { data: actuals } = await supabase
          .from('normalised_financials')
          .select('period, account_id, amount, transaction_count, source')
          .eq('org_id', orgId)
          .eq('source', 'xero')
          .in('account_id', accountIds)
          .gte('period', '2026-01-01')
          .lte('period', '2026-12-01');

        if (actuals && actuals.length > 0) {
          forecastVsActuals = computeForecastVsActuals(
            forecast,
            actuals as XeroActualRow[]
          );
        }
      }
    } catch (err) {
      // Non-fatal — actuals may not exist yet
      console.warn('[FORECAST] Could not fetch Xero actuals:', err);
    }

    // ------------------------------------------------------------------
    // 5. Return pre-computed metrics
    // ------------------------------------------------------------------
    return NextResponse.json({
      ok: true,
      forecast: {
        year: forecast.year,
        months: forecast.months,
        inflows: forecast.inflows,
        outflows: forecast.outflows,
        kpis: forecast.kpis,
      },
      summary,
      runway,
      forecastVsActuals,
      meta: {
        source: 'google-sheets',
        sheetUrl: GOOGLE_SHEET_CSV_URL.replace('/export?format=csv', ''),
        fetchedAt: new Date().toISOString(),
        cashBalanceUsed: currentCash,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[FORECAST] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
