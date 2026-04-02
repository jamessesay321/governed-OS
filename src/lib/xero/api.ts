/**
 * Shared Xero API helper with rate limiting and 429 retry.
 * Imported by sync.ts, org-config.ts, data-health.ts.
 */

/** Pause execution for a given number of milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Track API calls to stay under Xero's 60-per-minute limit. */
let callTimestamps: number[] = [];

/** Reset the rate limit tracker (call at start of each sync run). */
export function resetRateLimitTracker(): void {
  callTimestamps = [];
}

/**
 * Make a GET request to the Xero API with automatic rate limiting
 * and 429 retry-after handling.
 */
export async function xeroGet(
  endpoint: string,
  accessToken: string,
  tenantId: string
): Promise<any> {
  // Rate-limit: if we've made 55+ calls in the last 60 seconds, wait
  const now = Date.now();
  callTimestamps = callTimestamps.filter((t) => now - t < 60_000);
  if (callTimestamps.length >= 55) {
    const oldest = callTimestamps[0];
    const waitMs = 60_000 - (now - oldest) + 500;
    console.log(
      `[XERO API] Rate limit approaching (${callTimestamps.length} calls in 60s), pausing ${Math.round(waitMs / 1000)}s...`
    );
    await delay(waitMs);
  }

  callTimestamps.push(Date.now());

  const response = await fetch(`https://api.xero.com/api.xro/2.0/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    // On 429, wait and retry once
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '30', 10);
      console.log(`[XERO API] 429 rate limited, waiting ${retryAfter}s before retry...`);
      await delay(retryAfter * 1000);

      const retryResponse = await fetch(`https://api.xero.com/api.xro/2.0/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'xero-tenant-id': tenantId,
          Accept: 'application/json',
        },
      });

      if (retryResponse.ok) return retryResponse.json();

      const body = await retryResponse.text().catch(() => '');
      throw new Error(
        `Xero API error: ${retryResponse.status} ${retryResponse.statusText}: ${body.slice(0, 200)}`
      );
    }

    const body = await response.text().catch(() => '');
    throw new Error(
      `Xero API error: ${response.status} ${response.statusText}: ${body.slice(0, 200)}`
    );
  }

  return response.json();
}
