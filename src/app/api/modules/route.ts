import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { getModulesForOrg } from '@/lib/modules/registry';

export async function GET() {
  try {
    const { profile } = await getAuthenticatedUser();
    const modules = getModulesForOrg(profile.org_id);
    return NextResponse.json({ modules });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
