import { storeVaultItem } from './storage';
import type { VaultItemType, Provenance, VaultVisibility } from './storage';

/**
 * Fire-and-forget vault storage for outputs created by other parts of the system.
 * Never throws — logs errors but does not block the caller.
 */
export async function autoStoreToVault(input: {
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
}): Promise<void> {
  try {
    await storeVaultItem({
      orgId: input.orgId,
      userId: input.userId,
      itemType: input.itemType,
      title: input.title,
      description: input.description,
      tags: input.tags,
      content: input.content,
      provenance: input.provenance,
      sourceEntityType: input.sourceEntityType,
      sourceEntityId: input.sourceEntityId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      visibility: input.visibility,
      status: 'final',
    });
  } catch (err) {
    // Vault storage is best-effort — never block the primary flow
    console.error('[vault/auto-store] Failed to store output:', err instanceof Error ? err.message : err);
  }
}
