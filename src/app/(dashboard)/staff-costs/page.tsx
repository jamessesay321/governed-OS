import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { StaffCostsClient } from './staff-costs-client';

// ── Types ──

export interface StaffRole {
  roleId: string;
  roleName: string;
  accounts: StaffAccountDetail[];
  amounts: Record<string, number>;
  total: number;
  salaryTotal: number;
  nicTotal: number;
  pensionTotal: number;
}

export interface StaffAccountDetail {
  accountId: string;
  accountName: string;
  accountCode: string;
  costType: 'salary' | 'nic' | 'pension' | 'other';
  amounts: Record<string, number>;
  total: number;
}

export interface StaffPeriodSummary {
  period: string;
  label: string;
  totalStaffCost: number;
  totalSalaries: number;
  totalNIC: number;
  totalPension: number;
  byRole: Record<string, number>;
}

// ── Role extraction ──

interface RolePattern {
  pattern: RegExp;
  role: string;
  costType: 'salary' | 'nic' | 'pension' | 'other';
}

const STAFF_PATTERNS: RolePattern[] = [
  // Direct production staff
  { pattern: /Bridal production salaries/i, role: 'Bridal Production', costType: 'salary' },
  { pattern: /Bridal production NIC/i, role: 'Bridal Production', costType: 'nic' },
  { pattern: /Bridal production pensions/i, role: 'Bridal Production', costType: 'pension' },

  { pattern: /Samples production salaries/i, role: 'Samples Production', costType: 'salary' },
  { pattern: /Samples production NIC/i, role: 'Samples Production', costType: 'nic' },
  { pattern: /Samples production pensions/i, role: 'Samples Production', costType: 'pension' },

  { pattern: /Production manager salaries/i, role: 'Production Manager', costType: 'salary' },
  { pattern: /Production manager NIC/i, role: 'Production Manager', costType: 'nic' },
  { pattern: /Production manager pensions/i, role: 'Production Manager', costType: 'pension' },

  { pattern: /Development manager salaries/i, role: 'Development Manager', costType: 'salary' },
  { pattern: /Development manager NIC/i, role: 'Development Manager', costType: 'nic' },
  { pattern: /Development manager pensions/i, role: 'Development Manager', costType: 'pension' },

  { pattern: /Product development salaries/i, role: 'Product Development', costType: 'salary' },
  { pattern: /Product development NIC/i, role: 'Product Development', costType: 'nic' },
  { pattern: /Product development pensions/i, role: 'Product Development', costType: 'pension' },

  { pattern: /Social media manager salaries/i, role: 'Social Media Manager', costType: 'salary' },
  { pattern: /Social media manager NIC/i, role: 'Social Media Manager', costType: 'nic' },
  { pattern: /Social media manager pensions/i, role: 'Social Media Manager', costType: 'pension' },

  { pattern: /Customer services? salaries/i, role: 'Customer Service', costType: 'salary' },
  { pattern: /Customer services? NIC/i, role: 'Customer Service', costType: 'nic' },
  { pattern: /Customer services? pensions/i, role: 'Customer Service', costType: 'pension' },

  { pattern: /CEO personal assistant salaries/i, role: 'CEO PA', costType: 'salary' },
  { pattern: /CEO personal assistant NIC/i, role: 'CEO PA', costType: 'nic' },
  { pattern: /CEO personal assistant pensions/i, role: 'CEO PA', costType: 'pension' },

  // Overhead staff
  { pattern: /Director.*remuneration/i, role: 'Director', costType: 'salary' },
  { pattern: /Directors.*pension/i, role: 'Director', costType: 'pension' },

  { pattern: /Wages.*Salaries/i, role: 'General Staff', costType: 'salary' },
  { pattern: /Payroll Expenses: Wages/i, role: 'General Staff', costType: 'salary' },

  { pattern: /^Employers? NIC$/i, role: 'General Staff', costType: 'nic' },
  { pattern: /^Employers? Pension$/i, role: 'General Staff', costType: 'pension' },
  { pattern: /Smart Pension/i, role: 'General Staff', costType: 'pension' },
  { pattern: /^Pensions$/i, role: 'General Staff', costType: 'pension' },
  { pattern: /Payroll Expenses: Pension/i, role: 'General Staff', costType: 'pension' },
  { pattern: /Payroll Expenses(?!:)/i, role: 'General Staff', costType: 'other' },

  { pattern: /Intern/i, role: 'Interns', costType: 'other' },
  { pattern: /Cost of Labour/i, role: 'Labour (General)', costType: 'other' },
  { pattern: /Staff training/i, role: 'Training & Welfare', costType: 'other' },
  { pattern: /Recruitment/i, role: 'Recruitment', costType: 'other' },

  // Freelance
  { pattern: /Freelance.*COGS/i, role: 'Freelance – Production', costType: 'other' },
  { pattern: /Freelance.*Samples/i, role: 'Freelance – Samples', costType: 'other' },
  { pattern: /Freelance.*Marketing/i, role: 'Freelance – Marketing', costType: 'other' },
  { pattern: /Freelance Work USD/i, role: 'Freelance – International', costType: 'other' },
  { pattern: /Trunk Show Freelance/i, role: 'Freelance – Trunk Shows', costType: 'other' },
];

function matchStaffPattern(accountName: string): { role: string; costType: 'salary' | 'nic' | 'pension' | 'other' } | null {
  for (const { pattern, role, costType } of STAFF_PATTERNS) {
    if (pattern.test(accountName)) return { role, costType };
  }
  return null;
}

function monthLabel(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// ── Page ──

export default async function StaffCostsPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // Get all expense accounts
  const { data: coaData } = await supabase
    .from('chart_of_accounts')
    .select('id, name, code, class, type')
    .eq('org_id', orgId)
    .in('class', ['EXPENSE', 'DIRECTCOSTS', 'OVERHEADS']);

  const allAccounts = (coaData ?? []) as unknown as Array<{
    id: string; name: string; code: string; class: string; type: string;
  }>;

  // Filter to staff-related accounts
  const staffAccountMap = new Map<string, { account: typeof allAccounts[0]; role: string; costType: string }>();
  for (const acct of allAccounts) {
    const match = matchStaffPattern(acct.name);
    if (match) {
      staffAccountMap.set(acct.id, { account: acct, ...match });
    }
  }

  const staffAccountIds = Array.from(staffAccountMap.keys());

  // Fetch transactions
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .in('account_id', staffAccountIds)
    .order('period', { ascending: true });

  const rows = (financials ?? []) as unknown as Array<{
    period: string; amount: number; account_id: string;
  }>;

  // Build account-level data
  const accountDetails = new Map<string, StaffAccountDetail>();
  const allPeriods = new Set<string>();

  for (const row of rows) {
    const info = staffAccountMap.get(row.account_id);
    if (!info) continue;

    allPeriods.add(row.period);

    if (!accountDetails.has(row.account_id)) {
      accountDetails.set(row.account_id, {
        accountId: row.account_id,
        accountName: info.account.name,
        accountCode: info.account.code,
        costType: info.costType as 'salary' | 'nic' | 'pension' | 'other',
        amounts: {},
        total: 0,
      });
    }

    const entry = accountDetails.get(row.account_id)!;
    entry.amounts[row.period] = (entry.amounts[row.period] ?? 0) + Number(row.amount);
    entry.total += Number(row.amount);
  }

  // Sort periods, take last 12
  const sortedPeriods = Array.from(allPeriods).sort().slice(-12);

  // Aggregate by role
  const roleMap = new Map<string, StaffRole>();

  for (const [accountId, detail] of accountDetails.entries()) {
    const info = staffAccountMap.get(accountId)!;
    const roleName = info.role;

    if (!roleMap.has(roleName)) {
      roleMap.set(roleName, {
        roleId: roleName.toLowerCase().replace(/\s+/g, '-'),
        roleName,
        accounts: [],
        amounts: {},
        total: 0,
        salaryTotal: 0,
        nicTotal: 0,
        pensionTotal: 0,
      });
    }

    const role = roleMap.get(roleName)!;
    role.accounts.push(detail);
    role.total += detail.total;

    if (detail.costType === 'salary') role.salaryTotal += detail.total;
    else if (detail.costType === 'nic') role.nicTotal += detail.total;
    else if (detail.costType === 'pension') role.pensionTotal += detail.total;

    // Sum amounts by period
    for (const [period, amount] of Object.entries(detail.amounts)) {
      role.amounts[period] = (role.amounts[period] ?? 0) + amount;
    }
  }

  // Sort roles by total cost
  const roles = Array.from(roleMap.values())
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  // Build period summaries
  const periodSummaries: StaffPeriodSummary[] = sortedPeriods.map((period) => {
    const byRole: Record<string, number> = {};
    let totalStaffCost = 0;
    let totalSalaries = 0;
    let totalNIC = 0;
    let totalPension = 0;

    for (const role of roles) {
      const roleAmount = role.amounts[period] ?? 0;
      if (roleAmount !== 0) {
        byRole[role.roleName] = roleAmount;
        totalStaffCost += roleAmount;
      }

      for (const acct of role.accounts) {
        const amt = acct.amounts[period] ?? 0;
        if (acct.costType === 'salary') totalSalaries += amt;
        else if (acct.costType === 'nic') totalNIC += amt;
        else if (acct.costType === 'pension') totalPension += amt;
      }
    }

    return {
      period,
      label: monthLabel(period),
      totalStaffCost,
      totalSalaries,
      totalNIC,
      totalPension,
      byRole,
    };
  });

  // Totals
  const totalStaffCost = roles.reduce((s, r) => s + r.total, 0);
  const totalSalaries = roles.reduce((s, r) => s + r.salaryTotal, 0);
  const totalNIC = roles.reduce((s, r) => s + r.nicTotal, 0);
  const totalPension = roles.reduce((s, r) => s + r.pensionTotal, 0);

  // Get revenue for staff-to-revenue ratio
  const { data: revCoaData } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('org_id', orgId)
    .in('class', ['REVENUE', 'OTHERINCOME']);

  const revIds = ((revCoaData ?? []) as unknown as Array<{ id: string }>).map((a) => a.id);

  let totalRevenue = 0;
  if (revIds.length > 0) {
    const { data: revFinancials } = await supabase
      .from('normalised_financials')
      .select('amount')
      .eq('org_id', orgId)
      .in('account_id', revIds)
      .in('period', sortedPeriods);

    totalRevenue = ((revFinancials ?? []) as unknown as Array<{ amount: number }>)
      .reduce((s, r) => s + Number(r.amount), 0);
  }

  // MoM change
  const lastMonthTotal = periodSummaries.length > 0 ? periodSummaries[periodSummaries.length - 1].totalStaffCost : 0;
  const prevMonthTotal = periodSummaries.length > 1 ? periodSummaries[periodSummaries.length - 2].totalStaffCost : 0;
  const momChange = prevMonthTotal > 0 ? ((lastMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;

  // Headcount proxy: count roles with salary > 0 in latest period
  const activeRoles = roles.filter((r) => {
    const latestAmount = sortedPeriods.length > 0 ? (r.amounts[sortedPeriods[sortedPeriods.length - 1]] ?? 0) : 0;
    return latestAmount > 0;
  }).length;

  // Employer on-cost ratio
  const employerOnCostRatio = totalSalaries > 0
    ? ((totalNIC + totalPension) / totalSalaries) * 100
    : 0;

  return (
    <StaffCostsClient
      roles={roles}
      periodSummaries={periodSummaries}
      totalStaffCost={totalStaffCost}
      totalSalaries={totalSalaries}
      totalNIC={totalNIC}
      totalPension={totalPension}
      totalRevenue={totalRevenue}
      momChange={momChange}
      lastMonthTotal={lastMonthTotal}
      activeRoles={activeRoles}
      employerOnCostRatio={employerOnCostRatio}
    />
  );
}
