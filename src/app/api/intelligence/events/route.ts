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
    const message = e instanceof Error ? e.message : 'Unauthorized';
    const status = e instanceof Error && e.name === 'AuthorizationError' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
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
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : 'Failed to seed events';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
