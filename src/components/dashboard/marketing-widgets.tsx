'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatPence } from '@/lib/formatting/currency';

// === Mock Marketing Data (demo mode only) ===

interface MetricCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'flat';
  period: string;
}

const socialMetrics: MetricCard[] = [
  { label: 'Instagram Followers', value: '58.4K', change: '+4.2%', trend: 'up', period: 'this month' },
  { label: 'Pinterest Saves', value: '12.3K', change: '+18.5%', trend: 'up', period: 'this month' },
  { label: 'Website Sessions', value: '8,240', change: '+7.1%', trend: 'up', period: 'this month' },
  { label: 'Engagement Rate', value: '8.7%', change: '+0.9pp', trend: 'up', period: 'vs last month' },
];

interface FunnelStage {
  label: string;
  count: number;
  value: string;
  conversionRate: string;
  color: string;
}

const leadFunnel: FunnelStage[] = [
  { label: 'Website Visitors', count: 8240, value: '8,240', conversionRate: '100%', color: 'bg-blue-100 text-blue-800' },
  { label: 'Enquiries', count: 124, value: '124', conversionRate: '1.5%', color: 'bg-indigo-100 text-indigo-800' },
  { label: 'Consultations Booked', count: 42, value: '42', conversionRate: '33.9%', color: 'bg-purple-100 text-purple-800' },
  { label: 'Proposals Sent', count: 28, value: '28', conversionRate: '66.7%', color: 'bg-violet-100 text-violet-800' },
  { label: 'Orders Confirmed', count: 14, value: '14', conversionRate: '50.0%', color: 'bg-emerald-100 text-emerald-800' },
];

interface CampaignROI {
  name: string;
  spend: number;
  revenue: number;
  roi: number;
  status: 'active' | 'completed' | 'paused';
}

const campaigns: CampaignROI[] = [
  { name: 'Spring Trunk Show Email', spend: 45000, revenue: 1250000, roi: 2678, status: 'active' },
  { name: 'Instagram Celestial Collection', spend: 85000, revenue: 340000, roi: 300, status: 'active' },
  { name: 'Google Ads: Bespoke Bridal', spend: 120000, revenue: 480000, roi: 300, status: 'active' },
  { name: 'Pinterest Bridal Boards', spend: 35000, revenue: 95000, roi: 171, status: 'active' },
  { name: 'Bridal Fashion Week PR', spend: 200000, revenue: 620000, roi: 210, status: 'completed' },
];

interface ChannelMetric {
  channel: string;
  sessions: number;
  leads: number;
  conversionRate: string;
  costPerLead: string;
}

const channelPerformance: ChannelMetric[] = [
  { channel: 'Instagram', sessions: 3200, leads: 48, conversionRate: '1.5%', costPerLead: '£18' },
  { channel: 'Google Search', sessions: 2100, leads: 32, conversionRate: '1.5%', costPerLead: '£38' },
  { channel: 'Pinterest', sessions: 1400, leads: 18, conversionRate: '1.3%', costPerLead: '£19' },
  { channel: 'Direct / Referral', sessions: 980, leads: 16, conversionRate: '1.6%', costPerLead: '£0' },
  { channel: 'Email', sessions: 560, leads: 10, conversionRate: '1.8%', costPerLead: '£4' },
];

export function MarketingDashboard() {
  return (
    <div className="space-y-6">
      {/* Social Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {socialMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums">{metric.value}</span>
                <span className={cn(
                  'text-xs font-medium',
                  metric.trend === 'up' && 'text-emerald-600',
                  metric.trend === 'down' && 'text-red-600',
                  metric.trend === 'flat' && 'text-muted-foreground',
                )}>
                  {metric.change}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{metric.period}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leadFunnel.map((stage, idx) => {
              const widthPct = Math.max(20, (stage.count / leadFunnel[0].count) * 100);
              return (
                <div key={stage.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stage.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-semibold">{stage.value}</span>
                      {idx > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {stage.conversionRate}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={cn('h-2 rounded-full transition-all', stage.color.split(' ')[0])}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Campaign ROI */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div key={campaign.name} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Spend: {formatPence(campaign.spend)} · Revenue: {formatPence(campaign.revenue)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs font-semibold',
                        campaign.roi >= 500 ? 'bg-emerald-100 text-emerald-800' :
                        campaign.roi >= 200 ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      )}
                    >
                      {campaign.roi}% ROI
                    </Badge>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channel Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Channel</th>
                  <th className="pb-2 font-medium text-right">Sessions</th>
                  <th className="pb-2 font-medium text-right">Leads</th>
                  <th className="pb-2 font-medium text-right">Conversion</th>
                  <th className="pb-2 font-medium text-right">Cost / Lead</th>
                </tr>
              </thead>
              <tbody>
                {channelPerformance.map((ch) => (
                  <tr key={ch.channel} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">{ch.channel}</td>
                    <td className="py-2.5 text-right tabular-nums">{ch.sessions.toLocaleString()}</td>
                    <td className="py-2.5 text-right tabular-nums">{ch.leads}</td>
                    <td className="py-2.5 text-right tabular-nums">{ch.conversionRate}</td>
                    <td className="py-2.5 text-right tabular-nums">{ch.costPerLead}</td>
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
