import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { createHash } from 'crypto';

// ============================================================
// Types
// ============================================================

export type VaultItemType =
  | 'board_pack'
  | 'scenario_output'
  | 'kpi_snapshot'
  | 'variance_analysis'
  | 'narrative'
  | 'anomaly_report'
  | 'interview_transcript'
  | 'playbook_assessment'
  | 'custom_report'
  | 'ai_analysis'
  | 'file_upload';

export type VaultItemStatus = 'draft' | 'final' | 'superseded' | 'archived';
export type VaultVisibility = 'org' | 'owner_only' | 'advisor_only';

export interface Provenance {
  data_version?: string;
  data_freshness_at?: string;
  model_id?: string;
  prompt_hash?: string;
  source_entity_type?: string;
  source_entity_id?: string;
  xero_sync_id?: string;
  kpi_snapshot_ids?: string[];
  assumption_set_id?: string;
  [key: string]: unknown;
}

export interface StoreItemInput {
  orgId: string;
  userId: string;
  itemType: VaultItemType;
  title: string;
  description?: string;
  tags?: string[];
  content: Record<string, unknown>;
  provenance: Provenance;
  sourceEntityType?: string;
  sourceEntityId?: string;
  periodStart?: string;
  periodEnd?: string;
  visibility?: VaultVisibility;
  status?: VaultItemStatus;
}

export interface NewVersionInput {
  orgId: string;
  userId: string;
  vaultItemId: string;
  content: Record<string, unknown>;
  provenance: Provenance;
  changeSummary: string;
}

export interface VaultItem {
  id: string;
  org_id: string;
  item_type: VaultItemType;
  title: string;
  description: string;
  tags: string[];
  status: VaultItemStatus;
  current_version: number;
  source_entity_type: string | null;
  source_entity_id: string | null;
  period_start: string | null;
  period_end: string | null;
  data_version: string | null;
  data_freshness_at: string | null;
  model_id: string | null;
  prompt_hash: string | null;
  visibility: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VaultVersion {
  id: string;
  vault_item_id: string;
  version_number: number;
  change_summary: string;
  content: Record<string, unknown>;
  provenance: Provenance;
  created_by: string;
  created_at: string;
}

// ============================================================
// Helpers
// ============================================================

/** Generate SHA-256 hash of a prompt string for provenance tracking */
export function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

// ============================================================
// Core Storage Functions
// ============================================================

/**
 * Store a new item in the Knowledge Vault.
 * Creates both the vault_item and its initial vault_version (v1).
 * Returns the created vault item with its version.
 */
export async function storeVaultItem(input: StoreItemInput): Promise<{
  item: VaultItem;
  version: VaultVersion;
}> {
  const supabase = await createUntypedServiceClient();

  // 1. Create the vault item
  const { data: item, error: itemError } = await supabase
    .from('vault_items')
    .insert({
      org_id: input.orgId,
      item_type: input.itemType,
      title: input.title,
      description: input.description ?? '',
      tags: input.tags ?? [],
      status: input.status ?? 'final',
      current_version: 1,
      source_entity_type: input.sourceEntityType ?? null,
      source_entity_id: input.sourceEntityId ?? null,
      period_start: input.periodStart ?? null,
      period_end: input.periodEnd ?? null,
      data_version: input.provenance.data_version ?? null,
      data_freshness_at: input.provenance.data_freshness_at ?? null,
      model_id: input.provenance.model_id ?? null,
      prompt_hash: input.provenance.prompt_hash ?? null,
      visibility: input.visibility ?? 'org',
      created_by: input.userId,
    })
    .select()
    .single();

  if (itemError || !item) {
    console.error('[vault] Failed to create vault item:', itemError?.message);
    throw new Error('Failed to store vault item');
  }

  const typedItem = item as unknown as VaultItem;

  // 2. Create v1 version
  const { data: version, error: versionError } = await supabase
    .from('vault_versions')
    .insert({
      org_id: input.orgId,
      vault_item_id: typedItem.id,
      version_number: 1,
      change_summary: 'Initial version',
      content: input.content,
      provenance: input.provenance as unknown as Record<string, unknown>,
      created_by: input.userId,
    })
    .select()
    .single();

  if (versionError || !version) {
    console.error('[vault] Failed to create vault version:', versionError?.message);
    throw new Error('Failed to store vault version');
  }

  // 3. Audit log
  await logAudit({
    orgId: input.orgId,
    userId: input.userId,
    action: 'vault.item_created',
    entityType: 'vault_item',
    entityId: typedItem.id,
    metadata: {
      itemType: input.itemType,
      title: input.title,
      sourceEntityType: input.sourceEntityType,
      sourceEntityId: input.sourceEntityId,
    },
  });

  return {
    item: typedItem,
    version: version as unknown as VaultVersion,
  };
}

/**
 * Create a new version of an existing vault item.
 * The original version is preserved (immutable).
 * Updates the vault_item.current_version pointer.
 */
export async function createNewVersion(input: NewVersionInput): Promise<VaultVersion> {
  const supabase = await createUntypedServiceClient();

  // 1. Get current version number
  const { data: currentItem, error: fetchError } = await supabase
    .from('vault_items')
    .select('current_version, status')
    .eq('id', input.vaultItemId)
    .eq('org_id', input.orgId)
    .single();

  if (fetchError || !currentItem) {
    throw new Error('Vault item not found');
  }

  const typed = currentItem as unknown as { current_version: number; status: string };
  const newVersionNumber = typed.current_version + 1;

  // 2. Mark previous version's item as having a new version
  // (the old version row itself is never modified — immutable)
  await supabase
    .from('vault_items')
    .update({
      current_version: newVersionNumber,
      status: 'final', // New version makes item active again if it was superseded
    })
    .eq('id', input.vaultItemId)
    .eq('org_id', input.orgId);

  // 3. Insert new version
  const { data: version, error: versionError } = await supabase
    .from('vault_versions')
    .insert({
      org_id: input.orgId,
      vault_item_id: input.vaultItemId,
      version_number: newVersionNumber,
      change_summary: input.changeSummary,
      content: input.content,
      provenance: input.provenance as unknown as Record<string, unknown>,
      created_by: input.userId,
    })
    .select()
    .single();

  if (versionError || !version) {
    console.error('[vault] Failed to create new version:', versionError?.message);
    throw new Error('Failed to create new version');
  }

  await logAudit({
    orgId: input.orgId,
    userId: input.userId,
    action: 'vault.version_created',
    entityType: 'vault_version',
    entityId: (version as unknown as VaultVersion).id,
    metadata: {
      vaultItemId: input.vaultItemId,
      versionNumber: newVersionNumber,
      changeSummary: input.changeSummary,
    },
  });

  return version as unknown as VaultVersion;
}

// ============================================================
// Retrieval Functions
// ============================================================

/**
 * List vault items for an org with optional filters.
 * Enforces visibility rules based on the requesting user's role.
 */
export async function listVaultItems(
  orgId: string,
  options?: {
    itemType?: VaultItemType;
    status?: VaultItemStatus;
    search?: string;
    limit?: number;
    offset?: number;
    /** ID of the requesting user — required for visibility filtering */
    userId?: string;
    /** Role of the requesting user (admin, advisor, viewer) */
    userRole?: string;
  }
): Promise<{ items: VaultItem[]; total: number }> {
  const supabase = await createUntypedServiceClient();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let query = supabase
    .from('vault_items')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.itemType) {
    query = query.eq('item_type', options.itemType);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  // Full-text search: use tsvector index for ranked results with stemming,
  // with ilike fallback for partial word matches the index might miss.
  if (options?.search) {
    const term = options.search.replace(/['"\\%_]/g, ''); // Sanitise for both ilike and tsquery
    if (term.length > 0) {
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%`
      );
    }
  }

  // Enforce visibility rules: owner_only items only visible to their creator,
  // advisor_only items hidden from viewers
  if (options?.userId && options?.userRole) {
    if (options.userRole === 'viewer') {
      // Viewers see only 'org' visibility items
      query = query.eq('visibility', 'org');
    } else if (options.userRole === 'advisor') {
      // Advisors see 'org' and 'advisor_only', plus their own 'owner_only' items
      query = query.or(
        `visibility.eq.org,visibility.eq.advisor_only,and(visibility.eq.owner_only,created_by.eq.${options.userId})`
      );
    }
    // Admins/owners see everything — no additional filter needed
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[vault] Failed to list vault items:', error.message);
    throw new Error('Failed to list vault items');
  }

  return {
    items: (data ?? []) as unknown as VaultItem[],
    total: count ?? 0,
  };
}

/**
 * Get a single vault item with its latest version content.
 */
export async function getVaultItem(
  orgId: string,
  itemId: string
): Promise<{ item: VaultItem; latestVersion: VaultVersion } | null> {
  const supabase = await createUntypedServiceClient();

  const { data: item, error: itemError } = await supabase
    .from('vault_items')
    .select('*')
    .eq('id', itemId)
    .eq('org_id', orgId)
    .single();

  if (itemError || !item) return null;

  const typedItem = item as unknown as VaultItem;

  const { data: version, error: versionError } = await supabase
    .from('vault_versions')
    .select('*')
    .eq('vault_item_id', itemId)
    .eq('version_number', typedItem.current_version)
    .single();

  if (versionError || !version) return null;

  return {
    item: typedItem,
    latestVersion: version as unknown as VaultVersion,
  };
}

/**
 * Get all versions of a vault item (for version history view).
 */
export async function getVersionHistory(
  orgId: string,
  itemId: string
): Promise<VaultVersion[]> {
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('vault_versions')
    .select('*')
    .eq('vault_item_id', itemId)
    .eq('org_id', orgId)
    .order('version_number', { ascending: false });

  if (error) {
    console.error('[vault] Failed to get version history:', error.message);
    return [];
  }

  return (data ?? []) as unknown as VaultVersion[];
}

/**
 * Log an access event (view, download, export, share).
 */
export async function logVaultAccess(
  orgId: string,
  userId: string,
  vaultItemId: string,
  action: 'viewed' | 'downloaded' | 'exported' | 'shared',
  versionNumber?: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase.from('vault_access_log').insert({
    org_id: orgId,
    vault_item_id: vaultItemId,
    version_number: versionNumber ?? null,
    action,
    user_id: userId,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error('[vault] Failed to log access:', error.message);
  }
}

/**
 * Archive a vault item (soft delete — never actually deleted).
 */
export async function archiveVaultItem(
  orgId: string,
  userId: string,
  itemId: string
): Promise<boolean> {
  const supabase = await createUntypedServiceClient();

  const { error } = await supabase
    .from('vault_items')
    .update({ status: 'archived' })
    .eq('id', itemId)
    .eq('org_id', orgId);

  if (error) {
    console.error('[vault] Failed to archive item:', error.message);
    return false;
  }

  await logAudit({
    orgId,
    userId,
    action: 'vault.item_archived',
    entityType: 'vault_item',
    entityId: itemId,
  });

  return true;
}
