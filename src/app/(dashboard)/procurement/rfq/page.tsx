'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileText, Send, Clock, Award, Plus, Sparkles,
  CheckCircle2, XCircle, ArrowRight, Users, Calendar,
} from 'lucide-react';

/* ── types ── */
type RfqStatus = 'draft' | 'sent' | 'received' | 'awarded';

interface RfqItem {
  id: string;
  item: string;
  quantity: number;
  status: RfqStatus;
  responses: number;
  deadline: string;
  createdAt: string;
  preferredSuppliers: string[];
}

interface QuoteComparison {
  supplier: string;
  unitPrice: number;
  leadTime: string;
  warranty: string;
  rating: number;
  recommended: boolean;
}

/* ── mock data ── */
const activeRfqs: RfqItem[] = [
  {
    id: 'RFQ-2024-042',
    item: 'Cloud Infrastructure Migration Services',
    quantity: 1,
    status: 'received',
    responses: 4,
    deadline: '2024-04-05',
    createdAt: '2024-03-15',
    preferredSuppliers: ['TechFlow Solutions', 'DataSecure Pro'],
  },
  {
    id: 'RFQ-2024-041',
    item: 'Ergonomic Office Chairs (Bulk)',
    quantity: 50,
    status: 'sent',
    responses: 2,
    deadline: '2024-04-10',
    createdAt: '2024-03-18',
    preferredSuppliers: ['OfficeHub Ltd'],
  },
  {
    id: 'RFQ-2024-040',
    item: 'Annual Cybersecurity Audit',
    quantity: 1,
    status: 'awarded',
    responses: 3,
    deadline: '2024-03-28',
    createdAt: '2024-03-10',
    preferredSuppliers: ['DataSecure Pro', 'CyberShield UK'],
  },
  {
    id: 'RFQ-2024-039',
    item: 'Marketing Video Production',
    quantity: 5,
    status: 'draft',
    responses: 0,
    deadline: '2024-04-15',
    createdAt: '2024-03-22',
    preferredSuppliers: ['GreenPrint Media'],
  },
  {
    id: 'RFQ-2024-038',
    item: 'Employee Training Platform Licence',
    quantity: 200,
    status: 'received',
    responses: 5,
    deadline: '2024-04-01',
    createdAt: '2024-03-08',
    preferredSuppliers: ['LearnPro UK', 'SkillBridge'],
  },
];

const quoteComparison: QuoteComparison[] = [
  {
    supplier: 'TechFlow Solutions',
    unitPrice: 45000,
    leadTime: '4 weeks',
    warranty: '12 months',
    rating: 4.8,
    recommended: true,
  },
  {
    supplier: 'CloudNine Services',
    unitPrice: 52000,
    leadTime: '3 weeks',
    warranty: '6 months',
    rating: 4.2,
    recommended: false,
  },
  {
    supplier: 'DataSecure Pro',
    unitPrice: 48500,
    leadTime: '5 weeks',
    warranty: '12 months',
    rating: 4.7,
    recommended: false,
  },
  {
    supplier: 'NexGen IT',
    unitPrice: 41000,
    leadTime: '6 weeks',
    warranty: '3 months',
    rating: 3.9,
    recommended: false,
  },
];

const statusConfig: Record<RfqStatus, { color: string; icon: React.ReactNode }> = {
  draft: {
    color: 'bg-gray-50 text-gray-600 border-gray-200',
    icon: <FileText className="h-3.5 w-3.5" />,
  },
  sent: {
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Send className="h-3.5 w-3.5" />,
  },
  received: {
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  awarded: {
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: <Award className="h-3.5 w-3.5" />,
  },
};

const fmt = (v: number) =>
  `£${v.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

/* ── Suggested suppliers (AI placeholder) ── */
const aiSuggestions = [
  { name: 'TechFlow Solutions', reason: 'Highest quality score, strong track record with IT projects', match: 95 },
  { name: 'DataSecure Pro', reason: 'Competitive pricing, specialist in cloud security', match: 88 },
  { name: 'CloudNine Services', reason: 'Fastest delivery times, good reviews', match: 82 },
];

export default function RfqPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'rfqs' | 'compare'>('rfqs');

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* Sample Data Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>SAMPLE DATA</strong> &mdash; Connect your procurement system to manage
        real RFQs.
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Request for Quote
          </h1>
          <p className="mt-1 text-gray-500">
            Create, track, and compare supplier quotes for procurement needs.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Create RFQ
        </Button>
      </div>

      {/* Create RFQ Form */}
      {showCreateForm && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              New Request for Quote
            </CardTitle>
            <CardDescription>Fill in the details below to create a new RFQ.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Item Description
                </label>
                <Input placeholder="Describe the item or service required" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <Input type="number" placeholder="1" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Response Deadline
                </label>
                <Input type="date" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it">IT &amp; Software</SelectItem>
                    <SelectItem value="services">Professional Services</SelectItem>
                    <SelectItem value="office">Office Supplies</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="facilities">Facilities</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Preferred Suppliers (optional)
                </label>
                <Input placeholder="TechFlow Solutions, DataSecure Pro" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Additional Requirements
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  placeholder="Any specific requirements, certifications, or terms..."
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Send className="mr-1.5 h-4 w-4" />
                Send RFQ
              </Button>
              <Button variant="outline">Save as Draft</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Toggle */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setActiveTab('rfqs')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'rfqs'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Active RFQs
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'compare'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Compare Quotes
        </button>
      </div>

      {/* Active RFQs Table */}
      {activeTab === 'rfqs' && (
        <Card>
          <CardHeader>
            <CardTitle>Active RFQs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">RFQ ID</th>
                    <th className="pb-3 pr-4 font-medium">Item</th>
                    <th className="pb-3 pr-4 font-medium hidden sm:table-cell">Qty</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium hidden md:table-cell">Responses</th>
                    <th className="pb-3 pr-4 font-medium hidden lg:table-cell">Deadline</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRfqs.map((rfq) => (
                    <tr key={rfq.id} className="border-b last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 pr-4 font-mono text-xs font-medium text-gray-900">
                        {rfq.id}
                      </td>
                      <td className="py-3 pr-4 text-gray-700 max-w-[200px] truncate">
                        {rfq.item}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 hidden sm:table-cell">
                        {rfq.quantity}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={statusConfig[rfq.status].color} variant="outline">
                          <span className="mr-1">{statusConfig[rfq.status].icon}</span>
                          {rfq.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 hidden md:table-cell">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Users className="h-3.5 w-3.5" />
                          {rfq.responses}
                        </div>
                      </td>
                      <td className="py-3 pr-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-gray-500">
                          <Calendar className="h-3.5 w-3.5" />
                          {rfq.deadline}
                        </div>
                      </td>
                      <td className="py-3">
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          View <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compare Quotes */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote Comparison: Cloud Infrastructure Migration</CardTitle>
              <CardDescription>
                Comparing 4 responses for RFQ-2024-042
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {quoteComparison.map((quote) => (
                  <div
                    key={quote.supplier}
                    className={`rounded-xl border p-4 ${
                      quote.recommended
                        ? 'border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {quote.recommended && (
                      <Badge className="mb-2 bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">
                        <Award className="mr-1 h-3 w-3" />
                        Recommended
                      </Badge>
                    )}
                    <h4 className="font-semibold text-gray-900">{quote.supplier}</h4>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Unit Price</span>
                        <span className="font-medium text-gray-900">{fmt(quote.unitPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Lead Time</span>
                        <span className="text-gray-700">{quote.leadTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Warranty</span>
                        <span className="text-gray-700">{quote.warranty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Rating</span>
                        <span className="text-gray-700">{quote.rating}/5.0</span>
                      </div>
                    </div>
                    <Button
                      variant={quote.recommended ? 'default' : 'outline'}
                      size="sm"
                      className={`mt-3 w-full ${quote.recommended ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    >
                      {quote.recommended ? 'Award Quote' : 'Select'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Supplier Recommendations */}
      <Card className="border-violet-200 bg-violet-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            AI-Powered Supplier Recommendations
          </CardTitle>
          <CardDescription>
            Based on historical performance, pricing data, and project requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {aiSuggestions.map((suggestion) => (
              <div
                key={suggestion.name}
                className="flex items-center justify-between rounded-lg border border-violet-100 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-sm font-bold text-violet-600">
                    {suggestion.match}%
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{suggestion.name}</p>
                    <p className="text-xs text-gray-500">{suggestion.reason}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs">
                  Invite to RFQ
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-violet-500">
            Recommendations generated using historical procurement data and supplier performance metrics.
            This feature will improve as more data is collected.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
