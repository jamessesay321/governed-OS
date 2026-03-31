import { createServiceClient } from '@/lib/supabase/server';

interface AuditEntry {
  orgId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface AuditOptions {
  /** When true (default), throws on failure after retries. When false, returns failure result. */
  critical?: boolean;
  /** Number of retry attempts (default 3, including first attempt). */
  maxAttempts?: number;
}

export interface AuditResult {
  success: boolean;
  id?: string;
  error?: string;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 200;

/**
 * Log an immutable audit entry.
 * Uses service role client to bypass RLS for insert.
 *
 * By default (critical=true), throws on failure so callers know the audit
 * record was not written. Set critical=false for non-essential audit entries
 * where you want a graceful degradation with a returned failure result.
 *
 * Retries up to 3 times before giving up.
 */
export async function logAudit(
  entry: AuditEntry,
  options: AuditOptions = {},
): Promise<AuditResult> {
  const { critical = true, maxAttempts = DEFAULT_MAX_ATTEMPTS } = options;

  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const supabase = await createServiceClient();

      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          org_id: entry.orgId,
          user_id: entry.userId,
          action: entry.action,
          entity_type: entry.entityType,
          entity_id: entry.entityId ?? null,
          changes: entry.changes ?? null,
          metadata: entry.metadata ?? null,
        })
        .select('id')
        .single();

      if (error) {
        lastError = error.message;
        console.error(
          `[AUDIT] Insert failed (attempt ${attempt}/${maxAttempts}):`,
          error.message,
          entry,
        );

        if (attempt < maxAttempts) {
          await delay(RETRY_DELAY_MS * attempt);
          continue;
        }
      } else {
        return { success: true, id: data?.id };
      }
    } catch (err) {
      lastError =
        err instanceof Error ? err.message : 'Unknown error during audit insert';
      console.error(
        `[AUDIT] Exception (attempt ${attempt}/${maxAttempts}):`,
        lastError,
        entry,
      );

      if (attempt < maxAttempts) {
        await delay(RETRY_DELAY_MS * attempt);
        continue;
      }
    }
  }

  // All attempts exhausted
  const failureMsg = `[AUDIT] Failed to write audit log after ${maxAttempts} attempts: ${lastError}`;

  if (critical) {
    throw new Error(failureMsg);
  }

  // Non-critical: log prominently and return failure result
  console.error(failureMsg, entry);
  return { success: false, error: lastError };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
