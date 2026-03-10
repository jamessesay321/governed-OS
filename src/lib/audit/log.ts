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

/**
 * Log an immutable audit entry.
 * Uses service role client to bypass RLS for insert.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from('audit_logs').insert({
    org_id: entry.orgId,
    user_id: entry.userId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    changes: entry.changes ?? null,
    metadata: entry.metadata ?? null,
  });

  if (error) {
    // Log to console but don't throw — audit failures shouldn't break operations
    console.error('[AUDIT] Failed to write audit log:', error.message, entry);
  }
}
