import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { fetchLatestEvents } from '@/lib/intelligence/events';
import { scanForEvents } from '@/lib/intelligence/scanner';

// GET /api/intelligence/events — List latest events (viewer+)
export async function GET() {
  try {
    await requireRole('viewer');

    const events = await fetchLatestEvents(50);
    return NextResponse.json(events);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[intelligence/events] GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/intelligence/events — Seed events (admin+)
export async function POST() {
  try {
    await requireRole('admin');

    const created = await scanForEvents();
    return NextResponse.json(
      { message: `Seeded ${created.length} events`, events: created },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[intelligence/events] POST error:', e);
    return NextResponse.json({ error: 'Failed to seed events' }, { status: 500 });
  }
}
