import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Megaphone,
  TrendingUp,
  TrendingDown,
  Users,
  MousePointerClick,
  DollarSign,
  Share2,
  Search,
  Mail,
  ArrowRight,
  Eye,
  Target,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Marketing Overview | Grove',
  description: 'High-level marketing intelligence across all channels.',
};

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const topMetrics = [
  {
    label: 'Total Reach',
    value: '2.4M',
    change: '+12.3%',
    trend: 'up' as const,
    icon: Eye,
    detail: 'Across all channels this month',
  },
  {
    label: 'Engagement Rate',
    value: '4.7%',
    change: '+0.8%',
    trend: 'up' as const,
    icon: MousePointerClick,
    detail: 'Avg across organic channels',
  },
  {
    label: 'Conversion Rate',
    value: '3.2%',
    change: '-0.2%',
    trend: 'down' as const,
    icon: Target,
    detail: 'Visitor to customer',
  },
  {
    label: 'Customer Acq. Cost',
    value: '$42.18',
    change: '-$3.50',
    trend: 'up' as const,
    icon: DollarSign,
    detail: 'Blended CAC (lower is better)',
  },
  {
    label: 'ROAS',
    value: '4.6x',
    change: '+0.3x',
    trend: 'up' as const,
    icon: TrendingUp,
    detail: 'Return on ad spend',
  },
];

const channels = [
  {
    name: 'Organic Social',
    icon: Share2,
    metric: '187K reach',
    trend: '+18%',
    trendDir: 'up' as const,
    href: '/marketing/organic',
    description: 'Instagram, TikTok, LinkedIn, X, Facebook',
    highlight: 'Instagram Reels driving 62% of organic reach',
  },
  {
    name: 'Paid Ads',
    icon: Megaphone,
    metric: '$12,480 spend',
    trend: '4.6x ROAS',
    trendDir: 'up' as const,
    href: '/marketing/paid',
    description: 'Meta Ads, Google Ads, TikTok Ads',
    highlight: 'Google Search campaigns at 6.2x ROAS',
  },
  {
    name: 'SEO',
    icon: Search,
    metric: '34.2K visits',
    trend: '+24%',
    trendDir: 'up' as const,
    href: '/marketing/seo',
    description: 'Organic search traffic and rankings',
    highlight: '12 keywords now ranking in top 3',
  },
  {
    name: 'Email / Klaviyo',
    icon: Mail,
    metric: '28.4% open rate',
    trend: '+2.1%',
    trendDir: 'up' as const,
    href: '/marketing/content',
    description: 'Email campaigns and automations',
    highlight: 'Welcome flow at 42% conversion rate',
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MarketingOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Marketing Intelligence
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Performance snapshot across all marketing channels this month.
        </p>
      </header>

      {/* Top-level KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {topMetrics.map((m) => {
          const Icon = m.icon;
          const isPositive = m.trend === 'up';
          return (
            <Card key={m.label} className="relative overflow-hidden">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {m.label}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{m.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      isPositive ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {m.change}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">vs last month</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">{m.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Channel cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Channel Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((ch) => {
            const Icon = ch.icon;
            return (
              <Card
                key={ch.name}
                className="hover:border-emerald-500/40 transition-colors group"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-emerald-600" />
                      </div>
                      <CardTitle className="text-base">{ch.name}</CardTitle>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400"
                    >
                      {ch.trend}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-lg font-semibold">{ch.metric}</p>
                  <p className="text-xs text-muted-foreground">{ch.description}</p>
                  <div className="flex items-center gap-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-md px-3 py-2">
                    <TrendingUp className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">
                      {ch.highlight}
                    </span>
                  </div>
                  <Link href={ch.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 text-xs text-muted-foreground group-hover:text-emerald-600 transition-colors px-0"
                    >
                      View details <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
