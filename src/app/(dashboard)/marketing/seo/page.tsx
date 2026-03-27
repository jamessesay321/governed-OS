'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  Globe,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BarChart3,
  ExternalLink,
  Users,
  Sparkles,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface KeywordRanking {
  keyword: string;
  position: number;
  change: number;
  volume: number;
  url: string;
}

interface TopPage {
  url: string;
  title: string;
  traffic: number;
  trafficChange: string;
  keywords: number;
}

interface TechSEOItem {
  label: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
}

interface Competitor {
  name: string;
  da: number;
  keywords: number;
  traffic: string;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const domainAuthority = 42;
const totalKeywords = 1_284;
const organicTrafficEstimate = '34.2K';
const organicTrafficChange = '+24%';

const keywordRankings: KeywordRanking[] = [
  { keyword: 'small business financial software', position: 3, change: 2, volume: 2_400, url: '/products/finance' },
  { keyword: 'AI business intelligence tool', position: 5, change: -1, volume: 1_800, url: '/products/intelligence' },
  { keyword: 'CEO dashboard software', position: 2, change: 4, volume: 1_200, url: '/dashboard' },
  { keyword: 'business KPI tracking', position: 7, change: 0, volume: 3_100, url: '/products/kpi' },
  { keyword: 'automated financial reports', position: 4, change: 3, volume: 890, url: '/products/reports' },
  { keyword: 'SMB operating system', position: 11, change: 6, volume: 720, url: '/' },
  { keyword: 'business health score', position: 8, change: -2, volume: 540, url: '/products/health' },
  { keyword: 'investor data room software', position: 6, change: 1, volume: 980, url: '/products/investor-portal' },
  { keyword: 'scenario planning for startups', position: 14, change: 3, volume: 460, url: '/products/scenarios' },
  { keyword: 'grove business platform', position: 1, change: 0, volume: 1_600, url: '/' },
];

const topPages: TopPage[] = [
  { url: '/', title: 'Homepage', traffic: 8_420, trafficChange: '+18%', keywords: 142 },
  { url: '/products/finance', title: 'Financial Software', traffic: 4_890, trafficChange: '+32%', keywords: 98 },
  { url: '/blog/kpi-guide', title: 'Ultimate KPI Guide (Blog)', traffic: 3_210, trafficChange: '+45%', keywords: 67 },
  { url: '/products/intelligence', title: 'AI Intelligence', traffic: 2_780, trafficChange: '+28%', keywords: 54 },
  { url: '/pricing', title: 'Pricing', traffic: 2_340, trafficChange: '+12%', keywords: 38 },
];

const organicTrafficTrend = [
  { month: 'Oct', traffic: 18200 },
  { month: 'Nov', traffic: 21400 },
  { month: 'Dec', traffic: 19800 },
  { month: 'Jan', traffic: 24600 },
  { month: 'Feb', traffic: 28100 },
  { month: 'Mar', traffic: 34200 },
];

const techSEOChecklist: TechSEOItem[] = [
  { label: 'Core Web Vitals (LCP)', status: 'pass', detail: '1.8s - Good' },
  { label: 'Core Web Vitals (FID)', status: 'pass', detail: '45ms - Good' },
  { label: 'Core Web Vitals (CLS)', status: 'warning', detail: '0.12 - Needs improvement' },
  { label: 'Mobile Friendly', status: 'pass', detail: 'All pages pass mobile test' },
  { label: 'HTTPS', status: 'pass', detail: 'All pages served over HTTPS' },
  { label: 'XML Sitemap', status: 'pass', detail: 'Submitted and indexed' },
  { label: 'Robots.txt', status: 'pass', detail: 'Properly configured' },
  { label: 'Structured Data', status: 'warning', detail: '3 pages missing schema markup' },
  { label: 'Broken Links', status: 'fail', detail: '7 broken internal links found' },
  { label: 'Meta Descriptions', status: 'warning', detail: '12 pages missing meta descriptions' },
];

const competitors: Competitor[] = [
  { name: 'CompetitorA', da: 58, keywords: 3_420, traffic: '89K' },
  { name: 'CompetitorB', da: 45, keywords: 1_890, traffic: '42K' },
  { name: 'CompetitorC', da: 39, keywords: 1_120, traffic: '28K' },
  { name: 'Grove (You)', da: domainAuthority, keywords: totalKeywords, traffic: organicTrafficEstimate },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SEODashboardPage() {
  const statusIcon = (status: TechSEOItem['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          SEO Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track search rankings, organic traffic, and technical health.
        </p>
      </header>

      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Domain Authority
              </span>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{domainAuthority}</p>
            <p className="text-xs text-muted-foreground mt-1">Out of 100 (Moz scale)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total Keywords
              </span>
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{totalKeywords.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Ranking in top 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Organic Traffic
              </span>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{organicTrafficEstimate}</p>
              <span className="text-sm font-medium text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> {organicTrafficChange}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Monthly visits (estimated)</p>
          </CardContent>
        </Card>
      </div>

      {/* Organic traffic trend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Organic Traffic Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={organicTrafficTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [Number(value).toLocaleString(), 'Visits']}
                />
                <Line type="monotone" dataKey="traffic" stroke="#059669" strokeWidth={2} dot={{ fill: '#059669', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Keyword rankings table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Keyword Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs">Keyword</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs text-right">Position</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs text-right">Change</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs text-right">Volume</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs">URL</th>
                </tr>
              </thead>
              <tbody>
                {keywordRankings.map((kw, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4 font-medium">{kw.keyword}</td>
                    <td className="py-3 pr-4 text-right">
                      <Badge
                        variant="secondary"
                        className={
                          kw.position <= 3
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : kw.position <= 10
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                            : 'bg-gray-50 text-gray-600 dark:bg-gray-900/30'
                        }
                      >
                        #{kw.position}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span className="flex items-center justify-end gap-1">
                        {kw.change > 0 ? (
                          <>
                            <ArrowUp className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600 text-xs">+{kw.change}</span>
                          </>
                        ) : kw.change < 0 ? (
                          <>
                            <ArrowDown className="h-3 w-3 text-red-500" />
                            <span className="text-red-500 text-xs">{kw.change}</span>
                          </>
                        ) : (
                          <>
                            <Minus className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground text-xs">0</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">
                      {kw.volume.toLocaleString()}
                    </td>
                    <td className="py-3 text-xs text-muted-foreground font-mono">{kw.url}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top pages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Top Pages by Organic Traffic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPages.map((page, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{page.title}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{page.url}</p>
                </div>
                <div className="flex items-center gap-6 ml-4 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{page.traffic.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">visits/mo</p>
                  </div>
                  <span className="text-xs font-medium text-emerald-600">{page.trafficChange}</span>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{page.keywords} keywords</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Technical SEO Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Technical SEO Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {techSEOChecklist.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
              >
                {statusIcon(item.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Competitor Comparison */}
      <Card className="border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Competitor Comparison
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              Beta
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs">Domain</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs text-right">DA</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs text-right">Keywords</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Est. Traffic</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((comp, i) => (
                  <tr
                    key={i}
                    className={`border-b last:border-0 ${
                      comp.name.includes('Grove')
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold'
                        : 'hover:bg-muted/30'
                    } transition-colors`}
                  >
                    <td className="py-3 pr-4">{comp.name}</td>
                    <td className="py-3 pr-4 text-right">{comp.da}</td>
                    <td className="py-3 pr-4 text-right">{comp.keywords.toLocaleString()}</td>
                    <td className="py-3 text-right">{comp.traffic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Connect your SEMrush or Ahrefs account to get live competitor data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
