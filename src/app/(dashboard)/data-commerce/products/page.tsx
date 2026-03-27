'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PackageOpen, Plus, Search, Filter,
  BarChart3, Clock, Users, PoundSterling,
  X,
} from 'lucide-react';

/* ── Types ── */
type ProductStatus = 'active' | 'draft' | 'paused';
type ProductType = 'Industry Benchmarks' | 'Market Intelligence' | 'Anonymised Trends' | 'Custom Reports';

interface DataProduct {
  id: string;
  name: string;
  description: string;
  type: ProductType;
  dataSources: string[];
  updateFrequency: string;
  price: string;
  subscribers: number;
  status: ProductStatus;
}

/* ── Mock data ── */
const products: DataProduct[] = [
  {
    id: '1',
    name: 'SaaS Benchmarks Pack',
    description: 'Comprehensive SaaS performance benchmarks across 15 industry verticals with quarterly updates.',
    type: 'Industry Benchmarks',
    dataSources: ['Xero', 'Stripe', 'Internal Analytics'],
    updateFrequency: 'Quarterly',
    price: '£299/mo',
    subscribers: 312,
    status: 'active',
  },
  {
    id: '2',
    name: 'Market Intelligence Feed',
    description: 'Real-time market signals and competitive insights from aggregated financial data.',
    type: 'Market Intelligence',
    dataSources: ['Public Markets', 'Company Filings', 'News API'],
    updateFrequency: 'Daily',
    price: '£149/mo',
    subscribers: 198,
    status: 'active',
  },
  {
    id: '3',
    name: 'Anonymised Spending Trends',
    description: 'Aggregated and anonymised spending patterns across thousands of SMEs in the UK.',
    type: 'Anonymised Trends',
    dataSources: ['Xero', 'QuickBooks', 'Bank Feeds'],
    updateFrequency: 'Weekly',
    price: '£199/mo',
    subscribers: 156,
    status: 'active',
  },
  {
    id: '4',
    name: 'Custom CFO Analytics',
    description: 'Tailored financial analytics package built for enterprise CFO requirements.',
    type: 'Custom Reports',
    dataSources: ['All Connected Sources'],
    updateFrequency: 'On Demand',
    price: '£499/mo',
    subscribers: 89,
    status: 'active',
  },
  {
    id: '5',
    name: 'Startup Burn Rate Index',
    description: 'Anonymised burn rate data segmented by stage, sector, and geography.',
    type: 'Industry Benchmarks',
    dataSources: ['Xero', 'Stripe'],
    updateFrequency: 'Monthly',
    price: '£99/mo',
    subscribers: 0,
    status: 'draft',
  },
  {
    id: '6',
    name: 'Retail Spending Heatmap',
    description: 'Geographic and seasonal spending patterns in UK retail. Currently under review.',
    type: 'Anonymised Trends',
    dataSources: ['Bank Feeds', 'POS Data'],
    updateFrequency: 'Weekly',
    price: '£179/mo',
    subscribers: 42,
    status: 'paused',
  },
];

const statusStyles: Record<ProductStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  draft: 'bg-slate-50 text-slate-600 border-slate-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
};

const typeColours: Record<ProductType, string> = {
  'Industry Benchmarks': 'bg-blue-50 text-blue-700',
  'Market Intelligence': 'bg-violet-50 text-violet-700',
  'Anonymised Trends': 'bg-emerald-50 text-emerald-700',
  'Custom Reports': 'bg-amber-50 text-amber-700',
};

export default function DataProductsPage() {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ProductStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = products.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Products</h1>
          <p className="text-muted-foreground mt-1">
            Package your data into products that generate recurring revenue.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Product
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Products', value: products.length.toString(), icon: <PackageOpen className="h-4 w-4 text-emerald-600" /> },
          { label: 'Active', value: products.filter(p => p.status === 'active').length.toString(), icon: <BarChart3 className="h-4 w-4 text-blue-600" /> },
          { label: 'Total Subscribers', value: products.reduce((sum, p) => sum + p.subscribers, 0).toLocaleString(), icon: <Users className="h-4 w-4 text-violet-600" /> },
          { label: 'Monthly Revenue', value: '£48,200', icon: <PoundSterling className="h-4 w-4 text-amber-600" /> },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">{stat.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create product form */}
      {showForm && (
        <Card className="border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Create New Data Product</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. SaaS Revenue Benchmarks"
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Product Type</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option>Industry Benchmarks</option>
                  <option>Market Intelligence</option>
                  <option>Anonymised Trends</option>
                  <option>Custom Reports</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe what this data product includes and who it is for..."
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Update Frequency</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>On Demand</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Price (per month)</label>
                <input
                  type="text"
                  placeholder="£199"
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Save as Draft
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(['all', 'active', 'draft', 'paused'] as const).map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(s)}
              className={filterStatus === s ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Products table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Type</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Data Sources</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Frequency</th>
                  <th className="text-left p-3 font-medium">Price</th>
                  <th className="text-left p-3 font-medium">Subscribers</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {product.description}
                        </p>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <Badge variant="secondary" className={typeColours[product.type]}>
                        {product.type}
                      </Badge>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {product.dataSources.map((src) => (
                          <span key={src} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {src}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {product.updateFrequency}
                      </div>
                    </td>
                    <td className="p-3 font-medium">{product.price}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {product.subscribers.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={statusStyles[product.status]}>
                        {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No products match your filters. Try adjusting your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
