import { NextResponse } from 'next/server';
import { requireRole, AuthorizationError } from '@/lib/supabase/roles';
import {
  type HubSpotDeal,
  SALES_PIPELINE_ID,
  UNCONFIRMED_ORDERS_PIPELINE_ID,
  SALES_PIPELINE_STAGES,
  UNCONFIRMED_ORDERS_STAGES,
  computeStaleDealAnalysis,
  computePipelineSummary,
} from '@/lib/integrations/hubspot-metrics';

// ---------------------------------------------------------------------------
// HubSpot API (reuses same pattern as parent route)
// ---------------------------------------------------------------------------

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

function getAccessToken(): string {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error('HubSpot not configured. Set HUBSPOT_ACCESS_TOKEN.');
  return token;
}

interface HubSpotSearchResponse {
  results: Array<{
    id: string;
    properties: {
      dealname: string | null;
      amount: string | null;
      dealstage: string | null;
      pipeline: string | null;
      closedate: string | null;
      createdate: string | null;
      hs_date_entered_currentstage?: string | null;
    };
  }>;
  paging?: { next?: { after: string } };
}

async function fetchPipelineDeals(pipelineId: string): Promise<HubSpotDeal[]> {
  const token = getAccessToken();
  const allDeals: HubSpotDeal[] = [];
  let after: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filterGroups: [
        { filters: [{ propertyName: 'pipeline', operator: 'EQ', value: pipelineId }] },
      ],
      properties: [
        'dealname', 'amount', 'dealstage', 'pipeline',
        'closedate', 'createdate', 'hs_date_entered_currentstage',
      ],
      limit: 100,
      ...(after ? { after } : {}),
    };

    const response = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new Error(`HubSpot API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as HubSpotSearchResponse;
    for (const result of data.results) {
      allDeals.push({
        id: result.id,
        dealname: result.properties.dealname ?? '',
        amount: result.properties.amount ? parseFloat(result.properties.amount) : null,
        dealstage: result.properties.dealstage ?? '',
        pipeline: result.properties.pipeline ?? '',
        closedate: result.properties.closedate ?? null,
        createdate: result.properties.createdate ?? new Date().toISOString(),
        stageEnteredAt: result.properties.hs_date_entered_currentstage ?? null,
      });
    }
    after = data.paging?.next?.after;
  } while (after);

  return allDeals;
}

// ---------------------------------------------------------------------------
// GET /api/integrations/hubspot/stale-deals
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    await requireRole('viewer');
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'HubSpot not configured', configured: false }, { status: 400 });
  }

  try {
    const [salesDeals, unconfirmedDeals] = await Promise.all([
      fetchPipelineDeals(SALES_PIPELINE_ID),
      fetchPipelineDeals(UNCONFIRMED_ORDERS_PIPELINE_ID),
    ]);

    const salesStale = computeStaleDealAnalysis(salesDeals, SALES_PIPELINE_STAGES);
    const unconfirmedStale = computeStaleDealAnalysis(unconfirmedDeals, UNCONFIRMED_ORDERS_STAGES);

    const salesSummary = computePipelineSummary(salesDeals, SALES_PIPELINE_STAGES);
    const unconfirmedSummary = computePipelineSummary(unconfirmedDeals, UNCONFIRMED_ORDERS_STAGES);

    return NextResponse.json({
      sales: {
        staleAnalysis: salesStale,
        pipelineSummary: salesSummary,
        totalDeals: salesDeals.length,
      },
      unconfirmed: {
        staleAnalysis: unconfirmedStale,
        pipelineSummary: unconfirmedSummary,
        totalDeals: unconfirmedDeals.length,
      },
      meta: {
        totalDeals: salesDeals.length + unconfirmedDeals.length,
        totalStaleDeals: salesStale.staleDeals.length + unconfirmedStale.staleDeals.length,
        totalStaleValue: salesStale.totalStaleValue + unconfirmedStale.totalStaleValue,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch HubSpot data';
    console.error('[HubSpot Stale Deals]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
