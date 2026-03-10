import type { Role } from '@/types';
import { ROLE_HIERARCHY } from '@/types';
import { createClient } from './server';

export class AuthorizationError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Get the current authenticated user and their profile.
 * Throws if not authenticated.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthorizationError('Not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    throw new AuthorizationError('Profile not found');
  }

  return { user, profile };
}

/**
 * Check if the current user has at least the required role.
 * Returns the user and profile if authorized, throws otherwise.
 */
export async function requireRole(minRole: Role) {
  const { user, profile } = await getAuthenticatedUser();

  const userLevel = ROLE_HIERARCHY[profile.role as Role];
  const requiredLevel = ROLE_HIERARCHY[minRole];

  if (userLevel < requiredLevel) {
    throw new AuthorizationError(
      `Requires ${minRole} role, you have ${profile.role}`
    );
  }

  return { user, profile };
}

/**
 * Check if a role meets the minimum requirement (pure function).
 */
export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}
