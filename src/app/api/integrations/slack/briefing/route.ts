import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';
import { postBriefing, type BriefingData } from '@/lib/integrations/slack';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const briefingSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  /** Optional override for briefing data; when omitted the endpoint pulls live data. */
  briefingData: z
    .object({
      revenue: z
        .object({
          current: z.number(),
          previous: z.number(),
          currency: z.string(),
        })
        .optional(),
      cashPosition: z
        .object({
          balance: z.number(),
          currency: z.string(),
        })
        .optional(),
      kpis: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
            trend: z.enum(['up', 'down', 'flat']),
            status: z.enum(['green', 'amber', 'red']),
          }),
        )
        .optional(),
      alerts: z
        .array(
          z.object({
            severity: z.enum(['critical', 'warning', 'info']),
            message: z.string(),
          }),
        )
        .optional(),
      narrative: z.string().optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// POST /api/integrations/slack/briefing — Generate and send daily briefing
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedUser();
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = briefingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { channel, briefingData: overrideData } = parsed.data;

    // Fetch organisation name
    const service = await createServiceClient();
    const { data: org } = await service
      .from('organisations')
      .select('name')
      .eq('id', orgId)
      .single();

    const orgName = (org as Record<string, unknown>)?.name as string ?? 'Organisation';
    const today = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build briefing data: use override if provided, otherwise pull from platform
    let briefingPayload: BriefingData;

    if (overrideData) {
      briefingPayload = {
        orgName,
        date: today,
        ...overrideData,
      };
    } else {
      // Pull latest KPI and financial data from the platform
      briefingPayload = await buildLiveBriefing(orgId, orgName, today, service);
    }

    const result = await postBriefing(channel, briefingPayload);

    await logAudit({
      orgId,
      userId: user.id,
      action: 'slack.briefing_sent',
      entityType: 'integration',
      entityId: 'slack',
      metadata: { channel, ts: result.ts, date: today },
    });

    return NextResponse.json({ success: true, ts: result.ts });
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: (error as Error).message ?? 'Failed to send briefing' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Live briefing builder — pulls data from Supabase tables
// ---------------------------------------------------------------------------

async function buildLiveBriefing(
  orgId: string,
  orgName: string,
  date: string,
  service: Awaited<ReturnType<typeof createServiceClient>>,
): Promise<BriefingData> {
  const briefing: BriefingData = { orgName, date };

  // Attempt to pull KPI snapshots (table may not exist yet)
  try {
    const { data: kpiRows } = await (service as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (k: string, v: string) => {
            order: (k: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null }>;
            };
          };
        };
      };
    })
      .from('kpi_snapshots')
      .select('metric_name, value, trend, status')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(6);

    if (kpiRows && kpiRows.length > 0) {
      briefing.kpis = kpiRows.map((row) => ({
        name: row.metric_name as string,
        value: String(row.value),
        trend: (row.trend as 'up' | 'down' | 'flat') ?? 'flat',
        status: (row.status as 'green' | 'amber' | 'red') ?? 'green',
      }));
    }
  } catch {
    // Table may not exist — that's fine, briefing will be sent without KPIs
  }

  // Attempt to pull recent alerts
  try {
    const { data: alertRows } = await (service as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (k: string, v: string) => {
            order: (k: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null }>;
            };
          };
        };
      };
    })
      .from('kpi_alerts')
      .select('severity, message')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (alertRows && alertRows.length > 0) {
      briefing.alerts = alertRows.map((row) => ({
        severity: (row.severity as 'critical' | 'warning' | 'info') ?? 'info',
        message: row.message as string,
      }));
    }
  } catch {
    // Table may not exist
  }

  if (!briefing.kpis && !briefing.alerts) {
    briefing.narrative =
      'No financial data available yet. Connect your accounting software in Grove to generate live briefings.';
  }

  return briefing;
}
