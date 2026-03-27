'use client';

import Link from 'next/link';
import {
  PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PoundSterling, Users, ShoppingCart, ClipboardCheck,
  ArrowUpRight, ArrowDownRight, TrendingUp, Eye,
} from 'lucide-react';

/* ── colour palette ── */
const COLORS = {
  emerald: '#10b981',
  blue: '#3b82f6',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  slate: '#64748b',
};

const PIE_COLORS = [COLORS.emerald, COLORS.blue, COLORS.violet, COLORS.amber, COLORS.cyan, COLORS.rose];

const fmt = (v: number) =>
  `£${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

/* ── KPI data ── */
interface KpiCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}

const kpis: KpiCard[] = [
  {
    label: 'Total Spend (MTD)',
    value: '£284,500',
    change: '+8.2% vs last month',
    trend: 'up',
    icon: <PoundSterling className="h-5 w-5 text-emerald-600" />,
  },
  {
    label: 'Active Suppliers',
    value: '47',
    change: '+3 this quarter',
    trend: 'up',
    icon: <Users className="h-5 w-5 text-blue-600" />,
  },
  {
    label: 'Open POs',
    value: '23',
    change: '5 due this week',
    trend: 'up',
    icon: <ShoppingCart className="h-5 w-5 text-violet-600" />,
  },
  {
    label: 'Pending Approvals',
    value: '8',
    change: '3 high priority',
    trend: 'down',
    icon: <ClipboardCheck className="h-5 w-5 text-amber-600" />,
  },
];

/* ── Spend by category ── */
const spendByCategory = [
  { name: 'IT & Software', value: 82000 },
  { name: 'Professional Services', value: 64000 },
  { name: 'Office Supplies', value: 38000 },
  { name: 'Marketing', value: 45000 },
  { name: 'Facilities', value: 32000 },
  { name: 'Travel', value: 23500 },
];

/* ── Spend trend (last 12 months) ── */
const spendTrend = [
  { month: 'Apr', spend: 245000 },
  { month: 'May', spend: 258000 },
  { month: 'Jun', spend: 271000 },
  { month: 'Jul', spend: 262000 },
  { month: 'Aug', spend: 248000 },
  { month: 'Sep', spend: 265000 },
  { month: 'Oct', spend: 278000 },
  { month: 'Nov', spend: 295000 },
  { month: 'Dec', spend: 252000 },
  { month: 'Jan', spend: 268000 },
  { month: 'Feb', spend: 275000 },
  { month: 'Mar', spend: 284500 },
];

/* ── Recent purchase orders ── */
interface PurchaseOrder {
  id: string;
  supplier: string;
  description: string;
  amount: number;
  status: 'approved' | 'pending' | 'delivered' | 'in-transit';
  date: string;
}

const recentPOs: PurchaseOrder[] = [
  { id: 'PO-2024-0147', supplier: 'TechFlow Solutions', description: 'Cloud hosting (Q2)', amount: 18500, status: 'approved', date: '2024-03-25' },
  { id: 'PO-2024-0146', supplier: 'Meridian Consulting', description: 'Strategy review engagement', amount: 12000, status: 'pending', date: '2024-03-24' },
  { id: 'PO-2024-0145', supplier: 'OfficeHub Ltd', description: 'Ergonomic desks x15', amount: 8750, status: 'in-transit', date: '2024-03-23' },
  { id: 'PO-2024-0144', supplier: 'DataSecure Pro', description: 'Security audit (annual)', amount: 22000, status: 'delivered', date: '2024-03-22' },
  { id: 'PO-2024-0143', supplier: 'GreenPrint Media', description: 'Marketing collateral print run', amount: 4200, status: 'approved', date: '2024-03-21' },
  { id: 'PO-2024-0142', supplier: 'Apex Recruitment', description: 'Contractor placement fee', amount: 6500, status: 'pending', date: '2024-03-20' },
];

const statusColors: Record<PurchaseOrder['status'], string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  delivered: 'bg-blue-50 text-blue-700 border-blue-200',
  'in-transit': 'bg-violet-50 text-violet-700 border-violet-200',
};

/* ── Custom tooltip for pie ── */
function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-gray-600">{fmt(payload[0].value)}</p>
    </div>
  );
}

export default function ProcurementOverviewPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* Sample Data Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>SAMPLE DATA</strong> &mdash; Connect your procurement system to see
        real figures.
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Procurement Overview
          </h1>
          <p className="mt-1 text-gray-500">
            Monitor spend, supplier activity, and purchase orders at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/procurement/spend"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <TrendingUp className="h-4 w-4" />
            Spend Analytics
          </Link>
          <Link
            href="/procurement/rfq"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            <ShoppingCart className="h-4 w-4" />
            New RFQ
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-gray-50 p-2">{kpi.icon}</div>
                {kpi.trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="mt-3">
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{kpi.value}</p>
                <p className="mt-1 text-xs text-gray-400">{kpi.change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Spend by Category Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Spend by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {spendByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-gray-600">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Spend Trend Line */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spend Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                    tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v) => fmt(Number(v ?? 0))}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="spend"
                    stroke={COLORS.emerald}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: COLORS.emerald }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Purchase Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Purchase Orders</CardTitle>
          <Link
            href="/procurement/approvals"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            <Eye className="h-4 w-4" />
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">PO Number</th>
                  <th className="pb-3 pr-4 font-medium">Supplier</th>
                  <th className="pb-3 pr-4 font-medium hidden sm:table-cell">Description</th>
                  <th className="pb-3 pr-4 font-medium text-right">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPOs.map((po) => (
                  <tr key={po.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="py-3 pr-4 font-mono text-xs font-medium text-gray-900">{po.id}</td>
                    <td className="py-3 pr-4 text-gray-700">{po.supplier}</td>
                    <td className="py-3 pr-4 text-gray-500 hidden sm:table-cell">{po.description}</td>
                    <td className="py-3 pr-4 text-right font-medium text-gray-900">{fmt(po.amount)}</td>
                    <td className="py-3 pr-4">
                      <Badge className={statusColors[po.status]} variant="outline">
                        {po.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-500 hidden md:table-cell">{po.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
