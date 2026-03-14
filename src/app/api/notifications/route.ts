import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { getNotifications, getUnreadNotifications, markAllAsRead } from '@/lib/notifications/notify';

/**
 * GET /api/notifications - Get notifications for the authenticated user.
 * Query params: ?unreadOnly=true
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true';

    const notifications = unreadOnly
      ? await getUnreadNotifications(user.id)
      : await getNotifications(user.id);

    return NextResponse.json({ notifications });
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/notifications - Mark all as read.
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const body = await request.json();

    if (body.action === 'mark_all_read') {
      await markAllAsRead(user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
