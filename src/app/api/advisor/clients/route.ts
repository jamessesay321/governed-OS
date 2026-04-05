import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Response schema for advisor client list.
 */
const ClientOrgSchema = z.object({
  id: z.string().uuid(),
  client_org_id: z.string().uuid(),
  org_name: z.string(),
  industry: z.string().nullable(),
  status: z.string(),
  relationship_type: z.string(),
  created_at: z.string(),
});

export type AdvisorClientOrg = z.infer<typeof ClientOrgSchema>;

/**
 * GET /api/advisor/clients
 * Returns the list of client organisations for the logged-in advisor.
 */
export async function GET() {
  try {
    const { user, profile } = await getAuthenticatedUser();

    // Only advisors and admins can access this endpoint
    const role = profile.role as string;
    if (role !== 'advisor' && role !== 'admin' && role !== 'owner') {
      return NextResponse.json(
        { error: 'Only advisors can access client list' },
        { status: 403 },
      );
    }

    const supabase = await createServiceClient();

    // Query advisor_clients joined with organisations
    const { data, error } = await supabase
      .from('advisor_clients')
      .select(`
        id,
        client_org_id,
        status,
        relationship_type,
        created_at,
        organisations!advisor_clients_client_org_id_fkey (
          name,
          industry
        )
      `)
      .eq('advisor_user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[ADVISOR] Failed to fetch clients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch client list' },
        { status: 500 },
      );
    }

    // Flatten the joined data
    const clients = (data ?? []).map((row: Record<string, unknown>) => {
      const org = row.organisations as Record<string, unknown> | null;
      return {
        id: row.id as string,
        client_org_id: row.client_org_id as string,
        org_name: (org?.name as string) ?? 'Unknown',
        industry: (org?.industry as string) ?? null,
        status: row.status as string,
        relationship_type: row.relationship_type as string,
        created_at: row.created_at as string,
      };
    });

    return NextResponse.json({ clients });
  } catch (err) {
    console.error('[ADVISOR] Error in GET /api/advisor/clients:', err);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }
}
