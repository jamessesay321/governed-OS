import { describe, it, expect } from 'vitest';
import { hashPrompt } from '@/lib/vault/storage';

describe('hashPrompt', () => {
  it('returns a 16-character hex string', () => {
    const hash = hashPrompt('test prompt');
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('produces consistent hashes for the same input', () => {
    const a = hashPrompt('What if revenue drops 20%?');
    const b = hashPrompt('What if revenue drops 20%?');
    expect(a).toBe(b);
  });

  it('produces different hashes for different inputs', () => {
    const a = hashPrompt('What if revenue drops 20%?');
    const b = hashPrompt('What if revenue drops 30%?');
    expect(a).not.toBe(b);
  });

  it('handles empty string', () => {
    const hash = hashPrompt('');
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('handles unicode input', () => {
    const hash = hashPrompt('£€¥ gross margin analysis 日本語');
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('handles very long input', () => {
    const longPrompt = 'x'.repeat(100000);
    const hash = hashPrompt(longPrompt);
    expect(hash).toHaveLength(16);
  });
});
