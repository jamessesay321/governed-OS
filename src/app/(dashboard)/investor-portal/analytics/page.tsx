'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface InvestorEngagement {
  name: string;
  email: string;
  type: 'vc' | 'angel' | 'pe' | 'advisor';
  totalTime: string;
  lastActive: string;
  pagesViewed: number;
  scenariosInteracted: number;
  questionsAsked: number;
  engagementScore: 'low' | 'medium' | 'high' | 'very_high';
  interestLevel: 'watching' | 'interested' | 'active';
}

const DEMO_INVESTORS: InvestorEngagement[] = [
  {
    name: 'Sarah Chen',
    email: 'sarah@hoxtonventures.com',
    type: 'vc',
    totalTime: '47 min',
    lastActive: '2 hours ago',
    pagesViewed: 14,
    scenariosInteracted: 3,
    questionsAsked: 2,
    engagementScore: 'very_high',
    interestLevel: 'active',
  },
  {
    name: 'Marcus Webb',
    email: 'marcus@seedcamp.com',
    type: 'vc',
    totalTime: '23 min',
    lastActive: '1 day ago',
    pagesViewed: 8,
    scenariosInteracted: 1,
    questionsAsked: 1,
    engagementScore: 'high',
    interestLevel: 'interested',
  },
  {
    name: 'Rebecca Osei',
    email: 'rebecca@angel.co',
    type: 'angel',
    totalTime: '12 min',
    lastActive: '3 days ago',
    pagesViewed: 5,
    scenariosInteracted: 0,
    questionsAsked: 0,
    engagementScore: 'medium',
    interestLevel: 'watching',
  },
  {
    name: 'James Park',
    email: 'james@advisors.uk',
    type: 'advisor',
    totalTime: '34 min',
    lastActive: '5 hours ago',
    pagesViewed: 11,
    scenariosInteracted: 2,
    questionsAsked: 4,
    engagementScore: 'very_high',
    interestLevel: 'active',
  },
];

const ENGAGEMENT_STYLES: Record<string, string> = {
  low: 'bg-slate-100 text-slate-500',
  medium: 'bg-amber-50 text-amber-600',
  high: 'bg-blue-50 text-blue-600',
  very_high: 'bg-green-50 text-green-600',
};

const INTEREST_STYLES: Record<string, string> = {
  watching: 'bg-slate-100 text-slate-500',
  interested: 'bg-blue-50 text-blue-600',
  active: 'bg-green-50 text-green-600',
};

const TYPE_LABELS: Record<string, string> = {
  vc: 'VC',
  angel: 'Angel',
  pe: 'PE',
  advisor: 'Advisor',
};

export default function EngagementAnalyticsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/investor-portal" className="text-muted-foreground hover:text-foreground">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Engagement Analytics</h2>
          <p className="text-sm text-muted-foreground">Track how investors interact with your data rooms</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">116 min</div>
            <p className="text-sm text-muted-foreground">Total Time Spent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">38</div>
            <p className="text-sm text-muted-foreground">Pages Viewed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">6</div>
            <p className="text-sm text-muted-foreground">Scenarios Explored</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">7</div>
            <p className="text-sm text-muted-foreground">Questions Asked</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="bg-violet-50 border-violet-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <svg className="h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-violet-800 bg-white/60 rounded-lg p-3">
            <strong>Sarah Chen</strong> spent 12 minutes on your unit economics but skipped the market
            opportunity section. Consider strengthening your market narrative before your follow-up call.
          </div>
          <div className="text-sm text-violet-800 bg-white/60 rounded-lg p-3">
            <strong>James Park</strong> adjusted your hiring scenario 3 times, reducing headcount each time.
            He may have concerns about burn rate. Prepare a lean scenario for your next conversation.
          </div>
          <div className="text-sm text-violet-800 bg-white/60 rounded-lg p-3">
            <strong>3 of 4 investors</strong> viewed your cash flow statement. Your cash position is clearly
            a focal point. Consider adding a 13-week rolling forecast to strengthen this section.
          </div>
        </CardContent>
      </Card>

      {/* Investor table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Per-Investor Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DEMO_INVESTORS.map((investor) => (
              <div key={investor.email} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{investor.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {TYPE_LABELS[investor.type]}
                    </Badge>
                    <Badge variant="outline" className={INTEREST_STYLES[investor.interestLevel]}>
                      {investor.interestLevel}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{investor.totalTime} total</span>
                    <span>{investor.pagesViewed} pages</span>
                    <span>{investor.scenariosInteracted} scenarios</span>
                    <span>{investor.questionsAsked} questions</span>
                    <span>Last active {investor.lastActive}</span>
                  </div>
                </div>
                <Badge className={ENGAGEMENT_STYLES[investor.engagementScore]}>
                  {investor.engagementScore.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
