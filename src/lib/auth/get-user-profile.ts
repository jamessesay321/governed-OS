import { cache } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * Cached helper to get the authenticated user's profile.
 * React.cache() deduplicates calls within a single request,
 * so layout.tsx and page.tsx share the same result -- zero extra DB hits.
 *
 * Advisor mode: If the user is an advisor and has the `advisor_active_org_id`
 * cookie set, this validates the relationship and returns the client's orgId
 * so all downstream pages show the client's data automatically.
 */
export const getUserProfile = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organisations(name)')
    .eq('id', user.id)
    .single();

  if (!profile) return redirect('/login');

  // Base values (own org)
  let orgId = profile.org_id as string;
  let orgName = (profile.organisations?.name as string) || 'Organisation';
  let isAdvisorMode = false;
  let advisorOwnOrgId: string | null = null;

  const role = profile.role as string;

  // Check for advisor mode
  if (role === 'advisor' || role === 'admin' || role === 'owner') {
    try {
      const cookieStore = await cookies();
      const activeOrgCookie = cookieStore.get('advisor_active_org_id');

      if (activeOrgCookie?.value) {
        const targetOrgId = activeOrgCookie.value;

        // Validate the advisor actually has access to this org
        const serviceClient = await createServiceClient();
        const { data: relationship } = await serviceClient
          .from('advisor_clients')
          .select('id, status')
          .eq('advisor_user_id', user.id)
          .eq('client_org_id', targetOrgId)
          .eq('status', 'active')
          .single();

        if (relationship) {
          // Valid advisor relationship -- switch context
          advisorOwnOrgId = profile.org_id as string;
          orgId = targetOrgId;
          isAdvisorMode = true;

          // Fetch the client org name
          const { data: clientOrg } = await serviceClient
            .from('organisations')
            .select('name')
            .eq('id', targetOrgId)
            .single();

          if (clientOrg) {
            orgName = (clientOrg as Record<string, unknown>).name as string;
          }
        }
        // If relationship is invalid, silently fall back to own org
      }
    } catch {
      // Cookie or DB issue -- fall back to own org silently
    }
  }

  return {
    userId: user.id,
    orgId,
    role,
    displayName: profile.display_name as string,
    orgName,
    profile,
    isAdvisorMode,
    advisorOwnOrgId,
  };
});
