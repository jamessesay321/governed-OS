'use client';

import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Database, Users, PoundSterling, ShieldCheck,
  ArrowUpRight, ArrowDownRight, PackageOpen, Scale, Tag,
} from 'lucide-react';

/* ── colour palette ── */
const COLORS = {
  emerald: '#10b981',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  amber: '#f59e0b',
};

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
    label: 'Data Products',
    value: '12',
    change: '+3 this quarter',
    trend: 'up',
    icon: <Database className="h-5 w-5 text-emerald-600" />,
  },
  {
    label: 'Active Subscribers',
    value: '847',
    change: '+12.4% vs last month',
    trend: 'up',
    icon: <Users className="h-5 w-5 text-blue-600" />,
  },
  {
    label: 'Monthly Revenue',
    value: '£48,200',
    change: '+18.7% vs last month',
    trend: 'up',
    icon: <PoundSterling className="h-5 w-5 text-violet-600" />,
  },
  {
    label: 'Data Quality Score',
    value: '94.2%',
    change: '-0.3% vs last month',
    trend: 'down',
    icon: <ShieldCheck className="h-5 w-5 text-amber-600" />,
  },
];

/* ── Revenue trend data ── */
const revenueData = [
  { month: 'Sep', revenue: 18400 },
  { month: 'Oct', revenue: 22100 },
  { month: 'Nov', revenue: 26800 },
  { month: 'Dec', revenue: 31200 },
  { month: 'Jan', revenue: 38500 },
  { month: 'Feb', revenue: 42900 },
  { month: 'Mar', revenue: 48200 },
];

const fmt = (v: number) =>
  `£${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

/* ── Quick links ── */
const quickLinks = [
  {
    href: '/data-commerce/products',
    label: 'Data Products',
    description: 'Manage and create data products for monetisation',
    icon: <PackageOpen className="h-5 w-5 text-emerald-600" />,
  },
  {
    href: '/data-commerce/compliance',
    label: 'GDPR Compliance',
    description: 'Review compliance status and audit trail',
    icon: <Scale className="h-5 w-5 text-blue-600" />,
  },
  {
    href: '/data-commerce/pricing',
    label: 'Pricing & Distribution',
    description: 'Configure pricing models and distribution channels',
    icon: <Tag className="h-5 w-5 text-violet-600" />,
  },
];

export default function DataCommerceOverviewPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Commerce</h1>
        <p className="text-muted-foreground mt-1">
          Package, price, and sell your data products while staying fully compliant.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                {kpi.icon}
              </div>
              <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
              <div className="mt-1 flex items-center gap-1 text-xs">
                {kpi.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-rose-500" />
                )}
                <span className={kpi.trend === 'up' ? 'text-emerald-600' : 'text-rose-500'}>
                  {kpi.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Data Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => fmt(v)} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.emerald}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: COLORS.emerald }}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Top Performing Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Industry Benchmarks Q1', subscribers: 312, revenue: '£18,720', growth: '+24%' },
              { name: 'Market Intelligence Feed', subscribers: 198, revenue: '£11,880', growth: '+15%' },
              { name: 'Anonymised Trend Reports', subscribers: 156, revenue: '£9,360', growth: '+31%' },
              { name: 'Custom Analytics Package', subscribers: 89, revenue: '£8,240', growth: '+8%' },
            ].map((product) => (
              <div
                key={product.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.subscribers} subscribers</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{product.revenue}</p>
                  <Badge variant="secondary" className="text-emerald-600 bg-emerald-50 text-xs">
                    {product.growth}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <div>
        <h2 className="text-base font-semibold mb-3">Quick Links</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    {link.icon}
                    <span className="text-sm font-semibold">{link.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
