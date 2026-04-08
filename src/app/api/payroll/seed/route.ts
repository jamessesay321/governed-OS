import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

// ─── Payroll Seed: Alonuko Staff ───────────────────────────────────────────
// Seeds payroll_groups and payroll_group_members from known WIP report data.
//
// NOTE: Salary figures are estimates based on UK fashion industry averages.
// They should be updated with actual payroll figures once available.
// ────────────────────────────────────────────────────────────────────────────

const ORG_ID = 'd49bc641-5b5e-4089-b931-5a103c69617a';

// UK 2024/25 defaults
const DEFAULT_NI_RATE = 0.138;       // 13.8% employer NI
const DEFAULT_NI_THRESHOLD = 9100.0; // £9,100 annual threshold
const DEFAULT_PENSION_RATE = 0.03;   // 3% employer pension

interface PayrollGroupDef {
  name: string;
  description: string;
}

interface PayrollMemberDef {
  name: string;
  role_title: string;
  annual_gross_salary: number;
  start_date: string | null;
  end_date: string | null;
  is_forecast: boolean;
  group_name: string; // matched to PayrollGroupDef.name
}

const PAYROLL_GROUPS: PayrollGroupDef[] = [
  {
    name: 'Production Team',
    description: 'Seamstresses and production staff — bridal and samples',
  },
  {
    name: 'Management',
    description: 'Directors and senior management',
  },
  {
    name: 'Design & Creative',
    description: 'Designers and creative team',
  },
  {
    name: 'Sales & Front of House',
    description: 'Sales consultants and front-of-house staff',
  },
  {
    name: 'Operations',
    description: 'Admin, office, and general operations staff',
  },
];

// Salary estimates based on UK fashion industry averages for London-based bridal atelier.
// UPDATE THESE WITH ACTUAL PAYROLL FIGURES.
const PAYROLL_MEMBERS: PayrollMemberDef[] = [
  // ── Production Team (from WIP Daily Usages sheet) ──
  { name: 'Stephanika', role_title: 'Senior Seamstress', annual_gross_salary: 28000, start_date: '2024-01-01', end_date: null, is_forecast: false, group_name: 'Production Team' },
  { name: 'Maria',      role_title: 'Seamstress',        annual_gross_salary: 26000, start_date: '2024-01-01', end_date: null, is_forecast: false, group_name: 'Production Team' },
  { name: 'Rachel',     role_title: 'Seamstress',        annual_gross_salary: 26000, start_date: '2024-01-01', end_date: null, is_forecast: false, group_name: 'Production Team' },
  { name: 'Yasmin',     role_title: 'Seamstress',        annual_gross_salary: 25000, start_date: '2024-01-01', end_date: null, is_forecast: false, group_name: 'Production Team' },
  { name: 'Harit',      role_title: 'Seamstress',        annual_gross_salary: 24000, start_date: '2024-01-01', end_date: null, is_forecast: false, group_name: 'Production Team' },
  { name: 'Hana',       role_title: 'Seamstress',        annual_gross_salary: 24000, start_date: '2024-01-01', end_date: null, is_forecast: false, group_name: 'Production Team' },
  { name: 'Vanisha',    role_title: 'Seamstress',        annual_gross_salary: 24000, start_date: '2024-01-01', end_date: null, is_forecast: false, group_name: 'Production Team' },
  { name: 'Masi',       role_title: 'Seamstress',        annual_gross_salary: 24000, start_date: '2024-01-01', end_date: null, is_forecast: false, group_name: 'Production Team' },
  { name: 'Smit',       role_title: 'Seamstress',        annual_gross_salary: 24000, start_date: '2024-01-01', end_date: null, is_forecast: false, group_name: 'Production Team' },

  // ── Management ──
  { name: 'Gbemi Abudu', role_title: 'Creative Director / CEO', annual_gross_salary: 45000, start_date: '2018-01-01', end_date: null, is_forecast: false, group_name: 'Management' },
  { name: 'Nicole',      role_title: 'Operations Director',     annual_gross_salary: 40000, start_date: '2020-01-01', end_date: null, is_forecast: false, group_name: 'Management' },
];

export async function POST() {
  try {
    const { user, profile } = await requireRole('admin');
    const orgId = profile.org_id as string;
    const userId = user.id;

    // Safety: only seed for Alonuko org
    if (orgId !== ORG_ID) {
      return NextResponse.json(
        { error: 'This seed endpoint is only available for the Alonuko organisation.' },
        { status: 403 },
      );
    }

    const supabase = await createUntypedServiceClient();

    // ── Step 1: Upsert payroll groups ─────────────────────────────────────
    // We upsert by (org_id, name) to avoid duplicates on re-run.
    // Supabase upsert needs a unique constraint, so we do select-then-insert.

    const groupIdMap = new Map<string, string>();

    for (const group of PAYROLL_GROUPS) {
      // Check if group already exists
      const { data: existing } = await supabase
        .from('payroll_groups')
        .select('id')
        .eq('org_id', orgId)
        .eq('name', group.name)
        .maybeSingle();

      if (existing) {
        // Update existing group rates
        await supabase
          .from('payroll_groups')
          .update({
            description: group.description,
            employer_ni_rate: DEFAULT_NI_RATE,
            employer_ni_threshold: DEFAULT_NI_THRESHOLD,
            employer_pension_rate: DEFAULT_PENSION_RATE,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (existing as Record<string, unknown>).id);

        groupIdMap.set(group.name, (existing as Record<string, unknown>).id as string);
      } else {
        // Insert new group
        const { data: inserted, error: insertErr } = await supabase
          .from('payroll_groups')
          .insert({
            org_id: orgId,
            name: group.name,
            description: group.description,
            employer_ni_rate: DEFAULT_NI_RATE,
            employer_ni_threshold: DEFAULT_NI_THRESHOLD,
            employer_pension_rate: DEFAULT_PENSION_RATE,
          })
          .select('id')
          .single();

        if (insertErr || !inserted) {
          return NextResponse.json(
            { error: `Failed to create group "${group.name}": ${insertErr?.message}` },
            { status: 500 },
          );
        }

        groupIdMap.set(group.name, (inserted as Record<string, unknown>).id as string);
      }
    }

    // ── Step 2: Upsert payroll group members ──────────────────────────────

    let membersCreated = 0;
    let membersUpdated = 0;

    for (const member of PAYROLL_MEMBERS) {
      const groupId = groupIdMap.get(member.group_name);
      if (!groupId) {
        return NextResponse.json(
          { error: `Group not found for member "${member.name}": ${member.group_name}` },
          { status: 500 },
        );
      }

      // Check if member already exists (by name + group)
      const { data: existing } = await supabase
        .from('payroll_group_members')
        .select('id')
        .eq('org_id', orgId)
        .eq('payroll_group_id', groupId)
        .eq('name', member.name)
        .maybeSingle();

      if (existing) {
        // Update existing member
        await supabase
          .from('payroll_group_members')
          .update({
            role_title: member.role_title,
            annual_gross_salary: member.annual_gross_salary,
            start_date: member.start_date,
            end_date: member.end_date,
            is_forecast: member.is_forecast,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (existing as Record<string, unknown>).id);

        membersUpdated++;
      } else {
        // Insert new member
        const { error: memberErr } = await supabase
          .from('payroll_group_members')
          .insert({
            org_id: orgId,
            payroll_group_id: groupId,
            name: member.name,
            role_title: member.role_title,
            annual_gross_salary: member.annual_gross_salary,
            start_date: member.start_date,
            end_date: member.end_date,
            is_forecast: member.is_forecast,
          });

        if (memberErr) {
          return NextResponse.json(
            { error: `Failed to create member "${member.name}": ${memberErr.message}` },
            { status: 500 },
          );
        }

        membersCreated++;
      }
    }

    // ── Step 3: Audit log ─────────────────────────────────────────────────

    const groupNames = PAYROLL_GROUPS.map((g) => g.name);
    const memberNames = PAYROLL_MEMBERS.map((m) => m.name);

    await logAudit({
      orgId,
      userId,
      action: 'payroll_groups_seeded',
      entityType: 'payroll_group',
      entityId: orgId,
      changes: {
        groups: groupNames,
        groups_count: groupNames.length,
        members_created: membersCreated,
        members_updated: membersUpdated,
        members_total: PAYROLL_MEMBERS.length,
        member_names: memberNames,
        note: 'Salary figures are estimates — update with actual payroll data.',
      },
    });

    // ── Step 4: Return summary ────────────────────────────────────────────

    const groupSummary = PAYROLL_GROUPS.map((g) => ({
      name: g.name,
      id: groupIdMap.get(g.name),
      members: PAYROLL_MEMBERS.filter((m) => m.group_name === g.name).map((m) => ({
        name: m.name,
        role_title: m.role_title,
        annual_gross_salary: m.annual_gross_salary,
      })),
    }));

    return NextResponse.json(
      {
        message: `Seeded ${groupNames.length} payroll groups with ${membersCreated} new members (${membersUpdated} updated).`,
        seeded: true,
        groups: groupSummary,
        totals: {
          groups: groupNames.length,
          members_created: membersCreated,
          members_updated: membersUpdated,
          members_total: PAYROLL_MEMBERS.length,
          estimated_annual_payroll: PAYROLL_MEMBERS.reduce((sum, m) => sum + m.annual_gross_salary, 0),
        },
        warning: 'Salary figures are estimates based on UK fashion industry averages. Update with actual payroll data.',
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
