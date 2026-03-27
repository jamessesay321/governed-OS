import { createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLM } from './llm';

type CallLLMCachedInput = {
  systemPrompt: string;
  userMessage: string;
  orgId: string;
  temperature?: number;
  /** Cache time-to-live in minutes. Default: 60 */
  cacheTTLMinutes?: number;
};

type CachedResponse = {
  response: string;
  cached: boolean;
  tokensUsed: number;
};

/** Default TTL presets (minutes) */
export const CACHE_TTL = {
  NARRATIVE: 60,
  COMPANY_SKILLS: 1440, // 24 hours
} as const;

/**
 * Create a SHA-256 hex hash from the given input string.
 * Uses the Web Crypto API available in Node 18+ and edge runtimes.
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Build a cache key by hashing org_id + systemPrompt + userMessage.
 * Including org_id ensures different organisations never share cache entries.
 */
async function buildCacheKey(
  orgId: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const raw = `${orgId}:${systemPrompt}:${userMessage}`;
  return sha256(raw);
}

/**
 * Cached wrapper around `callLLM`.
 *
 * 1. Hashes (orgId + systemPrompt + userMessage) with SHA-256.
 * 2. Checks the `ai_cache` table for an unexpired entry.
 * 3. On hit  -> returns the stored response (no LLM call).
 * 4. On miss -> calls callLLM, persists the result, and returns it.
 */
export async function callLLMCached({
  systemPrompt,
  userMessage,
  orgId,
  temperature = 0.2,
  cacheTTLMinutes = CACHE_TTL.NARRATIVE,
}: CallLLMCachedInput): Promise<CachedResponse> {
  const cacheKey = await buildCacheKey(orgId, systemPrompt, userMessage);
  const promptHash = await sha256(systemPrompt);
  const supabase = await createUntypedServiceClient();

  // --- Check cache -----------------------------------------------------------
  const now = new Date().toISOString();

  const { data: cached, error: cacheError } = await supabase
    .from('ai_cache')
    .select('response, tokens_used')
    .eq('org_id', orgId)
    .eq('cache_key', cacheKey)
    .gt('expires_at', now)
    .maybeSingle();

  if (cacheError) {
    console.error('[ai/cache] cache lookup failed, falling through to LLM:', cacheError.message);
  }

  if (cached) {
    return {
      response: cached.response as string,
      cached: true,
      tokensUsed: (cached.tokens_used as number) ?? 0,
    };
  }

  // --- Cache miss – call LLM -------------------------------------------------
  const response = await callLLM({ systemPrompt, userMessage, temperature });

  // Rough token estimate: ~4 chars per token for English prose.
  const estimatedTokens = Math.ceil(
    (systemPrompt.length + userMessage.length + response.length) / 4
  );

  const expiresAt = new Date(Date.now() + cacheTTLMinutes * 60 * 1000).toISOString();

  // Upsert so concurrent requests don't fail on unique constraint
  const { error: upsertError } = await supabase.from('ai_cache').upsert(
    {
      org_id: orgId,
      cache_key: cacheKey,
      prompt_hash: promptHash,
      response,
      tokens_used: estimatedTokens,
      expires_at: expiresAt,
      created_at: now,
    },
    { onConflict: 'org_id,cache_key' }
  );

  if (upsertError) {
    console.error('[ai/cache] failed to store cache entry:', upsertError.message);
  }

  return { response, cached: false, tokensUsed: estimatedTokens };
}

/**
 * Evict all cache entries for a given org (useful after data changes).
 */
export async function invalidateCache(orgId: string): Promise<void> {
  const supabase = await createUntypedServiceClient();
  const { error } = await supabase.from('ai_cache').delete().eq('org_id', orgId);
  if (error) {
    console.error('[ai/cache] cache invalidation failed:', error.message);
  }
}
