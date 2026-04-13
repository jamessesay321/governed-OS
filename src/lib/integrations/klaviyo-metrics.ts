/**
 * Klaviyo Email Marketing — Deterministic Computation Layer
 * ----------------------------------------------------------
 * Pure functions that take Klaviyo campaign, flow, list, and profile data
 * as input and return pre-computed email marketing metrics.
 *
 * DETERMINISTIC — no AI, no side effects, no database calls.
 * Follows the same pattern as shopify-metrics.ts and hubspot-metrics.ts.
 *
 * Domain context (Alonuko):
 * - Luxury bridal fashion house — Klaviyo manages email marketing to
 *   brides, enquiry subscribers, and investors.
 * - 10 lists including "New Enquiry Subscribers", "Bridal Subscribers",
 *   "Investor list".
 * - Revenue attribution flows through campaigns to Shopify orders.
 */

import type {
  KlaviyoCampaign,
  KlaviyoCampaignMetrics,
  KlaviyoFlow,
  KlaviyoList,
  KlaviyoProfile,
} from './klaviyo';

// Re-export the Klaviyo types so consumers can import everything from one place
export type {
  KlaviyoCampaign,
  KlaviyoCampaignMetrics,
  KlaviyoFlow,
  KlaviyoList,
  KlaviyoProfile,
};

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  sendTime: string | null;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  revenueAttributed: number;
  recipientCount: number;
}

export interface CampaignsByMonth {
  month: string;
  campaignCount: number;
  totalRecipients: number;
  totalRevenue: number;
  avgOpenRate: number;
  avgClickRate: number;
}

export interface CampaignMetrics {
  totalCampaigns: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgBounceRate: number;
  totalAttributedRevenue: number;
  campaignsByMonth: CampaignsByMonth[];
  bestPerformingCampaign: CampaignPerformance | null;
  worstPerformingCampaign: CampaignPerformance | null;
}

export interface SubscribersByList {
  listId: string;
  listName: string;
  subscriberCount: number;
  pctOfTotal: number;
}

export interface ListHealth {
  totalSubscribers: number;
  activeSubscribers: number;
  listGrowthRate: number | null;
  subscribersByList: SubscribersByList[];
  engagementRate: number;
}

export interface FlowsByTrigger {
  triggerType: string;
  count: number;
  flowNames: string[];
}

export interface FlowMetrics {
  totalFlows: number;
  activeFlows: number;
  flowsByTrigger: FlowsByTrigger[];
  automationCoverage: number;
}

export interface EmailROI {
  totalEmailRevenue: number;
  revenuePerEmail: number;
  revenuePerSubscriber: number;
  costPerAcquisition: number | null;
}

export interface KlaviyoMetricsSummary {
  campaignMetrics: CampaignMetrics;
  listHealth: ListHealth;
  flowMetrics: FlowMetrics;
  emailROI: EmailROI;
  computedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Currency-safe rounding to 2 decimal places. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Round to 4 decimal places (for rates expressed as fractions 0-1). */
function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/** Convert ISO date string to YYYY-MM month key. */
function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// 1. computeCampaignMetrics
// ---------------------------------------------------------------------------

/**
 * Compute aggregate campaign performance metrics from campaign data and
 * per-campaign metric snapshots.
 *
 * DETERMINISTIC — pure function, no side effects.
 *
 * @param campaigns - Array of Klaviyo campaign objects
 * @param campaignMetrics - Array of per-campaign metric snapshots (may be
 *   a subset if some campaigns failed to fetch metrics)
 */
export function computeCampaignMetrics(
  campaigns: KlaviyoCampaign[],
  campaignMetrics: KlaviyoCampaignMetrics[]
): CampaignMetrics {
  const metricsMap = new Map<string, KlaviyoCampaignMetrics>();
  for (const m of campaignMetrics) {
    metricsMap.set(m.campaignId, m);
  }

  // Build per-campaign performance entries (only for campaigns with metrics)
  const performances: CampaignPerformance[] = [];
  for (const campaign of campaigns) {
    const m = metricsMap.get(campaign.id);
    if (!m) continue;
    performances.push({
      campaignId: campaign.id,
      campaignName: campaign.attributes.name,
      sendTime: campaign.attributes.send_time,
      openRate: m.openRate,
      clickRate: m.clickRate,
      bounceRate: m.bounceRate,
      revenueAttributed: m.revenueAttributed,
      recipientCount: m.recipientCount,
    });
  }

  // Averages across campaigns that have metrics
  const withMetrics = campaignMetrics.filter((m) => m.recipientCount > 0);
  const count = withMetrics.length;

  const avgOpenRate =
    count > 0
      ? round4(withMetrics.reduce((s, m) => s + m.openRate, 0) / count)
      : 0;
  const avgClickRate =
    count > 0
      ? round4(withMetrics.reduce((s, m) => s + m.clickRate, 0) / count)
      : 0;
  const avgBounceRate =
    count > 0
      ? round4(withMetrics.reduce((s, m) => s + m.bounceRate, 0) / count)
      : 0;

  const totalAttributedRevenue = round2(
    campaignMetrics.reduce((s, m) => s + m.revenueAttributed, 0)
  );

  // Group campaigns by month (using send_time, falling back to created_at)
  const monthAccum = new Map<
    string,
    {
      campaignCount: number;
      totalRecipients: number;
      totalRevenue: number;
      openRateSum: number;
      clickRateSum: number;
      metricsCount: number;
    }
  >();

  for (const campaign of campaigns) {
    const dateStr =
      campaign.attributes.send_time ?? campaign.attributes.created_at;
    if (!dateStr) continue;

    const month = toMonthKey(dateStr);
    const existing = monthAccum.get(month) ?? {
      campaignCount: 0,
      totalRecipients: 0,
      totalRevenue: 0,
      openRateSum: 0,
      clickRateSum: 0,
      metricsCount: 0,
    };

    existing.campaignCount++;

    const m = metricsMap.get(campaign.id);
    if (m) {
      existing.totalRecipients += m.recipientCount;
      existing.totalRevenue += m.revenueAttributed;
      existing.openRateSum += m.openRate;
      existing.clickRateSum += m.clickRate;
      existing.metricsCount++;
    }

    monthAccum.set(month, existing);
  }

  const campaignsByMonth: CampaignsByMonth[] = Array.from(
    monthAccum.entries()
  )
    .map(([month, data]) => ({
      month,
      campaignCount: data.campaignCount,
      totalRecipients: data.totalRecipients,
      totalRevenue: round2(data.totalRevenue),
      avgOpenRate:
        data.metricsCount > 0
          ? round4(data.openRateSum / data.metricsCount)
          : 0,
      avgClickRate:
        data.metricsCount > 0
          ? round4(data.clickRateSum / data.metricsCount)
          : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Best and worst performing campaigns (by open rate, minimum 1 recipient)
  const eligible = performances.filter((p) => p.recipientCount > 0);

  const bestPerformingCampaign =
    eligible.length > 0
      ? eligible.reduce((best, p) =>
          p.openRate > best.openRate ? p : best
        )
      : null;

  const worstPerformingCampaign =
    eligible.length > 0
      ? eligible.reduce((worst, p) =>
          p.openRate < worst.openRate ? p : worst
        )
      : null;

  return {
    totalCampaigns: campaigns.length,
    avgOpenRate,
    avgClickRate,
    avgBounceRate,
    totalAttributedRevenue,
    campaignsByMonth,
    bestPerformingCampaign,
    worstPerformingCampaign,
  };
}

// ---------------------------------------------------------------------------
// 2. computeListHealth
// ---------------------------------------------------------------------------

/**
 * Compute subscriber list health metrics.
 *
 * DETERMINISTIC — pure function, no side effects.
 *
 * @param lists - Array of Klaviyo list objects
 * @param profilesByList - Map of listId to array of profiles belonging to that list
 * @param allProfiles - Array of all profiles (for global subscriber counts)
 * @param campaignMetrics - Optional campaign metrics for engagement rate calculation
 */
export function computeListHealth(
  lists: KlaviyoList[],
  profilesByList: Map<string, KlaviyoProfile[]>,
  allProfiles: KlaviyoProfile[],
  campaignMetrics?: KlaviyoCampaignMetrics[]
): ListHealth {
  // Total unique subscribers across all lists
  const allSubscriberIds = new Set<string>();
  for (const [, profiles] of profilesByList) {
    for (const p of profiles) {
      allSubscriberIds.add(p.id);
    }
  }
  const totalSubscribers = allSubscriberIds.size || allProfiles.length;

  // Active subscribers: those with marketing consent = "SUBSCRIBED"
  const activeProfiles = allProfiles.filter(
    (p) =>
      p.attributes.subscriptions?.email?.marketing?.consent === 'SUBSCRIBED'
  );
  const activeSubscribers = activeProfiles.length;

  // List growth rate: compare profiles created in last 30 days vs previous 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  let recentSignups = 0;
  let previousSignups = 0;

  for (const profile of allProfiles) {
    const created = new Date(profile.attributes.created);
    if (created >= thirtyDaysAgo) {
      recentSignups++;
    } else if (created >= sixtyDaysAgo && created < thirtyDaysAgo) {
      previousSignups++;
    }
  }

  const listGrowthRate =
    previousSignups > 0
      ? round4((recentSignups - previousSignups) / previousSignups)
      : null;

  // Subscribers by list
  const subscribersByList: SubscribersByList[] = lists.map((list) => {
    const profiles = profilesByList.get(list.id) ?? [];
    return {
      listId: list.id,
      listName: list.attributes.name,
      subscriberCount: profiles.length,
      pctOfTotal:
        totalSubscribers > 0
          ? round2((profiles.length / totalSubscribers) * 100)
          : 0,
    };
  });

  // Sort by subscriber count descending
  subscribersByList.sort((a, b) => b.subscriberCount - a.subscriberCount);

  // Engagement rate: if campaign metrics provided, use average open rate as proxy
  // Otherwise, use active subscriber ratio
  let engagementRate: number;
  if (campaignMetrics && campaignMetrics.length > 0) {
    const withRecipients = campaignMetrics.filter(
      (m) => m.recipientCount > 0
    );
    engagementRate =
      withRecipients.length > 0
        ? round4(
            withRecipients.reduce((s, m) => s + m.openRate, 0) /
              withRecipients.length
          )
        : 0;
  } else {
    engagementRate =
      totalSubscribers > 0
        ? round4(activeSubscribers / totalSubscribers)
        : 0;
  }

  return {
    totalSubscribers,
    activeSubscribers,
    listGrowthRate,
    subscribersByList,
    engagementRate,
  };
}

// ---------------------------------------------------------------------------
// 3. computeFlowMetrics
// ---------------------------------------------------------------------------

/**
 * Compute automation flow metrics.
 *
 * DETERMINISTIC — pure function, no side effects.
 *
 * @param flows - Array of Klaviyo flow objects
 */
export function computeFlowMetrics(flows: KlaviyoFlow[]): FlowMetrics {
  const totalFlows = flows.length;
  const activeFlows = flows.filter(
    (f) => f.attributes.status === 'live'
  ).length;

  // Group flows by trigger type
  const triggerAccum = new Map<
    string,
    { count: number; flowNames: string[] }
  >();

  for (const flow of flows) {
    const triggerType = flow.attributes.trigger_type || 'unknown';
    const existing = triggerAccum.get(triggerType) ?? {
      count: 0,
      flowNames: [],
    };
    existing.count++;
    existing.flowNames.push(flow.attributes.name);
    triggerAccum.set(triggerType, existing);
  }

  const flowsByTrigger: FlowsByTrigger[] = Array.from(
    triggerAccum.entries()
  )
    .map(([triggerType, data]) => ({
      triggerType,
      count: data.count,
      flowNames: data.flowNames.sort(),
    }))
    .sort((a, b) => b.count - a.count);

  // Automation coverage: proportion of flows that are live (not draft/manual)
  const automationCoverage =
    totalFlows > 0 ? round4(activeFlows / totalFlows) : 0;

  return {
    totalFlows,
    activeFlows,
    flowsByTrigger,
    automationCoverage,
  };
}

// ---------------------------------------------------------------------------
// 4. computeEmailROI
// ---------------------------------------------------------------------------

/**
 * Compute email marketing return on investment.
 *
 * DETERMINISTIC — pure function, no side effects.
 *
 * @param campaignMetrics - Array of per-campaign metric snapshots
 * @param totalSubscribers - Total subscriber count for per-subscriber metrics
 * @param costs - Optional: total email marketing costs (Klaviyo subscription,
 *   design costs, etc.) for CPA calculation
 */
export function computeEmailROI(
  campaignMetrics: KlaviyoCampaignMetrics[],
  totalSubscribers: number,
  costs?: { totalSpend: number; newSubscribers?: number }
): EmailROI {
  const totalEmailRevenue = round2(
    campaignMetrics.reduce((s, m) => s + m.revenueAttributed, 0)
  );

  const totalRecipients = campaignMetrics.reduce(
    (s, m) => s + m.recipientCount,
    0
  );

  const revenuePerEmail =
    totalRecipients > 0 ? round2(totalEmailRevenue / totalRecipients) : 0;

  const revenuePerSubscriber =
    totalSubscribers > 0
      ? round2(totalEmailRevenue / totalSubscribers)
      : 0;

  // Cost per acquisition: total spend / new subscribers gained
  let costPerAcquisition: number | null = null;
  if (costs) {
    const newSubs = costs.newSubscribers ?? totalSubscribers;
    costPerAcquisition =
      newSubs > 0 ? round2(costs.totalSpend / newSubs) : null;
  }

  return {
    totalEmailRevenue,
    revenuePerEmail,
    revenuePerSubscriber,
    costPerAcquisition,
  };
}

// ---------------------------------------------------------------------------
// Convenience: compute all metrics at once
// ---------------------------------------------------------------------------

/**
 * Run all four computation functions on Klaviyo data.
 * Returns the full metrics bundle. Pure function — no side effects.
 *
 * @param data.campaigns - Campaign objects from Klaviyo API
 * @param data.campaignMetrics - Per-campaign metric snapshots
 * @param data.flows - Flow objects from Klaviyo API
 * @param data.lists - List objects from Klaviyo API
 * @param data.profilesByList - Map of listId to profiles in that list
 * @param data.allProfiles - All profiles for global subscriber counts
 * @param data.costs - Optional marketing costs for ROI calculation
 */
export function computeAllMetrics(data: {
  campaigns: KlaviyoCampaign[];
  campaignMetrics: KlaviyoCampaignMetrics[];
  flows: KlaviyoFlow[];
  lists: KlaviyoList[];
  profilesByList: Map<string, KlaviyoProfile[]>;
  allProfiles: KlaviyoProfile[];
  costs?: { totalSpend: number; newSubscribers?: number };
}): KlaviyoMetricsSummary {
  const campaign = computeCampaignMetrics(
    data.campaigns,
    data.campaignMetrics
  );

  const listHealthResult = computeListHealth(
    data.lists,
    data.profilesByList,
    data.allProfiles,
    data.campaignMetrics
  );

  const flow = computeFlowMetrics(data.flows);

  const roi = computeEmailROI(
    data.campaignMetrics,
    listHealthResult.totalSubscribers,
    data.costs
  );

  return {
    campaignMetrics: campaign,
    listHealth: listHealthResult,
    flowMetrics: flow,
    emailROI: roi,
    computedAt: new Date().toISOString(),
  };
}
