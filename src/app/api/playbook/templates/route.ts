import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { getTemplates } from '@/lib/playbook/templates';

export async function GET() {
  try {
    await getAuthenticatedUser();
    const templates = getTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[playbook/templates] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
