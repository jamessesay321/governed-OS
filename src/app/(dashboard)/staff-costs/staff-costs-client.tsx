'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useDrillDown } from '@/components/shared/drill-down-sheet';
import { ExportButton } from '@/components/shared/export-button';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  ChevronDown,
  ChevronRight,
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
  AreaChart,
  Area,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact, chartAxisFormatter, formatPercent } from '@/lib/formatting/currency';
import { NumberLegend } from '@/components/data-primitives';
import type { StaffRole, StaffPeriodSummary } from './page';

/* ================================================================== */
/*  Props                                                              */
/* ================================================================== */

interface StaffCostsClientProps {
  roles: StaffRole[];
  periodSummaries: StaffPeriodSummary[];
  totalStaffCost: number;
  totalSalaries: number;
  totalNIC: number;
  totalPension: number;
  totalRevenue: number;
  momChange: number;
  lastMonthTotal: number;
  activeRoles: number;
  employerOnCostRatio: number;
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e',
];

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export function StaffCostsClient({
  roles,
  periodSummaries,
  totalStaffCost,
  totalSalaries,
  totalNIC,
  totalPension,
  totalRevenue,
  momChange,
  lastMonthTotal,
  activeRoles,
  employerOnCostRatio,
}: StaffCostsClientProps) {
  const { openDrill } = useDrillDown();
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // Pie chart by role
  const rolesPieData = useMemo(() => {
    return roles
      .filter((r) => r.total > 0)
      .slice(0, 12)
      .map((r) => ({ name: r.roleName, value: Math.round(r.total) }));
  }, [roles]);

  // Salary / NIC / Pension split pie
  const componentPieData = useMemo(() => {
    const data = [];
    if (totalSalaries > 0) data.push({ name: 'Salaries', value: Math.round(totalSalaries) });
    if (totalNIC > 0) data.push({ name: 'Employer NIC', value: Math.round(totalNIC) });
    if (totalPension > 0) data.push({ name: 'Pension', value: Math.round(totalPension) });
    const otherCosts = totalStaffCost - totalSalaries - totalNIC - totalPension;
    if (otherCosts > 0) data.push({ name: 'Other', value: Math.round(otherCosts) });
    return data;
  }, [totalStaffCost, totalSalaries, totalNIC, totalPension]);

  const componentColors = ['#7c3aed', '#ef4444', '#06b6d4', '#f59e0b'];

  // Staff cost trend (stacked area: salary/NIC/pension)
  const trendData = useMemo(() => {
    return periodSummaries.map((p) => ({
      label: p.label,
      salaries: Math.round(p.totalSalaries),
      nic: Math.round(p.totalNIC),
      pension: Math.round(p.totalPension),
      other: Math.round(p.totalStaffCost - p.totalSalaries - p.totalNIC - p.totalPension),
      total: Math.round(p.totalStaffCost),
    }));
  }, [periodSummaries]);

  // Role-level stacked bar
  const roleBarData = useMemo(() => {
    const topRoles = roles.slice(0, 8);
    return periodSummaries.map((p) => {
      const row: Record<string, number | string> = { label: p.label };
      let otherTotal = 0;
      for (const role of roles) {
        const amount = p.byRole[role.roleName] ?? 0;
        if (topRoles.includes(role)) {
          row[role.roleName] = Math.round(amount);
        } else {
          otherTotal += amount;
        }
      }
      if (otherTotal > 0) row['Other Roles'] = Math.round(otherTotal);
      return row;
    });
  }, [periodSummaries, roles]);

  const roleBarNames = useMemo(() => {
    const names = roles.slice(0, 8).map((r) => r.roleName);
    if (roles.length > 8) names.push('Other Roles');
    return names;
  }, [roles]);

  // Staff-to-revenue ratio
  const staffToRevenue = totalRevenue > 0 ? (totalStaffCost / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Cost Analysis</h1>
          <p className="text-muted-foreground">
            Payroll breakdown by role, employer on-costs, and headcount trends
          </p>
        </div>
        <ExportButton
        data={roles.map((r) => ({
          role: r.roleName,
          annualCost: r.total,
          salary: r.salaryTotal,
          nic: r.nicTotal,
          pension: r.pensionTotal,
          accounts: r.accounts.length,
          percentOfTotal: formatPercent(r.total / totalStaffCost, true),
        }))}
        columns={[
          { header: 'Role', key: 'role', format: 'text' },
          { header: 'Annual Cost', key: 'annualCost', format: 'currency' },
          { header: 'Salary', key: 'salary', format: 'currency' },
          { header: 'NIC', key: 'nic', format: 'currency' },
          { header: 'Pension', key: 'pension', format: 'currency' },
          { header: 'Accounts', key: 'accounts', format: 'number' },
          { header: '% of Total', key: 'percentOfTotal', format: 'percentage' },
        ]}
        filename="staff-costs"
        title="Staff Cost Analysis"
        subtitle={`Total: ${formatCurrencyCompact(totalStaffCost)} · ${activeRoles} roles · On-cost ratio: ${formatPercent(employerOnCostRatio)}`}
      />
      </div>

      <NumberLegend />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Wallet className="h-4 w-4" />
            Total Staff Costs (12mo)
          </div>
          <p className="text-2xl font-bold">{formatCurrencyCompact(totalStaffCost)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrencyCompact(totalStaffCost / 12)}/month average
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            {momChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-emerald-500" />
            )}
            Latest Month
          </div>
          <p className="text-2xl font-bold">{formatCurrencyCompact(lastMonthTotal)}</p>
          <p className={cn('text-xs mt-1 font-medium', momChange >= 0 ? 'text-red-600' : 'text-emerald-600')}>
            {momChange >= 0 ? '+' : ''}{formatPercent(momChange)} MoM
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            Active Roles
          </div>
          <p className="text-2xl font-bold">{activeRoles}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Roles with payroll in latest month
          </p>
        </div>

        <div className={cn(
          'rounded-xl border p-5',
          employerOnCostRatio > 25 ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-card'
        )}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Building2 className="h-4 w-4" />
            Employer On-Costs
          </div>
          <p className="text-2xl font-bold">{formatPercent(employerOnCostRatio)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            NIC {formatCurrencyCompact(totalNIC)} + Pension {formatCurrencyCompact(totalPension)}
          </p>
        </div>
      </div>

      {/* Staff-to-Revenue Banner */}
      {totalRevenue > 0 && (
        <div className={cn(
          'rounded-xl border p-4 flex items-center justify-between',
          staffToRevenue > 50 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
            : staffToRevenue > 35 ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
        )}>
          <div>
            <p className="text-sm font-medium">Staff Cost as % of Revenue</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {staffToRevenue > 50
                ? 'Critical — staff costs exceed 50% of revenue'
                : staffToRevenue > 35
                  ? 'Elevated — staff costs are 35-50% of revenue'
                  : 'Healthy — staff costs below 35% of revenue'}
            </p>
          </div>
          <p className={cn(
            'text-3xl font-bold',
            staffToRevenue > 50 ? 'text-red-600'
              : staffToRevenue > 35 ? 'text-amber-600'
                : 'text-emerald-600'
          )}>
            {formatPercent(staffToRevenue)}
          </p>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Distribution Pie */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Cost by Role</h2>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rolesPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${(name ?? '').length > 14 ? (name ?? '').substring(0, 14) + '…' : (name ?? '')} ${formatPercent(percent ?? 0, true)}`
                  }
                  labelLine={{ strokeWidth: 1 }}
                >
                  {rolesPieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Cost']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Components Pie */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Cost Components</h2>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={componentPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name ?? ''} ${formatPercent(percent ?? 0, true)}`}
                  labelLine={{ strokeWidth: 1 }}
                >
                  {componentPieData.map((_, i) => (
                    <Cell key={i} fill={componentColors[i % componentColors.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Amount']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Staff Cost Trend (Stacked Area) */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Monthly Staff Cost Trend</h2>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ left: 10, right: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis tickFormatter={chartAxisFormatter()} tick={{ fontSize: 10, fill: '#6b7280' }} />
              <RechartsTooltip
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    salaries: 'Salaries',
                    nic: 'Employer NIC',
                    pension: 'Pension',
                    other: 'Other',
                  };
                  return [formatCurrency(Number(value ?? 0)), labels[String(name)] ?? String(name)];
                }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Area type="monotone" dataKey="salaries" stackId="staff" fill="#7c3aed" fillOpacity={0.7} stroke="#7c3aed" />
              <Area type="monotone" dataKey="nic" stackId="staff" fill="#ef4444" fillOpacity={0.7} stroke="#ef4444" />
              <Area type="monotone" dataKey="pension" stackId="staff" fill="#06b6d4" fillOpacity={0.7} stroke="#06b6d4" />
              <Area type="monotone" dataKey="other" stackId="staff" fill="#f59e0b" fillOpacity={0.7} stroke="#f59e0b" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Role Breakdown Over Time */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Staffing by Role Over Time</h2>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roleBarData} margin={{ left: 10, right: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis tickFormatter={chartAxisFormatter()} tick={{ fontSize: 10, fill: '#6b7280' }} />
              <RechartsTooltip
                formatter={(value) => [formatCurrency(Number(value ?? 0))]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              {roleBarNames.map((name, i) => (
                <Bar key={name} dataKey={name} stackId="roles" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Role Detail Table */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Role Detail</h2>
        <div className="space-y-2">
          {roles.map((role) => (
            <div key={role.roleId} className="border rounded-lg">
              <button
                onClick={() => setExpandedRole(expandedRole === role.roleId ? null : role.roleId)}
                className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedRole === role.roleId ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{role.roleName}</span>
                  <span className="text-xs text-muted-foreground">
                    ({role.accounts.length} account{role.accounts.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-muted-foreground">
                    {totalStaffCost > 0 ? formatPercent(role.total / totalStaffCost, true) : '0%'}
                  </span>
                  <span
                    className="font-semibold w-24 text-right cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDrill({
                        type: 'custom',
                        title: role.roleName,
                        subtitle: `${formatCurrency(role.total)} — ${role.accounts.length} account${role.accounts.length !== 1 ? 's' : ''}`,
                        rows: [
                          { label: 'Salary', value: formatCurrency(role.salaryTotal) },
                          { label: 'Employer NIC', value: formatCurrency(role.nicTotal) },
                          { label: 'Pension', value: formatCurrency(role.pensionTotal) },
                          { label: 'Total Role Cost', value: formatCurrency(role.total) },
                          { label: '% of Total Staff Cost', value: totalStaffCost > 0 ? formatPercent(role.total / totalStaffCost, true) : '0%' },
                          ...role.accounts.sort((a, b) => b.total - a.total).map((a) => ({
                            label: a.accountName,
                            value: formatCurrency(a.total),
                            sublabel: `${a.accountCode} — ${a.costType}`,
                          })),
                        ],
                      });
                    }}
                  >
                    {formatCurrencyCompact(role.total)}
                  </span>
                </div>
              </button>

              {expandedRole === role.roleId && (
                <div className="px-6 pb-4 border-t">
                  {/* Cost breakdown bar */}
                  <div className="flex gap-1 h-3 mt-3 mb-3 rounded-full overflow-hidden bg-muted">
                    {role.salaryTotal > 0 && (
                      <div
                        className="bg-purple-500 rounded-l-full"
                        style={{ width: `${(role.salaryTotal / role.total) * 100}%` }}
                        title={`Salary: ${formatCurrency(role.salaryTotal)}`}
                      />
                    )}
                    {role.nicTotal > 0 && (
                      <div
                        className="bg-red-400"
                        style={{ width: `${(role.nicTotal / role.total) * 100}%` }}
                        title={`NIC: ${formatCurrency(role.nicTotal)}`}
                      />
                    )}
                    {role.pensionTotal > 0 && (
                      <div
                        className="bg-cyan-400 rounded-r-full"
                        style={{ width: `${(role.pensionTotal / role.total) * 100}%` }}
                        title={`Pension: ${formatCurrency(role.pensionTotal)}`}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Salary</p>
                      <p className="font-medium">{formatCurrency(role.salaryTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Employer NIC</p>
                      <p className="font-medium">{formatCurrency(role.nicTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pension</p>
                      <p className="font-medium">{formatCurrency(role.pensionTotal)}</p>
                    </div>
                  </div>

                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1 px-2 text-left font-medium text-muted-foreground">Account</th>
                        <th className="py-1 px-2 text-left font-medium text-muted-foreground">Type</th>
                        <th className="py-1 px-2 text-right font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {role.accounts
                        .sort((a, b) => b.total - a.total)
                        .map((acct) => (
                          <tr
                            key={acct.accountId}
                            className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              openDrill({
                                type: 'custom',
                                title: acct.accountName,
                                subtitle: `${acct.accountCode} — ${role.roleName}`,
                                rows: [
                                  { label: 'Account Code', value: acct.accountCode },
                                  { label: 'Role', value: role.roleName },
                                  { label: 'Cost Type', value: acct.costType.charAt(0).toUpperCase() + acct.costType.slice(1) },
                                  { label: 'Total (12mo)', value: formatCurrency(acct.total) },
                                  { label: '% of Role Cost', value: role.total > 0 ? formatPercent(acct.total / role.total, true) : '0%' },
                                  { label: '% of Total Staff', value: totalStaffCost > 0 ? formatPercent(acct.total / totalStaffCost, true) : '0%' },
                                ],
                              });
                            }}
                          >
                            <td className="py-1 px-2">
                              {acct.accountName}
                              <span className="text-muted-foreground ml-1">({acct.accountCode})</span>
                            </td>
                            <td className="py-1 px-2">
                              <span className={cn(
                                'px-1.5 py-0.5 rounded-full text-[10px]',
                                acct.costType === 'salary' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                  : acct.costType === 'nic' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                    : acct.costType === 'pension' ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                                      : 'bg-gray-100 text-gray-700'
                              )}>
                                {acct.costType}
                              </span>
                            </td>
                            <td className="py-1 px-2 text-right font-medium">{formatCurrency(acct.total)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
