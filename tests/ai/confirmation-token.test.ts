import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateConfirmationToken, verifyConfirmationToken } from '@/lib/ai/confirmation-token';
import type { ProposedAssumptionChange } from '@/types';

// Set up a test encryption key (32 bytes = 64 hex chars)
const TEST_KEY = 'a'.repeat(64);

beforeEach(() => {
  vi.stubEnv('TOKEN_ENCRYPTION_KEY', TEST_KEY);
});

const testChanges: ProposedAssumptionChange[] = [
  {
    category: 'growth_rates',
    key: 'revenue_growth_rate',
    label: 'Revenue Growth Rate',
    type: 'percentage',
    current_value: 0.05,
    new_value: 0.1,
    reasoning: 'Increase growth',
    effective_from: '2024-01-01',
  },
];

describe('generateConfirmationToken', () => {
  it('generates a token with payload:signature format', () => {
    const token = generateConfirmationToken('scenario-1', 'change-1', testChanges);
    expect(token).toContain(':');
    const parts = token.split(':');
    expect(parts).toHaveLength(2);
  });
});

describe('verifyConfirmationToken', () => {
  it('valid token round-trips successfully', () => {
    const token = generateConfirmationToken('scenario-1', 'change-1', testChanges);
    const payload = verifyConfirmationToken(token, 'scenario-1');
    expect(payload.scenarioId).toBe('scenario-1');
    expect(payload.changeLogId).toBe('change-1');
    expect(payload.proposedChangesHash).toBeDefined();
    expect(payload.issuedAt).toBeGreaterThan(0);
  });

  it('throws on wrong scenario ID', () => {
    const token = generateConfirmationToken('scenario-1', 'change-1', testChanges);
    expect(() => verifyConfirmationToken(token, 'scenario-2')).toThrow('Token scenario mismatch');
  });

  it('throws on expired token (>15 min)', () => {
    // Generate token, then mock Date.now to be 16 minutes later
    const token = generateConfirmationToken('scenario-1', 'change-1', testChanges);

    const originalNow = Date.now;
    vi.spyOn(Date, 'now').mockReturnValue(originalNow() + 16 * 60 * 1000);

    expect(() => verifyConfirmationToken(token, 'scenario-1')).toThrow('Token expired');

    vi.restoreAllMocks();
  });

  it('throws on tampered signature', () => {
    const token = generateConfirmationToken('scenario-1', 'change-1', testChanges);
    const [payload] = token.split(':');
    const tamperedToken = `${payload}:tampered_signature`;

    expect(() => verifyConfirmationToken(tamperedToken, 'scenario-1')).toThrow('Invalid token signature');
  });

  it('throws on tampered payload', () => {
    const token = generateConfirmationToken('scenario-1', 'change-1', testChanges);
    const [, signature] = token.split(':');

    // Create a different payload
    const tamperedPayload = Buffer.from(JSON.stringify({
      scenarioId: 'scenario-1',
      changeLogId: 'change-HACKED',
      proposedChangesHash: 'fake',
      issuedAt: Date.now(),
    })).toString('base64url');

    const tamperedToken = `${tamperedPayload}:${signature}`;
    expect(() => verifyConfirmationToken(tamperedToken, 'scenario-1')).toThrow('Invalid token signature');
  });

  it('throws on invalid format', () => {
    expect(() => verifyConfirmationToken('no-colon-here', 'scenario-1')).toThrow('Invalid token format');
  });
});
