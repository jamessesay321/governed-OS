import { describe, it, expect, vi } from 'vitest';

// Mock the storeVaultItem function to test auto-store behavior
const mockStoreVaultItem = vi.fn();
vi.mock('@/lib/vault/storage', () => ({
  storeVaultItem: (...args: unknown[]) => mockStoreVaultItem(...args),
}));

import { autoStoreToVault } from '@/lib/vault/auto-store';

describe('autoStoreToVault', () => {
  beforeEach(() => {
    mockStoreVaultItem.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls storeVaultItem with correct parameters', async () => {
    mockStoreVaultItem.mockResolvedValue({ item: {}, version: {} });

    await autoStoreToVault({
      orgId: 'org-123',
      userId: 'user-456',
      itemType: 'kpi_snapshot',
      title: 'KPI Snapshot — 2024-01-01',
      description: '10 KPIs',
      tags: ['kpi', 'auto-generated'],
      content: { kpis: [] },
      provenance: { data_freshness_at: '2024-01-01T00:00:00Z' },
      periodStart: '2024-01-01',
      periodEnd: '2024-01-01',
    });

    expect(mockStoreVaultItem).toHaveBeenCalledOnce();
    const args = mockStoreVaultItem.mock.calls[0][0];
    expect(args.orgId).toBe('org-123');
    expect(args.userId).toBe('user-456');
    expect(args.itemType).toBe('kpi_snapshot');
    expect(args.title).toBe('KPI Snapshot — 2024-01-01');
    expect(args.status).toBe('final');
  });

  it('does not throw when storeVaultItem fails', async () => {
    mockStoreVaultItem.mockRejectedValue(new Error('Database connection failed'));

    // Should not throw
    await expect(
      autoStoreToVault({
        orgId: 'org-123',
        userId: 'user-456',
        itemType: 'board_pack',
        title: 'Test Report',
        content: {},
        provenance: {},
      })
    ).resolves.not.toThrow();
  });

  it('logs error when storeVaultItem fails', async () => {
    mockStoreVaultItem.mockRejectedValue(new Error('Connection timeout'));

    await autoStoreToVault({
      orgId: 'org-123',
      userId: 'user-456',
      itemType: 'board_pack',
      title: 'Test Report',
      content: {},
      provenance: {},
    });

    expect(console.error).toHaveBeenCalledWith(
      '[vault/auto-store] Failed to store output:',
      'Connection timeout'
    );
  });

  it('passes optional fields correctly', async () => {
    mockStoreVaultItem.mockResolvedValue({ item: {}, version: {} });

    await autoStoreToVault({
      orgId: 'org-123',
      userId: 'user-456',
      itemType: 'scenario_output',
      title: 'Scenario Run',
      content: { scenarioId: 'sc-1' },
      provenance: { source_entity_type: 'scenario' },
      sourceEntityType: 'scenario',
      sourceEntityId: 'sc-1',
      visibility: 'advisor_only',
    });

    const args = mockStoreVaultItem.mock.calls[0][0];
    expect(args.sourceEntityType).toBe('scenario');
    expect(args.sourceEntityId).toBe('sc-1');
    expect(args.visibility).toBe('advisor_only');
  });
});
