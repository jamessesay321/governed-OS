'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarDays,
  Sparkles,
  Plus,
  Eye,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileEdit,
  Send,
  BarChart3,
  TrendingUp,
  Lightbulb,
  Zap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ContentStatus = 'draft' | 'scheduled' | 'published' | 'analyzing';

interface ContentItem {
  id: string;
  title: string;
  platform: string;
  status: ContentStatus;
  date: string;
  time?: string;
  metrics?: {
    views: number;
    likes: number;
    shares: number;
  };
}

type ViewMode = 'week' | 'month';

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const contentItems: ContentItem[] = [
  // Week view items
  { id: '1', title: 'Product launch Reel', platform: 'Instagram', status: 'published', date: 'Mon', time: '10:00 AM', metrics: { views: 12400, likes: 890, shares: 234 } },
  { id: '2', title: 'Industry trend thread', platform: 'X / Twitter', status: 'published', date: 'Mon', time: '2:00 PM', metrics: { views: 5600, likes: 340, shares: 189 } },
  { id: '3', title: 'Behind the scenes video', platform: 'TikTok', status: 'scheduled', date: 'Tue', time: '11:00 AM' },
  { id: '4', title: 'Customer story carousel', platform: 'Instagram', status: 'scheduled', date: 'Tue', time: '3:00 PM' },
  { id: '5', title: 'Thought leadership article', platform: 'LinkedIn', status: 'draft', date: 'Wed' },
  { id: '6', title: 'Product tips carousel', platform: 'Instagram', status: 'scheduled', date: 'Wed', time: '12:00 PM' },
  { id: '7', title: 'User Q&A live session', platform: 'TikTok', status: 'draft', date: 'Thu' },
  { id: '8', title: 'Community poll', platform: 'LinkedIn', status: 'scheduled', date: 'Thu', time: '9:00 AM' },
  { id: '9', title: 'Weekly roundup post', platform: 'Facebook', status: 'draft', date: 'Fri' },
  { id: '10', title: 'Weekend lifestyle Reel', platform: 'Instagram', status: 'scheduled', date: 'Sat', time: '10:00 AM' },
  { id: '11', title: 'Motivational quote', platform: 'Instagram', status: 'analyzing', date: 'Sun', metrics: { views: 8900, likes: 1240, shares: 89 } },
];

const monthWeeks = [
  { label: 'Mar 3 - 9', posts: 8, published: 5, scheduled: 2, draft: 1 },
  { label: 'Mar 10 - 16', posts: 10, published: 7, scheduled: 2, draft: 1 },
  { label: 'Mar 17 - 23', posts: 9, published: 6, scheduled: 3, draft: 0 },
  { label: 'Mar 24 - 30', posts: 11, published: 2, scheduled: 5, draft: 4 },
];

const aiSuggestions = [
  {
    title: 'Capitalize on "sustainability" trending topic',
    description: 'Create a carousel showing your product\'s eco-friendly features. This topic saw a 340% spike in your niche this week.',
    platform: 'Instagram',
    priority: 'high' as const,
  },
  {
    title: 'Respond to competitor product launch',
    description: 'A competitor just launched a similar feature. Create a comparison post highlighting your unique advantages.',
    platform: 'LinkedIn',
    priority: 'high' as const,
  },
  {
    title: 'Repurpose top-performing blog content',
    description: 'Your "Ultimate KPI Guide" blog is driving 3.2K organic visits. Turn key points into a TikTok series.',
    platform: 'TikTok',
    priority: 'medium' as const,
  },
  {
    title: 'Employee spotlight series',
    description: 'Team content gets 2.4x more engagement than product content. Feature a different team member each week.',
    platform: 'Multiple',
    priority: 'medium' as const,
  },
  {
    title: 'Customer testimonial video',
    description: 'Video testimonials convert 3x better than text. Reach out to your 5 most engaged customers.',
    platform: 'Instagram',
    priority: 'low' as const,
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusConfig: Record<ContentStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: FileEdit },
  scheduled: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400', icon: Clock },
  published: { label: 'Published', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400', icon: Send },
  analyzing: { label: 'Analyzing', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400', icon: BarChart3 },
};

const priorityColor = {
  high: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ContentCalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Content Calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan, schedule, and track content performance across all channels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className={viewMode === 'week' ? 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-none' : 'rounded-none'}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className={viewMode === 'month' ? 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-none' : 'rounded-none'}
            >
              Month
            </Button>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-3 w-3 mr-1" /> New Post
          </Button>
        </div>
      </header>

      {/* Calendar navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <h2 className="text-sm font-semibold">
          {viewMode === 'week' ? 'March 24 - 30, 2026' : 'March 2026'}
        </h2>
        <Button variant="ghost" size="sm">
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Weekly grid view */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayItems = contentItems.filter((item) => item.date === day);
            return (
              <div
                key={day}
                className="border rounded-lg bg-card min-h-[180px] hover:border-emerald-400/40 transition-colors"
              >
                <div className="px-3 py-2 border-b bg-muted/30">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {day}
                  </p>
                </div>
                <div className="p-2 space-y-2">
                  {dayItems.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-4">No posts</p>
                  )}
                  {dayItems.map((item) => {
                    const config = statusConfig[item.status];
                    const StatusIcon = config.icon;
                    return (
                      <div
                        key={item.id}
                        className="p-2 rounded-md border bg-card hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <StatusIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <Badge className={`text-[9px] px-1.5 py-0 ${config.color}`}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-medium leading-tight">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.platform}</p>
                        {item.time && (
                          <p className="text-[10px] text-muted-foreground">{item.time}</p>
                        )}
                        {item.metrics && (
                          <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Eye className="h-2.5 w-2.5" /> {(item.metrics.views / 1000).toFixed(1)}K
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Heart className="h-2.5 w-2.5" /> {item.metrics.likes}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly view */}
      {viewMode === 'month' && (
        <div className="space-y-3">
          {monthWeeks.map((week, i) => (
            <Card key={i} className="hover:border-emerald-400/40 transition-colors">
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{week.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {week.posts} posts planned
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusConfig.published.color}>
                      {week.published} published
                    </Badge>
                    <Badge className={statusConfig.scheduled.color}>
                      {week.scheduled} scheduled
                    </Badge>
                    <Badge className={statusConfig.draft.color}>
                      {week.draft} drafts
                    </Badge>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="mt-3 flex h-1.5 rounded-full overflow-hidden bg-muted">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${(week.published / week.posts) * 100}%` }}
                  />
                  <div
                    className="bg-blue-400"
                    style={{ width: `${(week.scheduled / week.posts) * 100}%` }}
                  />
                  <div
                    className="bg-gray-300"
                    style={{ width: `${(week.draft / week.posts) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Performance tracking for published posts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Published Content Performance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {contentItems
              .filter((item) => item.metrics)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <Badge className={statusConfig[item.status].color} variant="secondary">
                        {statusConfig[item.status].label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.platform} / {item.date} {item.time || ''}
                    </p>
                  </div>
                  {item.metrics && (
                    <div className="flex items-center gap-5 ml-4 shrink-0 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {item.metrics.views.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" /> {item.metrics.likes.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" /> {item.metrics.shares.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Content Ideas */}
      <Card className="border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              AI-Suggested Content Ideas
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              Beta
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Based on trending topics, audience behavior, and your business context.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiSuggestions.map((suggestion, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Lightbulb className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{suggestion.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">
                    {suggestion.platform}
                  </Badge>
                  <Badge className={`text-[10px] ${priorityColor[suggestion.priority]}`}>
                    {suggestion.priority}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 ml-6">
                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                  <Plus className="h-2.5 w-2.5 mr-0.5" /> Add to Calendar
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Generate Draft
                </Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full mt-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
            <Zap className="h-3 w-3 mr-1" /> Generate More Ideas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
