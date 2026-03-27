'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Plus, Star, ArrowUpDown, Building2, TrendingUp,
  Package, Clock, Filter,
} from 'lucide-react';

/* ── types ── */
interface Supplier {
  id: string;
  name: string;
  category: string;
  rating: number;
  totalSpend: number;
  lastOrder: string;
  status: 'active' | 'inactive' | 'under-review';
  performance: {
    quality: number;
    delivery: number;
    priceCompetitiveness: number;
  };
}

/* ── mock data ── */
const suppliers: Supplier[] = [
  {
    id: 'SUP-001',
    name: 'TechFlow Solutions',
    category: 'IT & Software',
    rating: 4.8,
    totalSpend: 142000,
    lastOrder: '2024-03-25',
    status: 'active',
    performance: { quality: 95, delivery: 92, priceCompetitiveness: 88 },
  },
  {
    id: 'SUP-002',
    name: 'Meridian Consulting',
    category: 'Professional Services',
    rating: 4.5,
    totalSpend: 98000,
    lastOrder: '2024-03-24',
    status: 'active',
    performance: { quality: 90, delivery: 85, priceCompetitiveness: 78 },
  },
  {
    id: 'SUP-003',
    name: 'OfficeHub Ltd',
    category: 'Office Supplies',
    rating: 4.2,
    totalSpend: 34500,
    lastOrder: '2024-03-23',
    status: 'active',
    performance: { quality: 88, delivery: 95, priceCompetitiveness: 92 },
  },
  {
    id: 'SUP-004',
    name: 'DataSecure Pro',
    category: 'IT & Software',
    rating: 4.7,
    totalSpend: 76000,
    lastOrder: '2024-03-22',
    status: 'active',
    performance: { quality: 96, delivery: 90, priceCompetitiveness: 82 },
  },
  {
    id: 'SUP-005',
    name: 'GreenPrint Media',
    category: 'Marketing',
    rating: 3.9,
    totalSpend: 21000,
    lastOrder: '2024-03-15',
    status: 'under-review',
    performance: { quality: 75, delivery: 80, priceCompetitiveness: 90 },
  },
  {
    id: 'SUP-006',
    name: 'Apex Recruitment',
    category: 'Professional Services',
    rating: 4.3,
    totalSpend: 52000,
    lastOrder: '2024-03-20',
    status: 'active',
    performance: { quality: 85, delivery: 88, priceCompetitiveness: 75 },
  },
  {
    id: 'SUP-007',
    name: 'CleanSpace Facilities',
    category: 'Facilities',
    rating: 4.0,
    totalSpend: 28000,
    lastOrder: '2024-02-28',
    status: 'active',
    performance: { quality: 82, delivery: 90, priceCompetitiveness: 88 },
  },
  {
    id: 'SUP-008',
    name: 'SwiftLogistics UK',
    category: 'Logistics',
    rating: 3.6,
    totalSpend: 15000,
    lastOrder: '2024-01-10',
    status: 'inactive',
    performance: { quality: 70, delivery: 65, priceCompetitiveness: 85 },
  },
];

const categories = ['All', 'IT & Software', 'Professional Services', 'Office Supplies', 'Marketing', 'Facilities', 'Logistics'];

const statusStyles: Record<Supplier['status'], string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-gray-50 text-gray-500 border-gray-200',
  'under-review': 'bg-amber-50 text-amber-700 border-amber-200',
};

const fmt = (v: number) =>
  `£${v.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color =
    score >= 85 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-700">{score}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'text-gray-200'
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-gray-600">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'spend' | 'rating'>('name');

  const filtered = suppliers
    .filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'spend') return b.totalSpend - a.totalSpend;
      if (sortBy === 'rating') return b.rating - a.rating;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* Sample Data Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>SAMPLE DATA</strong> &mdash; Connect your procurement system to see
        real supplier data.
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Supplier Management
          </h1>
          <p className="mt-1 text-gray-500">
            Track, evaluate, and manage your supplier relationships.
          </p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Supplier
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Add New Supplier</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Company Name</label>
                <Input placeholder="Enter supplier name" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Contact Email</label>
                <Input type="email" placeholder="supplier@example.com" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Contact Phone</label>
                <Input type="tel" placeholder="+44 20 1234 5678" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Address</label>
                <Input placeholder="Company address" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  placeholder="Additional notes about this supplier..."
                />
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                Save Supplier
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <Filter className="mr-1.5 h-4 w-4 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'name' | 'spend' | 'rating')}>
            <SelectTrigger className="w-40">
              <ArrowUpDown className="mr-1.5 h-4 w-4 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="spend">Total Spend</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Supplier Directory Table */}
      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Supplier</th>
                  <th className="pb-3 pr-4 font-medium hidden md:table-cell">Category</th>
                  <th className="pb-3 pr-4 font-medium">Rating</th>
                  <th className="pb-3 pr-4 font-medium text-right">Total Spend</th>
                  <th className="pb-3 pr-4 font-medium hidden lg:table-cell">Last Order</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">
                          {s.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600 hidden md:table-cell">{s.category}</td>
                    <td className="py-3 pr-4"><StarRating rating={s.rating} /></td>
                    <td className="py-3 pr-4 text-right font-medium text-gray-900">{fmt(s.totalSpend)}</td>
                    <td className="py-3 pr-4 text-gray-500 hidden lg:table-cell">{s.lastOrder}</td>
                    <td className="py-3 pr-4">
                      <Badge className={statusStyles[s.status]} variant="outline">
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              No suppliers match your search criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Scores */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Supplier Performance Scores</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers
            .filter((s) => s.status === 'active')
            .slice(0, 6)
            .map((s) => (
              <Card key={s.id}>
                <CardContent className="pt-0">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{s.name}</span>
                    </div>
                    <StarRating rating={s.rating} />
                  </div>
                  <div className="space-y-2.5">
                    <ScoreBar score={s.performance.quality} label="Quality" />
                    <ScoreBar score={s.performance.delivery} label="Delivery" />
                    <ScoreBar score={s.performance.priceCompetitiveness} label="Price Competitiveness" />
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
