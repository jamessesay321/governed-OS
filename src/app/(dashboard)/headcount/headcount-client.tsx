'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Users,
  Wallet,
  Building2,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Network,
  LayoutList,
  PoundSterling,
  Percent,
  Plus,
  UserPlus,
  X,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/formatting/currency';
import { ExportButton } from '@/components/shared/export-button';
import type {
  HeadcountDepartment,
  HeadcountRole,
  HeadcountPeriodSummary,
  Employee,
  PayrollGroupOption,
} from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface HeadcountClientProps {
  departments: HeadcountDepartment[];
  roles: HeadcountRole[];
  periodSummaries: HeadcountPeriodSummary[];
  totalStaffCost: number;
  totalSalaries: number;
  totalNIC: number;
  totalPension: number;
  activeRoles: number;
  avgCostPerRole: number;
  employerOnCostPct: number;
  periodCount: number;
  employees: Employee[];
  payrollGroupOptions: PayrollGroupOption[];
  orgId: string;
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const DEPT_PILL_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  'Production':           { bg: 'bg-purple-100 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', ring: 'ring-purple-300 dark:ring-purple-700' },
  'Design & Development': { bg: 'bg-cyan-100 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', ring: 'ring-cyan-300 dark:ring-cyan-700' },
  'Marketing & Sales':    { bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-300 dark:ring-amber-700' },
  'Customer Operations':  { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-300 dark:ring-emerald-700' },
  'Management':           { bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', ring: 'ring-red-300 dark:ring-red-700' },
  'General':              { bg: 'bg-indigo-100 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', ring: 'ring-indigo-300 dark:ring-indigo-700' },
};

const DEPT_CHART_COLORS: Record<string, string> = {
  'Production':           '#7c3aed',
  'Design & Development': '#06b6d4',
  'Marketing & Sales':    '#f59e0b',
  'Customer Operations':  '#10b981',
  'Management':           '#ef4444',
  'General':              '#6366f1',
};

const FALLBACK_COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444',
  '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

/* ================================================================== */
/*  Formatters                                                         */
/* ================================================================== */

function fmtCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `\u00A3${(amount / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `\u00A3${(amount / 1_000).toFixed(0)}k`;
  return formatCurrency(amount);
}

function fmtAxis(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `\u00A3${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `\u00A3${(value / 1_000).toFixed(0)}k`;
  return `\u00A3${value}`;
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function CostTypeBar({ role }: { role: HeadcountRole }) {
  const total = role.annualCost;
  if (total <= 0) return null;

  const segments: Array<{ label: string; value: number; color: string }> = [];
  if (role.salaryTotal > 0) segments.push({ label: 'Salary', value: role.salaryTotal, color: 'bg-purple-500' });
  if (role.nicTotal > 0) segments.push({ label: 'NIC', value: role.nicTotal, color: 'bg-red-400' });
  if (role.pensionTotal > 0) segments.push({ label: 'Pension', value: role.pensionTotal, color: 'bg-cyan-400' });
  if (role.otherTotal > 0) segments.push({ label: 'Other', value: role.otherTotal, color: 'bg-amber-400' });

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex h-2.5 flex-1 rounded-full overflow-hidden bg-muted">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={cn(seg.color)}
            style={{ width: `${(seg.value / total) * 100}%` }}
            title={`${seg.label}: ${formatCurrency(seg.value)}`}
          />
        ))}
      </div>
      <div className="flex gap-1.5 text-[10px] text-muted-foreground shrink-0">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-0.5">
            <span className={cn('inline-block w-1.5 h-1.5 rounded-full', seg.color)} />
            {seg.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function OrgChartNode({
  label,
  subtitle,
  cost,
  children,
  color,
}: {
  label: string;
  subtitle?: string;
  cost?: string;
  children?: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'rounded-lg border px-4 py-2.5 text-center min-w-[140px] shadow-sm',
          'bg-card'
        )}
        style={{ borderLeftColor: color, borderLeftWidth: color ? '3px' : undefined }}
      >
        <p className="text-sm font-medium">{label}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        {cost && <p className="text-xs font-semibold mt-0.5">{cost}</p>}
      </div>
      {children && (
        <div className="flex flex-col items-center mt-2">
          <div className="w-px h-4 bg-border" />
          <div className="flex gap-3 flex-wrap justify-center">{children}</div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export function HeadcountClient({
  departments,
  roles,
  periodSummaries,
  totalStaffCost,
  totalSalaries,
  totalNIC,
  totalPension,
  activeRoles,
  avgCostPerRole,
  employerOnCostPct,
  periodCount,
  employees,
  payrollGroupOptions,
  orgId,
}: HeadcountClientProps) {
  const [activeDept, setActiveDept] = useState<string | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'register' | 'orgchart'>('register');
  const [newDeptInput, setNewDeptInput] = useState('');
  const [dataSource, setDataSource] = useState<'xero' | 'payroll'>('xero');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormLoading, setAddFormLoading] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [addFormName, setAddFormName] = useState('');
  const [addFormRole, setAddFormRole] = useState('');
  const [addFormGroupId, setAddFormGroupId] = useState(payrollGroupOptions[0]?.id ?? '');
  const [addFormSalary, setAddFormSalary] = useState('');
  const [addFormStartDate, setAddFormStartDate] = useState('');

  // Filter departments by active pill
  const filteredDepartments = useMemo(() => {
    if (!activeDept) return departments;
    return departments.filter((d) => d.name === activeDept);
  }, [departments, activeDept]);

  const toggleDept = (deptId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  // Stacked bar data: monthly by department
  const stackedBarData = useMemo(() => {
    return periodSummaries.map((p) => {
      const row: Record<string, number | string> = { label: p.label };
      for (const dept of departments) {
        row[dept.name] = Math.round(p.byDepartment[dept.name] ?? 0);
      }
      return row;
    });
  }, [periodSummaries, departments]);

  // Pie data: department cost distribution
  const deptPieData = useMemo(() => {
    return departments
      .filter((d) => d.totalCost > 0)
      .map((d) => ({ name: d.name, value: Math.round(d.totalCost) }));
  }, [departments]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-1 min-w-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Headcount Register</h1>
            <p className="text-muted-foreground">
              Staff breakdown by department, roles, and employer on-costs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('register')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                view === 'register'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <LayoutList className="h-4 w-4" />
              Register
            </button>
            <button
              onClick={() => setView('orgchart')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                view === 'orgchart'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Network className="h-4 w-4" />
              Org Chart
            </button>
          </div>
        </div>
        <div className="ml-4 shrink-0">
          {dataSource === 'payroll' ? (
            <ExportButton
              data={employees.map((e) => ({
                name: e.name,
                role: e.roleTitle,
                department: e.department,
                monthlyGross: e.monthlyGross,
                employerNIC: e.employerNIC,
                employerPension: e.employerPension,
                totalMonthlyCost: e.totalMonthlyCost,
                annualSalary: e.annualGrossSalary,
              }))}
              columns={[
                { header: 'Name', key: 'name', format: 'text' },
                { header: 'Role', key: 'role', format: 'text' },
                { header: 'Department', key: 'department', format: 'text' },
                { header: 'Monthly Gross', key: 'monthlyGross', format: 'currency' },
                { header: 'Employer NIC', key: 'employerNIC', format: 'currency' },
                { header: 'Employer Pension', key: 'employerPension', format: 'currency' },
                { header: 'Total Monthly Cost', key: 'totalMonthlyCost', format: 'currency' },
                { header: 'Annual Salary', key: 'annualSalary', format: 'currency' },
              ]}
              filename="employee-register"
              title="Employee Register"
            />
          ) : (
            <ExportButton
              data={roles.map((r) => ({
                role: r.roleName,
                department: departments.find((d) => d.roles.some((dr) => dr.roleId === r.roleId))?.name ?? '',
                annualCost: r.annualCost,
                monthlyAvg: r.monthlyAvg,
                salary: r.salaryTotal,
                nic: r.nicTotal,
                pension: r.pensionTotal,
                other: r.otherTotal,
              }))}
              columns={[
                { header: 'Role', key: 'role', format: 'text' },
                { header: 'Department', key: 'department', format: 'text' },
                { header: 'Annual Cost', key: 'annualCost', format: 'currency' },
                { header: 'Monthly Avg', key: 'monthlyAvg', format: 'currency' },
                { header: 'Salary', key: 'salary', format: 'currency' },
                { header: 'NIC', key: 'nic', format: 'currency' },
                { header: 'Pension', key: 'pension', format: 'currency' },
                { header: 'Other', key: 'other', format: 'currency' },
              ]}
              filename="headcount-register"
              title="Headcount Register"
            />
          )}
        </div>
      </div>

      {/* ── Data Source Tabs ── */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
        <button
          onClick={() => setDataSource('xero')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            dataSource === 'xero'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          GL Accounts
          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">from Xero</span>
        </button>
        <button
          onClick={() => setDataSource('payroll')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            dataSource === 'payroll'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Employee Register
          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">from payroll</span>
          {employees.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              {employees.length}
            </span>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  PAYROLL REGISTER VIEW                                        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {dataSource === 'payroll' && (
        <EmployeeRegisterSection
          employees={employees}
          payrollGroupOptions={payrollGroupOptions}
          orgId={orgId}
          showAddForm={showAddForm}
          setShowAddForm={setShowAddForm}
          addFormLoading={addFormLoading}
          setAddFormLoading={setAddFormLoading}
          addFormError={addFormError}
          setAddFormError={setAddFormError}
          addFormName={addFormName}
          setAddFormName={setAddFormName}
          addFormRole={addFormRole}
          setAddFormRole={setAddFormRole}
          addFormGroupId={addFormGroupId}
          setAddFormGroupId={setAddFormGroupId}
          addFormSalary={addFormSalary}
          setAddFormSalary={setAddFormSalary}
          addFormStartDate={addFormStartDate}
          setAddFormStartDate={setAddFormStartDate}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  XERO GL VIEW (existing)                                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {dataSource === 'xero' && (<>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-purple-50 dark:bg-purple-950/30 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Wallet className="h-4 w-4" />
            Total Staff Cost
          </div>
          <p className="text-2xl font-bold">{fmtCompact(totalStaffCost)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {fmtCompact(totalStaffCost / periodCount)}/month avg ({periodCount}mo)
          </p>
        </div>

        <div className="rounded-xl border bg-purple-50 dark:bg-purple-950/30 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            Active Roles
          </div>
          <p className="text-2xl font-bold">{activeRoles}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {roles.length} total roles tracked
          </p>
        </div>

        <div className="rounded-xl border bg-purple-50 dark:bg-purple-950/30 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <PoundSterling className="h-4 w-4" />
            Avg Cost Per Role
          </div>
          <p className="text-2xl font-bold">{fmtCompact(avgCostPerRole)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {fmtCompact(avgCostPerRole / periodCount)}/month
          </p>
        </div>

        <div className={cn(
          'rounded-xl border p-5',
          employerOnCostPct > 25
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
            : 'bg-purple-50 dark:bg-purple-950/30'
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Percent className="h-4 w-4" />
            Employer On-Cost %
          </div>
          <p className="text-2xl font-bold">{employerOnCostPct.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            NIC {fmtCompact(totalNIC)} + Pension {fmtCompact(totalPension)}
          </p>
        </div>
      </div>

      {/* ── Department Pill Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveDept(null)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors ring-1',
            !activeDept
              ? 'bg-purple-600 text-white ring-purple-600'
              : 'bg-muted text-muted-foreground ring-border hover:bg-muted/80'
          )}
        >
          All Departments
        </button>
        {departments.map((dept) => {
          const style = DEPT_PILL_STYLES[dept.name] ?? DEPT_PILL_STYLES['General'];
          const isActive = activeDept === dept.name;
          return (
            <button
              key={dept.id}
              onClick={() => setActiveDept(isActive ? null : dept.name)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors ring-1',
                isActive
                  ? cn(style.bg, style.text, style.ring)
                  : 'bg-muted text-muted-foreground ring-border hover:bg-muted/80'
              )}
            >
              {dept.name}
              <span className="ml-1.5 opacity-70">{dept.roles.length}</span>
            </button>
          );
        })}

        {/* Add Department placeholder */}
        <div className="flex items-center gap-1 ml-2">
          <input
            type="text"
            placeholder="Add department..."
            value={newDeptInput}
            onChange={(e) => setNewDeptInput(e.target.value)}
            className="h-7 w-32 rounded-full border bg-muted/50 px-3 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
          <button
            className="h-7 w-7 rounded-full border bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            title="Add department (coming soon)"
            onClick={() => setNewDeptInput('')}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Register View ── */}
      {view === 'register' && (
        <div className="space-y-3">
          {filteredDepartments.map((dept) => {
            const isExpanded = expandedDepts.has(dept.id);
            const pillStyle = DEPT_PILL_STYLES[dept.name] ?? DEPT_PILL_STYLES['General'];
            return (
              <div
                key={dept.id}
                className="rounded-xl border bg-card overflow-hidden"
              >
                {/* Department header */}
                <button
                  onClick={() => toggleDept(dept.id)}
                  className="flex items-center justify-between w-full px-5 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div
                      className="w-1 h-6 rounded-full"
                      style={{ backgroundColor: DEPT_CHART_COLORS[dept.name] ?? '#6366f1' }}
                    />
                    <span className="font-semibold text-sm">{dept.name}</span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium',
                      pillStyle.bg, pillStyle.text
                    )}>
                      {dept.roles.length} role{dept.roles.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-muted-foreground">{dept.pctOfTotal.toFixed(1)}%</span>
                    <span className="font-semibold w-24 text-right">{fmtCompact(dept.totalCost)}</span>
                  </div>
                </button>

                {/* Expanded: role table */}
                {isExpanded && (
                  <div className="border-t">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="py-2.5 px-5 text-left font-medium text-muted-foreground text-xs">Role</th>
                          <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Annual Cost</th>
                          <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Monthly Avg</th>
                          <th className="py-2.5 px-4 text-left font-medium text-muted-foreground text-xs w-[280px]">Cost Type</th>
                          <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dept.roles
                          .sort((a, b) => b.annualCost - a.annualCost)
                          .map((role) => {
                            const pctOfTotal = totalStaffCost > 0
                              ? ((role.annualCost / totalStaffCost) * 100).toFixed(1)
                              : '0.0';
                            return (
                              <tr key={role.roleId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-5">
                                  <p className="font-medium">{role.roleName}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {role.accounts.length} account{role.accounts.length !== 1 ? 's' : ''}
                                  </p>
                                </td>
                                <td className="py-3 px-4 text-right font-medium">{formatCurrency(role.annualCost)}</td>
                                <td className="py-3 px-4 text-right text-muted-foreground">{formatCurrency(role.monthlyAvg)}</td>
                                <td className="py-3 px-4">
                                  <CostTypeBar role={role} />
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className={cn(
                                    'text-xs font-medium px-2 py-0.5 rounded-full',
                                    Number(pctOfTotal) >= 10
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                      : 'bg-muted text-muted-foreground'
                                  )}>
                                    {pctOfTotal}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        {/* Department totals row */}
                        <tr className="bg-muted/40 font-semibold">
                          <td className="py-2.5 px-5 text-xs">Department Total</td>
                          <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(dept.totalCost)}</td>
                          <td className="py-2.5 px-4 text-right text-xs text-muted-foreground">
                            {formatCurrency(dept.totalCost / periodCount)}
                          </td>
                          <td className="py-2.5 px-4" />
                          <td className="py-2.5 px-4 text-right text-xs">{dept.pctOfTotal.toFixed(1)}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {filteredDepartments.length === 0 && (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No staff data found for this department filter.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Org Chart View ── */}
      {view === 'orgchart' && (
        <div className="rounded-xl border bg-card p-6 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-6">Organisation Chart</h2>
          <div className="flex flex-col items-center min-w-[600px]">
            {/* Root: company */}
            <OrgChartNode
              label="Alonuko"
              subtitle={`${roles.length} roles`}
              cost={fmtCompact(totalStaffCost)}
              color="#7c3aed"
            >
              <div className="flex gap-4 flex-wrap justify-center">
                {departments.map((dept) => (
                  <OrgChartNode
                    key={dept.id}
                    label={dept.name}
                    subtitle={`${dept.roles.length} role${dept.roles.length !== 1 ? 's' : ''}`}
                    cost={fmtCompact(dept.totalCost)}
                    color={DEPT_CHART_COLORS[dept.name]}
                  >
                    <div className="flex gap-2 flex-wrap justify-center mt-1">
                      {dept.roles
                        .sort((a, b) => b.annualCost - a.annualCost)
                        .map((role) => (
                          <div
                            key={role.roleId}
                            className="rounded-md border bg-muted/50 px-3 py-1.5 text-center min-w-[110px]"
                          >
                            <p className="text-xs font-medium">{role.roleName}</p>
                            <p className="text-[10px] text-muted-foreground">{fmtCompact(role.annualCost)}</p>
                          </div>
                        ))}
                    </div>
                  </OrgChartNode>
                ))}
              </div>
            </OrgChartNode>
          </div>
        </div>
      )}

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stacked Bar: Monthly Staff Cost by Department */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Monthly Cost by Department</h2>
          </div>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedBarData} margin={{ left: 10, right: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#6b7280' }} />
                <RechartsTooltip
                  formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name ?? '')]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                {departments.map((dept, i) => (
                  <Bar
                    key={dept.name}
                    dataKey={dept.name}
                    stackId="departments"
                    fill={DEPT_CHART_COLORS[dept.name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie: Department Cost Distribution */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Department Cost Distribution</h2>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={115}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${(name ?? '').length > 16 ? (name ?? '').substring(0, 16) + '\u2026' : (name ?? '')} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={{ strokeWidth: 1 }}
                >
                  {deptPieData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={DEPT_CHART_COLORS[entry.name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Cost']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      </>)}
    </div>
  );
}

/* ================================================================== */
/*  Employee Register Section                                          */
/* ================================================================== */

function EmployeeRegisterSection({
  employees,
  payrollGroupOptions,
  orgId,
  showAddForm,
  setShowAddForm,
  addFormLoading,
  setAddFormLoading,
  addFormError,
  setAddFormError,
  addFormName,
  setAddFormName,
  addFormRole,
  setAddFormRole,
  addFormGroupId,
  setAddFormGroupId,
  addFormSalary,
  setAddFormSalary,
  addFormStartDate,
  setAddFormStartDate,
}: {
  employees: Employee[];
  payrollGroupOptions: PayrollGroupOption[];
  orgId: string;
  showAddForm: boolean;
  setShowAddForm: (v: boolean) => void;
  addFormLoading: boolean;
  setAddFormLoading: (v: boolean) => void;
  addFormError: string | null;
  setAddFormError: (v: string | null) => void;
  addFormName: string;
  setAddFormName: (v: string) => void;
  addFormRole: string;
  setAddFormRole: (v: string) => void;
  addFormGroupId: string;
  setAddFormGroupId: (v: string) => void;
  addFormSalary: string;
  setAddFormSalary: (v: string) => void;
  addFormStartDate: string;
  setAddFormStartDate: (v: string) => void;
}) {
  const router = useRouter();

  // Compute summary totals
  const totalHeadcount = employees.length;
  const totalMonthlyPayroll = employees.reduce((s, e) => s + e.totalMonthlyCost, 0);
  const totalAnnualCost = employees.reduce((s, e) => s + e.totalAnnualCost, 0);
  const totalMonthlyGross = employees.reduce((s, e) => s + e.monthlyGross, 0);
  const totalNIC = employees.reduce((s, e) => s + e.employerNIC, 0);
  const totalPension = employees.reduce((s, e) => s + e.employerPension, 0);

  const handleAddEmployee = useCallback(async () => {
    setAddFormError(null);

    if (!addFormName.trim()) { setAddFormError('Name is required'); return; }
    if (!addFormGroupId) { setAddFormError('Please select a department'); return; }
    const salary = parseFloat(addFormSalary);
    if (isNaN(salary) || salary < 0) { setAddFormError('Enter a valid salary'); return; }

    setAddFormLoading(true);
    try {
      const res = await fetch(`/api/payroll/${orgId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payroll_group_id: addFormGroupId,
          name: addFormName.trim(),
          role_title: addFormRole.trim() || undefined,
          annual_gross_salary: salary,
          start_date: addFormStartDate || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAddFormError((body as Record<string, string>).error ?? 'Failed to add employee');
        return;
      }

      // Reset form and refresh page
      setAddFormName('');
      setAddFormRole('');
      setAddFormSalary('');
      setAddFormStartDate('');
      setShowAddForm(false);
      router.refresh();
    } catch {
      setAddFormError('Network error. Please try again.');
    } finally {
      setAddFormLoading(false);
    }
  }, [
    addFormName, addFormRole, addFormGroupId, addFormSalary, addFormStartDate,
    orgId, router, setAddFormError, setAddFormLoading, setAddFormName,
    setAddFormRole, setAddFormSalary, setAddFormStartDate, setShowAddForm,
  ]);

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-purple-50 dark:bg-purple-950/30 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            Total Headcount
          </div>
          <p className="text-2xl font-bold">{totalHeadcount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            employees in payroll register
          </p>
        </div>

        <div className="rounded-xl border bg-purple-50 dark:bg-purple-950/30 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Wallet className="h-4 w-4" />
            Monthly Payroll
          </div>
          <p className="text-2xl font-bold">{fmtCompact(totalMonthlyPayroll)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            fully loaded monthly cost
          </p>
        </div>

        <div className="rounded-xl border bg-purple-50 dark:bg-purple-950/30 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <PoundSterling className="h-4 w-4" />
            Annual Cost
          </div>
          <p className="text-2xl font-bold">{fmtCompact(totalAnnualCost)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            salary + NIC + pension
          </p>
        </div>

        <div className="rounded-xl border bg-purple-50 dark:bg-purple-950/30 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Percent className="h-4 w-4" />
            Avg Cost Per Head
          </div>
          <p className="text-2xl font-bold">
            {totalHeadcount > 0 ? fmtCompact(totalAnnualCost / totalHeadcount) : '\u00A30'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            fully loaded annual cost
          </p>
        </div>
      </div>

      {/* Add Employee Button */}
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            showAddForm
              ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          )}
        >
          {showAddForm ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              Add Employee
            </>
          )}
        </button>
      </div>

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Add New Employee</h3>
          {addFormError && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
              {addFormError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
              <input
                type="text"
                value={addFormName}
                onChange={(e) => setAddFormName(e.target.value)}
                placeholder="e.g. Jane Smith"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Role Title</label>
              <input
                type="text"
                value={addFormRole}
                onChange={(e) => setAddFormRole(e.target.value)}
                placeholder="e.g. Senior Developer"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Department *</label>
              <select
                value={addFormGroupId}
                onChange={(e) => setAddFormGroupId(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {payrollGroupOptions.length === 0 && (
                  <option value="">No departments available</option>
                )}
                {payrollGroupOptions.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Annual Gross Salary *</label>
              <input
                type="number"
                value={addFormSalary}
                onChange={(e) => setAddFormSalary(e.target.value)}
                placeholder="e.g. 45000"
                min="0"
                step="100"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
              <input
                type="date"
                value={addFormStartDate}
                onChange={(e) => setAddFormStartDate(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddEmployee}
                disabled={addFormLoading || payrollGroupOptions.length === 0}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center',
                  'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {addFormLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Employee
                  </>
                )}
              </button>
            </div>
          </div>
          {payrollGroupOptions.length === 0 && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              You need to create a payroll group (department) first before adding employees.
              Use the Payroll API or Staff Costs page to create one.
            </p>
          )}
        </div>
      )}

      {/* Employee Table */}
      {employees.length > 0 ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-2.5 px-4 text-left font-medium text-muted-foreground text-xs">Name</th>
                  <th className="py-2.5 px-4 text-left font-medium text-muted-foreground text-xs">Role</th>
                  <th className="py-2.5 px-4 text-left font-medium text-muted-foreground text-xs">Department</th>
                  <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Monthly Gross</th>
                  <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Employer NIC</th>
                  <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Employer Pension</th>
                  <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Total Monthly</th>
                  <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Annual Salary</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{emp.name}</span>
                        {emp.isForecast && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            forecast
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{emp.roleTitle || '\u2014'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                        {emp.department}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{formatCurrency(emp.monthlyGross)}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{formatCurrency(emp.employerNIC / 12)}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{formatCurrency(emp.employerPension / 12)}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(emp.totalMonthlyCost)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(emp.annualGrossSalary)}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-muted/40 font-semibold border-t">
                  <td className="py-2.5 px-4 text-xs">Total ({totalHeadcount} employees)</td>
                  <td className="py-2.5 px-4" />
                  <td className="py-2.5 px-4" />
                  <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(totalMonthlyGross)}</td>
                  <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(totalNIC / 12)}</td>
                  <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(totalPension / 12)}</td>
                  <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(totalMonthlyPayroll)}</td>
                  <td className="py-2.5 px-4 text-right text-xs">{formatCurrency(employees.reduce((s, e) => s + e.annualGrossSalary, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium mb-1">No employees added to the payroll register yet.</p>
          <p className="text-xs">Add employees to see individual cost breakdowns.</p>
        </div>
      )}
    </>
  );
}
