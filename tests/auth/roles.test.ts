import { describe, it, expect } from 'vitest';
import { hasMinRole } from '@/lib/supabase/roles';

describe('hasMinRole', () => {
  it('owner has access to everything', () => {
    expect(hasMinRole('owner', 'owner')).toBe(true);
    expect(hasMinRole('owner', 'admin')).toBe(true);
    expect(hasMinRole('owner', 'advisor')).toBe(true);
    expect(hasMinRole('owner', 'viewer')).toBe(true);
  });

  it('admin has access to admin and below', () => {
    expect(hasMinRole('admin', 'owner')).toBe(false);
    expect(hasMinRole('admin', 'admin')).toBe(true);
    expect(hasMinRole('admin', 'advisor')).toBe(true);
    expect(hasMinRole('admin', 'viewer')).toBe(true);
  });

  it('advisor has access to advisor and below', () => {
    expect(hasMinRole('advisor', 'owner')).toBe(false);
    expect(hasMinRole('advisor', 'admin')).toBe(false);
    expect(hasMinRole('advisor', 'advisor')).toBe(true);
    expect(hasMinRole('advisor', 'viewer')).toBe(true);
  });

  it('viewer has access to viewer only', () => {
    expect(hasMinRole('viewer', 'owner')).toBe(false);
    expect(hasMinRole('viewer', 'admin')).toBe(false);
    expect(hasMinRole('viewer', 'advisor')).toBe(false);
    expect(hasMinRole('viewer', 'viewer')).toBe(true);
  });
});
