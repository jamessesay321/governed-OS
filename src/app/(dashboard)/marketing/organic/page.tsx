'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Instagram,
  Users,
  Eye,
  Heart,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Sparkles,
  CalendarDays,
  BarChart3,
  Share2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PlatformMetrics {
  followers: string;
  followersChange: string;
  engagementRate: string;
  engagementChange: string;
  reach: string;
  reachChange: string;
  impressions: string;
  impressionsChange: string;
  topPosts: { title: string; likes: number; comments: number; shares: number }[];
}

type PlatformKey = 'instagram' | 'tiktok' | 'linkedin' | 'twitter' | 'facebook';

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const platforms: Record<PlatformKey, { label: string; color: string; metrics: PlatformMetrics }> = {
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    metrics: {
      followers: '24.8K',
      followersChange: '+1,240',
      engagementRate: '5.2%',
      engagementChange: '+0.4%',
      reach: '98.3K',
      reachChange: '+22%',
      impressions: '312K',
      impressionsChange: '+18%',
      topPosts: [
        { title: 'Behind the scenes: Product launch', likes: 2840, comments: 189, shares: 342 },
        { title: 'Customer spotlight: Sarah M.', likes: 2210, comments: 156, shares: 287 },
        { title: '5 tips for better results', likes: 1980, comments: 234, shares: 412 },
      ],
    },
  },
  tiktok: {
    label: 'TikTok',
    color: '#000000',
    metrics: {
      followers: '18.2K',
      followersChange: '+3,120',
      engagementRate: '8.4%',
      engagementChange: '+1.2%',
      reach: '245K',
      reachChange: '+45%',
      impressions: '890K',
      impressionsChange: '+38%',
      topPosts: [
        { title: 'Day in the life at Grove', likes: 12400, comments: 890, shares: 2340 },
        { title: 'Product hack you need to try', likes: 8900, comments: 456, shares: 1890 },
        { title: 'Responding to comments pt. 3', likes: 6700, comments: 1230, shares: 980 },
      ],
    },
  },
  linkedin: {
    label: 'LinkedIn',
    color: '#0077B5',
    metrics: {
      followers: '8.4K',
      followersChange: '+420',
      engagementRate: '3.8%',
      engagementChange: '+0.3%',
      reach: '42K',
      reachChange: '+15%',
      impressions: '128K',
      impressionsChange: '+12%',
      topPosts: [
        { title: 'Our approach to sustainable growth', likes: 890, comments: 67, shares: 134 },
        { title: 'Hiring: 3 new roles open', likes: 670, comments: 89, shares: 245 },
        { title: 'Q1 learnings from our CEO', likes: 540, comments: 45, shares: 98 },
      ],
    },
  },
  twitter: {
    label: 'X / Twitter',
    color: '#1DA1F2',
    metrics: {
      followers: '12.1K',
      followersChange: '+680',
      engagementRate: '2.9%',
      engagementChange: '-0.1%',
      reach: '67K',
      reachChange: '+8%',
      impressions: '198K',
      impressionsChange: '+5%',
      topPosts: [
        { title: 'Thread: Building in public', likes: 1340, comments: 89, shares: 456 },
        { title: 'New feature announcement', likes: 980, comments: 67, shares: 234 },
        { title: 'Hot take on industry trends', likes: 870, comments: 123, shares: 189 },
      ],
    },
  },
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    metrics: {
      followers: '31.2K',
      followersChange: '+890',
      engagementRate: '2.1%',
      engagementChange: '-0.3%',
      reach: '54K',
      reachChange: '+3%',
      impressions: '167K',
      impressionsChange: '+1%',
      topPosts: [
        { title: 'Community event recap', likes: 670, comments: 89, shares: 123 },
        { title: 'Product spotlight video', likes: 540, comments: 45, shares: 98 },
        { title: 'Weekend giveaway winner', likes: 890, comments: 234, shares: 67 },
      ],
    },
  },
};

const engagementOverTime = [
  { week: 'W1', instagram: 4.8, tiktok: 7.2, linkedin: 3.5, twitter: 3.0, facebook: 2.4 },
  { week: 'W2', instagram: 5.0, tiktok: 7.8, linkedin: 3.6, twitter: 2.8, facebook: 2.3 },
  { week: 'W3', instagram: 4.9, tiktok: 8.1, linkedin: 3.9, twitter: 3.1, facebook: 2.1 },
  { week: 'W4', instagram: 5.2, tiktok: 8.4, linkedin: 3.8, twitter: 2.9, facebook: 2.1 },
];

const postingFrequency = [
  { day: 'Mon', posts: 4 },
  { day: 'Tue', posts: 6 },
  { day: 'Wed', posts: 5 },
  { day: 'Thu', posts: 7 },
  { day: 'Fri', posts: 5 },
  { day: 'Sat', posts: 2 },
  { day: 'Sun', posts: 1 },
];

const contentCalendar = [
  { day: 'Mon', items: ['IG Reel: Product tips', 'LinkedIn article draft'] },
  { day: 'Tue', items: ['TikTok: BTS video', 'X thread: Industry take'] },
  { day: 'Wed', items: ['IG carousel: Customer story', 'FB community post'] },
  { day: 'Thu', items: ['TikTok: Trending audio', 'LinkedIn poll'] },
  { day: 'Fri', items: ['IG Story: Team feature', 'X engagement'] },
  { day: 'Sat', items: ['Scheduled: IG lifestyle post'] },
  { day: 'Sun', items: ['Rest / review analytics'] },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OrganicSocialPage() {
  const [activePlatform, setActivePlatform] = useState<PlatformKey>('instagram');
  const current = platforms[activePlatform];
  const m = current.metrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Organic Social Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track performance, engagement, and growth across every social platform.
        </p>
      </header>

      {/* Platform tabs */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(platforms) as PlatformKey[]).map((key) => (
          <Button
            key={key}
            variant={activePlatform === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePlatform(key)}
            className={
              activePlatform === key
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : ''
            }
          >
            {platforms[key].label}
          </Button>
        ))}
      </div>

      {/* Metric cards for selected platform */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Followers', value: m.followers, change: m.followersChange, icon: Users },
          { label: 'Engagement Rate', value: m.engagementRate, change: m.engagementChange, icon: Heart },
          { label: 'Reach', value: m.reach, change: m.reachChange, icon: Eye },
          { label: 'Impressions', value: m.impressions, change: m.impressionsChange, icon: BarChart3 },
        ].map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change.startsWith('+');
          return (
            <Card key={stat.label}>
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                    {stat.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Engagement over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Engagement Rate Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engagementOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="instagram" stroke="#E1306C" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tiktok" stroke="#000000" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="linkedin" stroke="#0077B5" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="twitter" stroke="#1DA1F2" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="facebook" stroke="#1877F2" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Posting frequency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Posting Frequency (This Week)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={postingFrequency}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="posts" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top posts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Top Posts on {current.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {m.topPosts.map((post, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <span className="text-sm font-medium">{post.title}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" /> {post.likes.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> {post.comments.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="h-3 w-3" /> {post.shares.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Content Suggestions */}
      <Card className="border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              AI Content Suggestions
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              Beta
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Based on your audience engagement patterns and trending topics, here are content ideas:
          </p>
          <ul className="space-y-2">
            {[
              'Create a Reel showing your product in action with a trending audio track',
              'Post a carousel comparing before/after results from a real customer',
              'Share a short founder story post on LinkedIn to boost authority',
              'Go live on Instagram during your next team meeting for authenticity',
            ].map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-emerald-600 mt-0.5 shrink-0">&#x2022;</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="outline" className="mt-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
            <Sparkles className="h-3 w-3 mr-1" /> Generate More Ideas
          </Button>
        </CardContent>
      </Card>

      {/* Content Calendar (weekly) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Content Calendar (This Week)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {contentCalendar.map((day) => (
              <div
                key={day.day}
                className="p-3 rounded-lg border bg-card min-h-[100px] hover:border-emerald-400/40 transition-colors"
              >
                <p className="text-xs font-semibold mb-2 text-emerald-700 dark:text-emerald-400">
                  {day.day}
                </p>
                <div className="space-y-1">
                  {day.items.map((item, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground leading-tight">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
