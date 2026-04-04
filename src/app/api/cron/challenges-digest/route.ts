import { NextResponse, type NextRequest } from 'next/server';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { challengeDigestEmailTemplate } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/resend';
import { logAudit } from '@/lib/audit/log';

// Allow up to 300s for cron digest (Pro plan)
export const maxDuration = 300;

/** Eligible roles that receive challenge digest emails. */
const DIGEST_ROLES = ['owner', 'admin', 'advisor'] as const;

interface ChallengeRow {
  id: string;
  org_id: string;
  severity: 'question' | 'concern' | 'error';
  page: string;
  metric_label: string;
  metric_value: string;
  reason: string;
  status: string;
  created_at: string;
}

interface ProfileData {
  email: string;
  display_name: string | null;
  full_name: string | null;
}

interface RawMemberRow {
  org_id: string;
  user_id: string;
  role: string;
  profiles: ProfileData | ProfileData[] | null;
}

interface NormalisedMember {
  org_id: string;
  user_id: string;
  role: string;
  profile: ProfileData;
}

interface OrgRow {
  id: string;
  name: string;
}

/**
 * GET /api/cron/challenges-digest
 *
 * Vercel Cron job that sends weekly challenge digest emails to eligible users.
 * Secured via CRON_SECRET header -- only Vercel's scheduler can call this.
 *
 * Schedule: Every Monday at 08:00 UTC (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createUntypedServiceClient();

  // Fetch all open/investigating challenges
  const { data: challenges, error: challengeError } = await supabase
    .from('number_challenges')
    .select('id, org_id, severity, page, metric_label, metric_value, reason, status, created_at')
    .in('status', ['open', 'investigating']);

  if (challengeError) {
    console.error('[cron/challenges-digest] Failed to fetch challenges:', challengeError.message);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 },
    );
  }

  const challengeRows = (challenges ?? []) as ChallengeRow[];

  if (challengeRows.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No open challenges' });
  }

  // Group challenges by org_id
  const challengesByOrg = new Map<string, ChallengeRow[]>();
  for (const ch of challengeRows) {
    const existing = challengesByOrg.get(ch.org_id);
    if (existing) {
      existing.push(ch);
    } else {
      challengesByOrg.set(ch.org_id, [ch]);
    }
  }

  const orgIds = Array.from(challengesByOrg.keys());

  // Fetch org names
  const { data: orgsData, error: orgsError } = await supabase
    .from('organisations')
    .select('id, name')
    .in('id', orgIds);

  if (orgsError) {
    console.error('[cron/challenges-digest] Failed to fetch organisations:', orgsError.message);
    return NextResponse.json(
      { error: 'Failed to fetch organisations' },
      { status: 500 },
    );
  }

  const orgMap = new Map<string, string>();
  for (const org of (orgsData ?? []) as OrgRow[]) {
    orgMap.set(org.id, org.name);
  }

  // Fetch eligible members for all affected orgs (with org_id for grouping)
  const { data: membersWithOrg, error: membersWithOrgError } = await supabase
    .from('organisation_members')
    .select('org_id, user_id, role, profiles ( email, display_name, full_name )')
    .in('org_id', orgIds)
    .in('role', DIGEST_ROLES as unknown as string[]);

  if (membersWithOrgError) {
    console.error('[cron/challenges-digest] Failed to fetch members with org:', membersWithOrgError.message);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 },
    );
  }

  const membersByOrg = new Map<string, NormalisedMember[]>();
  for (const row of (membersWithOrg ?? []) as unknown as RawMemberRow[]) {
    // Supabase untyped client may return profiles as object or array
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile?.email) continue;

    const member: NormalisedMember = {
      org_id: row.org_id,
      user_id: row.user_id,
      role: row.role,
      profile,
    };

    const existing = membersByOrg.get(row.org_id);
    if (existing) {
      existing.push(member);
    } else {
      membersByOrg.set(row.org_id, [member]);
    }
  }

  const results: Array<{
    orgId: string;
    emailsSent: number;
    errors: string[];
  }> = [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.grove.dev';

  // Send digest for each org
  for (const [orgId, orgChallenges] of challengesByOrg) {
    const orgName = orgMap.get(orgId) ?? 'Your Organisation';
    const members = membersByOrg.get(orgId) ?? [];
    const orgResult = { orgId, emailsSent: 0, errors: [] as string[] };

    const templateChallenges = orgChallenges.map((ch) => ({
      severity: ch.severity,
      page: ch.page,
      metricLabel: ch.metric_label,
      metricValue: ch.metric_value,
      reason: ch.reason,
      createdAt: ch.created_at,
    }));

    const reviewQueueUrl = `${appUrl}/dashboard/challenges?org=${orgId}`;

    for (const member of members) {
      const userName =
        member.profile.display_name ??
        member.profile.full_name ??
        'there';

      const html = challengeDigestEmailTemplate({
        userName,
        orgName,
        openCount: orgChallenges.length,
        challenges: templateChallenges,
        reviewQueueUrl,
      });

      try {
        await sendEmail({
          to: member.profile.email,
          template: 'challenges-digest',
          html,
        });

        orgResult.emailsSent++;

        await logAudit({
          orgId,
          userId: member.user_id,
          action: 'challenges.digest_sent',
          entityType: 'number_challenges',
          entityId: orgId,
          metadata: {
            trigger: 'vercel_cron',
            openCount: orgChallenges.length,
            recipientEmail: member.profile.email,
          },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(
          `[cron/challenges-digest] Failed to send to ${member.profile.email} for org ${orgId}:`,
          errorMsg,
        );
        orgResult.errors.push(`${member.profile.email}: ${errorMsg}`);
      }
    }

    results.push(orgResult);
  }

  const totalSent = results.reduce((sum, r) => sum + r.emailsSent, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  return NextResponse.json({
    orgsProcessed: results.length,
    totalEmailsSent: totalSent,
    totalErrors,
    results,
  });
}
