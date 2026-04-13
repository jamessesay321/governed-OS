/**
 * Klaviyo API Client
 *
 * Integrates with Klaviyo's v2023-12-15 API for email campaign analytics,
 * flow performance, subscriber data, and retention metrics.
 *
 * Auth: Klaviyo-API-Key header with private API key.
 * Docs: https://developers.klaviyo.com/en/reference/api_overview
 */

const KLAVIYO_BASE_URL = 'https://a.klaviyo.com/api';
const KLAVIYO_REVISION = '2023-12-15';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KlaviyoCampaign {
  id: string;
  type: 'campaign';
  attributes: {
    name: string;
    status: string;
    archived: boolean;
    channel: string;
    send_time: string | null;
    created_at: string;
    updated_at: string;
    audiences?: {
      included?: Array<{ id: string }>;
      excluded?: Array<{ id: string }>;
    };
    send_options?: {
      use_smart_sending?: boolean;
    };
  };
}

export interface KlaviyoCampaignMetrics {
  campaignId: string;
  recipientCount: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  revenueAttributed: number;
  conversionRate: number;
}

export interface KlaviyoFlow {
  id: string;
  type: 'flow';
  attributes: {
    name: string;
    status: string;
    archived: boolean;
    created: string;
    updated: string;
    trigger_type: string;
  };
}

export interface KlaviyoProfile {
  id: string;
  type: 'profile';
  attributes: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    created: string;
    updated: string;
    subscriptions?: {
      email?: {
        marketing?: {
          consent: string;
          timestamp: string;
        };
      };
    };
  };
}

export interface KlaviyoMetric {
  id: string;
  type: 'metric';
  attributes: {
    name: string;
    created: string;
    updated: string;
    integration: {
      id: string;
      name: string;
      category: string;
    } | null;
  };
}

export interface KlaviyoList {
  id: string;
  type: 'list';
  attributes: {
    name: string;
    created: string;
    updated: string;
    opt_in_process: string;
  };
}

export interface KlaviyoListResponse {
  data: Array<{
    id: string;
    type: 'profile';
    attributes: KlaviyoProfile['attributes'];
  }>;
  links?: {
    next?: string;
    prev?: string;
  };
}

export interface KlaviyoApiError {
  id: string;
  status: number;
  code: string;
  title: string;
  detail: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

function headers(privateKey: string): HeadersInit {
  return {
    Authorization: `Klaviyo-API-Key ${privateKey}`,
    revision: KLAVIYO_REVISION,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function klaviyoFetch<T>(
  privateKey: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${KLAVIYO_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(privateKey),
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errors = (body as Record<string, unknown>).errors as KlaviyoApiError[] | undefined;
    const detail = errors?.[0]?.detail ?? `Klaviyo API error: ${res.status}`;
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/**
 * Fetch all campaigns (email channel, not archived).
 */
export async function getCampaigns(
  privateKey: string
): Promise<KlaviyoCampaign[]> {
  const response = await klaviyoFetch<{ data: KlaviyoCampaign[] }>(
    privateKey,
    '/campaigns',
    {
      'filter': 'equals(messages.channel,\'email\')',
      'sort': '-created_at',
    }
  );
  return response.data;
}

/**
 * Fetch aggregated metrics for a specific campaign.
 * Returns opens, clicks, bounces, unsubscribes, revenue.
 */
export async function getCampaignMetrics(
  privateKey: string,
  campaignId: string
): Promise<KlaviyoCampaignMetrics> {
  // Query campaign recipient estimated count via campaign values endpoint
  const response = await klaviyoFetch<{
    data: {
      attributes: {
        results: Array<{
          statistics: {
            unique_count?: number;
            sum_value?: number;
          };
          group_by?: Record<string, string>;
        }>;
      };
    };
  }>(
    privateKey,
    `/campaign-values-reports`,
    {
      'filter': `equals(campaign_id,"${campaignId}")`,
      'fields[campaign-values-report]': 'results',
    }
  );

  // Parse aggregated stats with safe defaults
  const results = response.data?.attributes?.results ?? [];
  const stat = (name: string) =>
    results.find((r) => r.group_by?.metric === name)?.statistics ?? {};

  const recipientCount = stat('Received Email')?.unique_count ?? 0;
  const opens = stat('Opened Email')?.unique_count ?? 0;
  const clicks = stat('Clicked Email')?.unique_count ?? 0;
  const bounces = stat('Bounced Email')?.unique_count ?? 0;
  const unsubs = stat('Unsubscribed')?.unique_count ?? 0;
  const revenue = stat('Placed Order')?.sum_value ?? 0;
  const conversions = stat('Placed Order')?.unique_count ?? 0;

  return {
    campaignId,
    recipientCount,
    openRate: recipientCount > 0 ? opens / recipientCount : 0,
    clickRate: recipientCount > 0 ? clicks / recipientCount : 0,
    bounceRate: recipientCount > 0 ? bounces / recipientCount : 0,
    unsubscribeRate: recipientCount > 0 ? unsubs / recipientCount : 0,
    revenueAttributed: revenue,
    conversionRate: recipientCount > 0 ? conversions / recipientCount : 0,
  };
}

/**
 * Fetch all lists.
 */
export async function getLists(
  privateKey: string
): Promise<KlaviyoList[]> {
  const response = await klaviyoFetch<{ data: KlaviyoList[] }>(
    privateKey,
    '/lists',
    {
      'page[size]': '50',
    }
  );
  return response.data;
}

/**
 * Fetch all flows.
 */
export async function getFlows(
  privateKey: string
): Promise<KlaviyoFlow[]> {
  const response = await klaviyoFetch<{ data: KlaviyoFlow[] }>(
    privateKey,
    '/flows',
    {
      'sort': 'name',
      'page[size]': '50',
    }
  );
  return response.data;
}

/**
 * Fetch profiles with optional filters.
 */
export async function getProfiles(
  privateKey: string,
  params?: { pageSize?: number; filter?: string }
): Promise<KlaviyoProfile[]> {
  const queryParams: Record<string, string> = {
    'page[size]': String(params?.pageSize ?? 20),
  };
  if (params?.filter) {
    queryParams.filter = params.filter;
  }

  const response = await klaviyoFetch<{ data: KlaviyoProfile[] }>(
    privateKey,
    '/profiles',
    queryParams
  );
  return response.data;
}

/**
 * Fetch all available metrics.
 */
export async function getMetrics(
  privateKey: string
): Promise<KlaviyoMetric[]> {
  const response = await klaviyoFetch<{ data: KlaviyoMetric[] }>(
    privateKey,
    '/metrics',
    {
      'page[size]': '50',
    }
  );
  return response.data;
}

/**
 * Fetch members (profiles) belonging to a specific list.
 */
export async function getListMembers(
  privateKey: string,
  listId: string
): Promise<KlaviyoProfile[]> {
  const response = await klaviyoFetch<{ data: Array<{ id: string; type: string; attributes: KlaviyoProfile['attributes'] }> }>(
    privateKey,
    `/lists/${listId}/profiles`,
    {
      'page[size]': '50',
    }
  );
  return response.data.map((d) => ({
    id: d.id,
    type: 'profile' as const,
    attributes: d.attributes,
  }));
}
