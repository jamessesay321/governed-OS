import { NextResponse } from 'next/server';
import { requireRole, AuthorizationError } from '@/lib/supabase/roles';
import {
  type HubSpotDeal,
  type HubSpotStage,
  SALES_PIPELINE_ID,
  UNCONFIRMED_ORDERS_PIPELINE_ID,
  SALES_PIPELINE_STAGES,
  UNCONFIRMED_ORDERS_STAGES,
  computePipelineSummary,
  computePipelineVelocity,
  computeRevenueForecast,
  computeDealTrends,
} from '@/lib/integrations/hubspot-metrics';

// ---------------------------------------------------------------------------
// HubSpot API Client
// ---------------------------------------------------------------------------

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

function getAccessToken(): string {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    throw new Error('HubSpot not configured. Set HUBSPOT_ACCESS_TOKEN.');
  }
  return token;
}

function isHubSpotConfigured(): boolean {
  return !!process.env.HUBSPOT_ACCESS_TOKEN;
}

interface HubSpotDealResponse {
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
}

interface HubSpotSearchResponse {
  results: HubSpotDealResponse[];
  paging?: {
    next?: {
      after: string;
    };
  };
}

interface HubSpotPipelineStage {
  stageId: string;
  label: string;
  metadata: {
    probability?: string;
    isClosed?: string;
  };
  displayOrder: number;
}

interface HubSpotPipelineResponse {
  id: string;
  label: string;
  stages: HubSpotPipelineStage[];
}

/**
 * Fetch all deals from a pipeline, handling pagination.
 * Uses the CRM search API to filter by pipeline.
 */
async function fetchPipelineDeals(pipelineId: string): Promise<HubSpotDeal[]> {
  const token = getAccessToken();
  const allDeals: HubSpotDeal[] = [];
  let after: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'pipeline',
              operator: 'EQ',
              value: pipelineId,
            },
          ],
        },
      ],
      properties: [
        'dealname',
        'amount',
        'dealstage',
        'pipeline',
        'closedate',
        'createdate',
        'hs_date_entered_currentstage',
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
      next: { revalidate: 120 }, // Cache for 2 minutes
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

/**
 * Fetch pipeline stage definitions from HubSpot and merge with our
 * probability/closed metadata (HubSpot's metadata may not match our
 * domain-specific probabilities, so we prefer our constants).
 */
async function fetchPipelineStages(
  pipelineId: string,
  fallbackStages: HubSpotStage[]
): Promise<HubSpotStage[]> {
  const token = getAccessToken();

  try {
    const response = await fetch(
      `${HUBSPOT_BASE_URL}/crm/v3/pipelines/deals/${pipelineId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        next: { revalidate: 3600 }, // Cache stages for 1 hour
      }
    );

    if (!response.ok) {
      // Fall back to hardcoded stages if API fails
      console.warn(`[HubSpot] Could not fetch pipeline ${pipelineId} stages, using defaults`);
      return fallbackStages;
    }

    const pipeline = (await response.json()) as HubSpotPipelineResponse;

    // Build a lookup from our constants for probability/isClosed overrides
    const fallbackMap = new Map<string, HubSpotStage>();
    for (const s of fallbackStages) {
      fallbackMap.set(s.stageId, s);
    }

    return pipeline.stages.map((apiStage) => {
      const override = fallbackMap.get(apiStage.stageId);
      const isClosed = apiStage.metadata.isClosed === 'true';
      const probability = apiStage.metadata.probability
        ? parseFloat(apiStage.metadata.probability) / 100
        : 0;

      return {
        stageId: apiStage.stageId,
        label: apiStage.label,
        // Prefer our domain-specific probabilities over HubSpot defaults
        probability: override?.probability ?? probability,
        isClosed: override?.isClosed ?? isClosed,
        isWon: override?.isWon ?? (isClosed && probability === 1),
        displayOrder: apiStage.displayOrder,
      };
    });
  } catch (error) {
    console.warn(`[HubSpot] Pipeline stage fetch failed, using defaults:`, error);
    return fallbackStages;
  }
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * GET /api/integrations/hubspot
 *
 * Returns pre-computed deal pipeline metrics for both Alonuko pipelines:
 * summary, velocity, revenue forecast, and deal trends.
 */
export async function GET() {
  try {
    await requireRole('viewer');
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!isHubSpotConfigured()) {
    return NextResponse.json(
      { error: 'HubSpot is not configured', configured: false },
      { status: 400 }
    );
  }

  try {
    // Fetch deals and stages for both pipelines in parallel
    const [salesDeals, unconfirmedDeals, salesStages, unconfirmedStages] =
      await Promise.all([
        fetchPipelineDeals(SALES_PIPELINE_ID),
        fetchPipelineDeals(UNCONFIRMED_ORDERS_PIPELINE_ID),
        fetchPipelineStages(SALES_PIPELINE_ID, SALES_PIPELINE_STAGES),
        fetchPipelineStages(UNCONFIRMED_ORDERS_PIPELINE_ID, UNCONFIRMED_ORDERS_STAGES),
      ]);

    // Run pure computation functions
    const salesPipeline = {
      pipelineId: SALES_PIPELINE_ID,
      pipelineName: 'Sales Pipeline',
      summary: computePipelineSummary(salesDeals, salesStages),
      velocity: computePipelineVelocity(salesDeals, salesStages),
      forecast: computeRevenueForecast(salesDeals, salesStages),
      trends: computeDealTrends(salesDeals, salesStages),
      stages: salesStages,
    };

    const unconfirmedPipeline = {
      pipelineId: UNCONFIRMED_ORDERS_PIPELINE_ID,
      pipelineName: 'Unconfirmed Orders',
      summary: computePipelineSummary(unconfirmedDeals, unconfirmedStages),
      velocity: computePipelineVelocity(unconfirmedDeals, unconfirmedStages),
      forecast: computeRevenueForecast(unconfirmedDeals, unconfirmedStages),
      trends: computeDealTrends(unconfirmedDeals, unconfirmedStages),
      stages: unconfirmedStages,
    };

    // Combined totals across both pipelines
    const allDeals = [...salesDeals, ...unconfirmedDeals];
    const allStages = [...salesStages, ...unconfirmedStages];
    const combined = {
      summary: computePipelineSummary(allDeals, allStages),
      velocity: computePipelineVelocity(allDeals, allStages),
      forecast: computeRevenueForecast(allDeals, allStages),
      trends: computeDealTrends(allDeals, allStages),
    };

    return NextResponse.json({
      pipelines: {
        sales: salesPipeline,
        unconfirmed: unconfirmedPipeline,
      },
      combined,
      meta: {
        dealCount: allDeals.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch HubSpot data';
    console.error('[HubSpot API]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
