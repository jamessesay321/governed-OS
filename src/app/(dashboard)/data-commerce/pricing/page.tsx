'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tag, Repeat, Download, Code, LayoutDashboard,
  Calculator, PoundSterling, Percent, Globe,
  ArrowRight, Check, Database,
} from 'lucide-react';

/* ── Pricing models ── */
interface PricingModel {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  recommended?: boolean;
}

const pricingModels: PricingModel[] = [
  {
    id: 'per-record',
    name: 'Per Record',
    description: 'Charge per data record accessed or downloaded. Best for high-volume transactional data.',
    icon: <Tag className="h-5 w-5 text-emerald-600" />,
    features: ['Usage-based billing', 'Volume discounts available', 'Real-time metering', 'Minimum commitment optional'],
  },
  {
    id: 'subscription',
    name: 'Subscription',
    description: 'Monthly or annual recurring access to data feeds. Predictable revenue stream.',
    icon: <Repeat className="h-5 w-5 text-blue-600" />,
    features: ['Predictable revenue', 'Tiered access levels', 'Auto-renewal', 'Usage caps per tier'],
    recommended: true,
  },
  {
    id: 'one-time',
    name: 'One-Time Purchase',
    description: 'Single payment for a specific dataset or report. Great for point-in-time analysis.',
    icon: <PoundSterling className="h-5 w-5 text-violet-600" />,
    features: ['No ongoing commitment', 'Version-specific access', 'Bulk purchase discounts', 'Instant delivery'],
  },
  {
    id: 'custom',
    name: 'Custom / Enterprise',
    description: 'Bespoke pricing for large buyers with specific requirements and SLA needs.',
    icon: <Calculator className="h-5 w-5 text-amber-600" />,
    features: ['Tailored SLAs', 'Custom data pipelines', 'Dedicated support', 'White-label options'],
  },
];

/* ── Distribution channels ── */
const channels = [
  {
    id: 'api',
    name: 'API Access',
    description: 'RESTful API with authentication, rate limiting, and real-time data feeds.',
    icon: <Code className="h-5 w-5 text-emerald-600" />,
    status: 'active' as const,
    subscribers: 423,
  },
  {
    id: 'download',
    name: 'File Download',
    description: 'CSV, JSON, and Excel exports with scheduled delivery and secure download links.',
    icon: <Download className="h-5 w-5 text-blue-600" />,
    status: 'active' as const,
    subscribers: 289,
  },
  {
    id: 'embed',
    name: 'Dashboard Embed',
    description: 'Embeddable charts and dashboards for client portals with iframe and SDK options.',
    icon: <LayoutDashboard className="h-5 w-5 text-violet-600" />,
    status: 'beta' as const,
    subscribers: 135,
  },
];

const channelStatusStyles = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  beta: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function PricingPage() {
  const [revenueInput, setRevenueInput] = useState(50000);
  const [sharePercent, setSharePercent] = useState(15);
  const partnerShare = Math.round(revenueInput * (sharePercent / 100));
  const yourShare = revenueInput - partnerShare;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pricing & Distribution</h1>
        <p className="text-muted-foreground mt-1">
          Configure how your data products are priced, shared, and delivered to buyers.
        </p>
      </div>

      {/* Pricing models */}
      <div>
        <h2 className="text-base font-semibold mb-3">Pricing Models</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pricingModels.map((model) => (
            <Card
              key={model.id}
              className={`relative ${model.recommended ? 'border-emerald-300 shadow-md' : ''}`}
            >
              {model.recommended && (
                <div className="absolute -top-2.5 left-4">
                  <Badge className="bg-emerald-600 text-white text-xs">Recommended</Badge>
                </div>
              )}
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-lg bg-muted p-2">{model.icon}</div>
                  <h3 className="text-sm font-semibold">{model.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{model.description}</p>
                <ul className="space-y-1.5">
                  {model.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs">
                      <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={model.recommended ? 'default' : 'outline'}
                  size="sm"
                  className={`w-full mt-4 ${model.recommended ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                >
                  Configure
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Revenue sharing calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Percent className="h-4 w-4 text-emerald-600" />
            Revenue Sharing Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Monthly Data Revenue: {`£${revenueInput.toLocaleString()}`}
                </label>
                <input
                  type="range"
                  min={1000}
                  max={200000}
                  step={1000}
                  value={revenueInput}
                  onChange={(e) => setRevenueInput(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>£1,000</span>
                  <span>£200,000</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Partner Revenue Share: {sharePercent}%
                </label>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={1}
                  value={sharePercent}
                  onChange={(e) => setSharePercent(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5%</span>
                  <span>50%</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3">
              <div className="rounded-lg border p-4 bg-emerald-50/50">
                <p className="text-xs text-muted-foreground mb-1">Your Revenue</p>
                <p className="text-2xl font-bold text-emerald-700">£{yourShare.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{100 - sharePercent}% of total</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground mb-1">Partner Revenue</p>
                <p className="text-xl font-bold">£{partnerShare.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{sharePercent}% of total</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribution channels */}
      <div>
        <h2 className="text-base font-semibold mb-3">Distribution Channels</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {channels.map((channel) => (
            <Card key={channel.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2">{channel.icon}</div>
                    <h3 className="text-sm font-semibold">{channel.name}</h3>
                  </div>
                  <Badge variant="outline" className={channelStatusStyles[channel.status]}>
                    {channel.status === 'beta' ? 'Beta' : 'Active'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{channel.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {channel.subscribers} active subscribers
                  </span>
                  <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
                    Manage <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Marketplace listing preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600" />
            Marketplace Listing Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/20 p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Database className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Grove Data Products</h3>
                    <p className="text-xs text-muted-foreground">by Your Company</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  High-quality, anonymised financial benchmarks and market intelligence
                  powered by aggregated SME data across the UK.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Financial Data', 'Benchmarks', 'UK Market', 'Real-time'].map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="sm:w-48 flex flex-col justify-center items-center sm:items-end gap-2 sm:border-l sm:pl-6">
                <p className="text-xs text-muted-foreground">Starting from</p>
                <p className="text-2xl font-bold text-emerald-700">£99<span className="text-sm font-normal">/mo</span></p>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                  Edit Listing
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
