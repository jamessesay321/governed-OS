import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import {
  getCampaigns,
  getCampaignMetrics,
  getFlows,
  type KlaviyoCampaign,
  type KlaviyoCampaignMetrics,
  type KlaviyoFlow,
} from '@/lib/integrations/klaviyo';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});

/**
 * GET /api/integrations/klaviyo
 *
 * Returns campaign summary, campaign-level metrics, and flow overview.
 * Requires KLAVIYO_API_KEY env var to be set.
 */
export async function GET(request: Request) {
  try {
    const { profile } = await requireRole('viewer');
    const _orgId = profile.org_id as string;

    const privateKey = process.env.KLAVIYO_API_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Klaviyo API key not configured', connected: false },
        { status: 200 }
      );
    }

    // Parse optional query params
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid query params' },
        { status: 400 }
      );
    }
    const { limit } = parsed.data;

    // Fetch campaigns and flows in parallel
    const [campaigns, flows] = await Promise.all([
      getCampaigns(privateKey),
      getFlows(privateKey),
    ]);

    // Trim to requested limit for metric fetching
    const topCampaigns = campaigns.slice(0, limit);

    // Fetch metrics for top campaigns in parallel
    const metricsResults = await Promise.allSettled(
      topCampaigns.map((c) => getCampaignMetrics(privateKey, c.id))
    );

    const campaignMetrics: KlaviyoCampaignMetrics[] = metricsResults
      .filter(
        (r): r is PromiseFulfilledResult<KlaviyoCampaignMetrics> =>
          r.status === 'fulfilled'
      )
      .map((r) => r.value);

    // Compute aggregated summary
    const totalSent = campaignMetrics.reduce((s, m) => s + m.recipientCount, 0);
    const totalRevenue = campaignMetrics.reduce(
      (s, m) => s + m.revenueAttributed,
      0
    );
    const avgOpenRate =
      campaignMetrics.length > 0
        ? campaignMetrics.reduce((s, m) => s + m.openRate, 0) /
          campaignMetrics.length
        : 0;
    const avgClickRate =
      campaignMetrics.length > 0
        ? campaignMetrics.reduce((s, m) => s + m.clickRate, 0) /
          campaignMetrics.length
        : 0;

    // Build response with campaign + metrics merged
    const campaignsWithMetrics = topCampaigns.map(
      (campaign: KlaviyoCampaign) => {
        const metrics = campaignMetrics.find(
          (m) => m.campaignId === campaign.id
        );
        return {
          id: campaign.id,
          name: campaign.attributes.name,
          status: campaign.attributes.status,
          sendTime: campaign.attributes.send_time,
          createdAt: campaign.attributes.created_at,
          metrics: metrics ?? null,
        };
      }
    );

    const activeFlows = flows.filter(
      (f: KlaviyoFlow) => f.attributes.status === 'live'
    );

    return NextResponse.json({
      connected: true,
      summary: {
        totalCampaigns: campaigns.length,
        totalSent,
        avgOpenRate,
        avgClickRate,
        totalRevenue,
        activeFlowCount: activeFlows.length,
        totalFlowCount: flows.length,
      },
      campaigns: campaignsWithMetrics,
      flows: flows.map((f: KlaviyoFlow) => ({
        id: f.id,
        name: f.attributes.name,
        status: f.attributes.status,
        triggerType: f.attributes.trigger_type,
        created: f.attributes.created,
      })),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[KLAVIYO] GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Klaviyo data' },
      { status: 500 }
    );
  }
}
