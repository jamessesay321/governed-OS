import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import {
  getCampaigns,
  getCampaignMetrics,
  getFlows,
  getLists,
  getListMembers,
  getProfiles,
  type KlaviyoCampaignMetrics,
  type KlaviyoProfile,
} from '@/lib/integrations/klaviyo';
import { computeAllMetrics } from '@/lib/integrations/klaviyo-metrics';

// ---------------------------------------------------------------------------
// GET /api/integrations/klaviyo/metrics
//
// Fetches campaigns, flows, lists, and profiles from Klaviyo, then runs
// the pure computation layer (klaviyo-metrics.ts) to return pre-computed
// email marketing metrics.
//
// Returns: KlaviyoMetricsSummary
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    await requireRole('viewer');

    const privateKey = process.env.KLAVIYO_API_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Klaviyo API key not configured', connected: false },
        { status: 200 }
      );
    }

    // ---- Fetch core data in parallel ----
    const [campaigns, flows, lists, allProfiles] = await Promise.all([
      getCampaigns(privateKey),
      getFlows(privateKey),
      getLists(privateKey),
      getProfiles(privateKey, { pageSize: 50 }),
    ]);

    // ---- Fetch per-campaign metrics (best-effort, parallel) ----
    const metricsResults = await Promise.allSettled(
      campaigns.map((c) => getCampaignMetrics(privateKey, c.id))
    );

    const campaignMetrics: KlaviyoCampaignMetrics[] = metricsResults
      .filter(
        (r): r is PromiseFulfilledResult<KlaviyoCampaignMetrics> =>
          r.status === 'fulfilled'
      )
      .map((r) => r.value);

    // ---- Fetch profiles per list (best-effort, parallel) ----
    const listProfileResults = await Promise.allSettled(
      lists.map(async (list) => ({
        listId: list.id,
        profiles: await getListMembers(privateKey, list.id),
      }))
    );

    const profilesByList = new Map<string, KlaviyoProfile[]>();
    for (const result of listProfileResults) {
      if (result.status === 'fulfilled') {
        profilesByList.set(result.value.listId, result.value.profiles);
      }
    }

    // ---- Run pure computation layer ----
    const metrics = computeAllMetrics({
      campaigns,
      campaignMetrics,
      flows,
      lists,
      profilesByList,
      allProfiles,
    });

    return NextResponse.json({
      connected: true,
      ...metrics,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[KLAVIYO METRICS] Error:', err);
    return NextResponse.json(
      { error: 'Failed to compute Klaviyo metrics' },
      { status: 500 }
    );
  }
}
