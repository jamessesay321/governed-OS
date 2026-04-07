import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { HeadcountClient } from './headcount-client';

// ── Types ──

export interface HeadcountRole {
  roleId: string;
  roleName: string;
  department: string;
  accounts: HeadcountAccountDetail[];
  amounts: Record<string, number>;
  annualCost: number;
  monthlyAvg: number;
  salaryTotal: number;
  nicTotal: number;
  pensionTotal: number;
  otherTotal: number;
}

export interface HeadcountAccountDetail {
  accountId: string;
  accountName: string;
  accountCode: string;
  costType: 'salary' | 'nic' | 'pension' | 'other';
  amounts: Record<string, number>;
  total: number;
}

export interface HeadcountDepartment {
  id: string;
  name: string;
  color: string;
  roles: HeadcountRole[];
  totalCost: number;
  pctOfTotal: number;
  monthlyAmounts: Record<string, number>;
}

export interface HeadcountPeriodSummary {
  period: string;
  label: string;
  totalCost: number;
  byDepartment: Record<string, number>;
}

// ── Department colour map ──

const DEPARTMENT_COLORS: Record<string, string> = {
  'Production':           '#7c3aed',
  'Design & Development': '#06b6d4',
  'Marketing & Sales':    '#f59e0b',
  'Customer Operations':  '#10b981',
  'Management':           '#ef4444',
  'General':              '#6366f1',
};

// ── Role → Department mapping ──

const ROLE_TO_DEPARTMENT: Record<string, string> = {
  'Bridal Production':        'Production',
  'Samples Production':       'Production',
  'Production Manager':       'Production',
  'Development Manager':      'Design & Development',
  'Product Development':      'Design & Development',
  'Social Media Manager':     'Marketing & Sales',
  'Customer Service':         'Customer Operations',
  'CEO PA':                   'Customer Operations',
  'Director':                 'Management',
  'General Staff':            'General',
  'Interns':                  'General',
  'Labour (General)':         'General',
  'Training & Welfare':       'General',
  'Recruitment':              'General',
  'Freelance – Production':   'General',
  'Freelance – Samples':      'General',
  'Freelance – Marketing':    'General',
  'Freelance – International':'General',
  'Freelance – Trunk Shows':  'General',
};

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

export default async function HeadcountPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // 1. Fetch chart_of_accounts for staff-related accounts
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

  // 2. Fetch normalised_financials for last 12 months
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
  const accountDetails = new Map<string, HeadcountAccountDetail>();
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

  // 3. Aggregate by role
  const roleMap = new Map<string, HeadcountRole>();

  for (const [accountId, detail] of accountDetails.entries()) {
    const info = staffAccountMap.get(accountId)!;
    const roleName = info.role;
    const department = ROLE_TO_DEPARTMENT[roleName] ?? 'General';

    if (!roleMap.has(roleName)) {
      roleMap.set(roleName, {
        roleId: roleName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        roleName,
        department,
        accounts: [],
        amounts: {},
        annualCost: 0,
        monthlyAvg: 0,
        salaryTotal: 0,
        nicTotal: 0,
        pensionTotal: 0,
        otherTotal: 0,
      });
    }

    const role = roleMap.get(roleName)!;
    role.accounts.push(detail);
    role.annualCost += detail.total;

    if (detail.costType === 'salary') role.salaryTotal += detail.total;
    else if (detail.costType === 'nic') role.nicTotal += detail.total;
    else if (detail.costType === 'pension') role.pensionTotal += detail.total;
    else role.otherTotal += detail.total;

    for (const [period, amount] of Object.entries(detail.amounts)) {
      role.amounts[period] = (role.amounts[period] ?? 0) + amount;
    }
  }

  // Compute monthly average per role
  const periodCount = sortedPeriods.length || 1;
  for (const role of roleMap.values()) {
    role.monthlyAvg = role.annualCost / periodCount;
  }

  // Sort roles by annual cost
  const roles = Array.from(roleMap.values())
    .filter((r) => r.annualCost > 0)
    .sort((a, b) => b.annualCost - a.annualCost);

  // 4. Build departments
  const totalStaffCost = roles.reduce((s, r) => s + r.annualCost, 0);

  const departmentMap = new Map<string, HeadcountDepartment>();

  for (const role of roles) {
    const deptName = role.department;

    if (!departmentMap.has(deptName)) {
      departmentMap.set(deptName, {
        id: deptName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: deptName,
        color: DEPARTMENT_COLORS[deptName] ?? '#6366f1',
        roles: [],
        totalCost: 0,
        pctOfTotal: 0,
        monthlyAmounts: {},
      });
    }

    const dept = departmentMap.get(deptName)!;
    dept.roles.push(role);
    dept.totalCost += role.annualCost;

    for (const [period, amount] of Object.entries(role.amounts)) {
      dept.monthlyAmounts[period] = (dept.monthlyAmounts[period] ?? 0) + amount;
    }
  }

  // Compute pctOfTotal
  for (const dept of departmentMap.values()) {
    dept.pctOfTotal = totalStaffCost > 0 ? (dept.totalCost / totalStaffCost) * 100 : 0;
  }

  const departments = Array.from(departmentMap.values()).sort((a, b) => b.totalCost - a.totalCost);

  // 5. Build period summaries (monthly by department)
  const periodSummaries: HeadcountPeriodSummary[] = sortedPeriods.map((period) => {
    const byDepartment: Record<string, number> = {};
    let totalCost = 0;

    for (const dept of departments) {
      const deptAmount = dept.monthlyAmounts[period] ?? 0;
      if (deptAmount !== 0) {
        byDepartment[dept.name] = deptAmount;
        totalCost += deptAmount;
      }
    }

    return {
      period,
      label: monthLabel(period),
      totalCost,
      byDepartment,
    };
  });

  // 6. Summary stats
  const totalSalaries = roles.reduce((s, r) => s + r.salaryTotal, 0);
  const totalNIC = roles.reduce((s, r) => s + r.nicTotal, 0);
  const totalPension = roles.reduce((s, r) => s + r.pensionTotal, 0);
  const activeRoles = roles.filter((r) => {
    const latestAmount = sortedPeriods.length > 0 ? (r.amounts[sortedPeriods[sortedPeriods.length - 1]] ?? 0) : 0;
    return latestAmount > 0;
  }).length;
  const avgCostPerRole = roles.length > 0 ? totalStaffCost / roles.length : 0;
  const employerOnCostPct = totalSalaries > 0
    ? ((totalNIC + totalPension) / totalSalaries) * 100
    : 0;

  return (
    <HeadcountClient
      departments={departments}
      roles={roles}
      periodSummaries={periodSummaries}
      totalStaffCost={totalStaffCost}
      totalSalaries={totalSalaries}
      totalNIC={totalNIC}
      totalPension={totalPension}
      activeRoles={activeRoles}
      avgCostPerRole={avgCostPerRole}
      employerOnCostPct={employerOnCostPct}
      periodCount={periodCount}
    />
  );
}
