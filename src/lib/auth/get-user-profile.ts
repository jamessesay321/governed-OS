import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Cached helper to get the authenticated user's profile.
 * React.cache() deduplicates calls within a single request,
 * so layout.tsx and page.tsx share the same result — zero extra DB hits.
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

  return {
    userId: user.id,
    orgId: profile.org_id as string,
    role: profile.role as string,
    displayName: profile.display_name as string,
    orgName: (profile.organisations?.name as string) || 'Organisation',
    profile,
  };
});
