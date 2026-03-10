import { createHmac, timingSafeEqual, createHash } from 'crypto';
import type { ProposedAssumptionChange } from '@/types';

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  return Buffer.from(key, 'hex');
}

type TokenPayload = {
  scenarioId: string;
  changeLogId: string;
  proposedChangesHash: string;
  issuedAt: number;
};

/**
 * Generate an HMAC-based confirmation token.
 * Format: base64url(payload):base64url(hmac-sha256-signature)
 */
export function generateConfirmationToken(
  scenarioId: string,
  changeLogId: string,
  proposedChanges: ProposedAssumptionChange[]
): string {
  const proposedChangesHash = createHash('sha256')
    .update(JSON.stringify(proposedChanges))
    .digest('hex');

  const payload: TokenPayload = {
    scenarioId,
    changeLogId,
    proposedChangesHash,
    issuedAt: Date.now(),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', getKey())
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}:${signature}`;
}

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Verify an HMAC-based confirmation token.
 * Checks: signature integrity, 15-minute TTL, scenarioId match.
 * Returns payload or throws.
 */
export function verifyConfirmationToken(
  token: string,
  expectedScenarioId: string
): TokenPayload {
  const parts = token.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid token format');
  }

  const [payloadB64, signature] = parts;

  // Verify signature
  const expectedSignature = createHmac('sha256', getKey())
    .update(payloadB64)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature, 'base64url');
  const expectedSigBuffer = Buffer.from(expectedSignature, 'base64url');

  if (sigBuffer.length !== expectedSigBuffer.length ||
      !timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    throw new Error('Invalid token signature');
  }

  // Parse payload
  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid token payload');
  }

  // Check TTL
  if (Date.now() - payload.issuedAt > TOKEN_TTL_MS) {
    throw new Error('Token expired');
  }

  // Check scenario ID
  if (payload.scenarioId !== expectedScenarioId) {
    throw new Error('Token scenario mismatch');
  }

  return payload;
}
