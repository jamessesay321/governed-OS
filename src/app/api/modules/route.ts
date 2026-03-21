import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { getModulesForOrg } from '@/lib/modules/registry';

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser();
    const modules = getModulesForOrg(profile.org_id);
    return NextResponse.json({ modules });
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[modules] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
