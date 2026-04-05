import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';
import {
  testConnection,
  listChannels,
  sendMessage,
  sectionBlock,
  contextBlock,
  headerBlock,
  dividerBlock,
} from '@/lib/integrations/slack';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const testMessageSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  message: z.string().min(1).max(2000).optional(),
});

// ---------------------------------------------------------------------------
// GET /api/integrations/slack — Connection status and channel list
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const { user, profile } = await getAuthenticatedUser();

    const status = await testConnection();

    let channels: Awaited<ReturnType<typeof listChannels>> = [];
    if (status.connected) {
      try {
        channels = await listChannels();
      } catch {
        // Bot may not have permission to list channels yet
      }
    }

    return NextResponse.json({
      connected: status.connected,
      team: status.team ?? null,
      botUser: status.botUser ?? null,
      error: status.error ?? null,
      channels: channels.map((c) => ({
        id: c.id,
        name: c.name,
        is_private: c.is_private,
        is_member: c.is_member,
        num_members: c.num_members ?? 0,
        topic: c.topic?.value ?? '',
        purpose: c.purpose?.value ?? '',
      })),
    });
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to check Slack connection' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/integrations/slack — Send a test message
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedUser();
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = testMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { channel, message } = parsed.data;
    const text = message ?? 'This is a test message from Grove (Governed OS).';

    const blocks = [
      headerBlock('Grove Test Message'),
      dividerBlock(),
      sectionBlock(text),
      dividerBlock(),
      contextBlock(`Sent by ${profile.display_name ?? 'Unknown'} via Grove`),
    ];

    const result = await sendMessage(channel, text, blocks);

    await logAudit({
      orgId,
      userId: user.id,
      action: 'slack.test_message_sent',
      entityType: 'integration',
      entityId: 'slack',
      metadata: { channel, ts: result.ts },
    });

    return NextResponse.json({ success: true, ts: result.ts });
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: (error as Error).message ?? 'Failed to send test message' },
      { status: 500 },
    );
  }
}
