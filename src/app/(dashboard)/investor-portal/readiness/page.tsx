'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface ReadinessCategory {
  label: string;
  score: number;
  maxScore: number;
  status: 'strong' | 'adequate' | 'needs_work' | 'missing';
  findings: string[];
}

const READINESS_DATA: ReadinessCategory[] = [
  {
    label: 'Data Completeness',
    score: 82,
    maxScore: 100,
    status: 'strong',
    findings: [
      '12 months of P&L data available',
      'Balance sheet data present',
      'Missing: customer-level revenue breakdown',
      'Missing: cohort retention data',
    ],
  },
  {
    label: 'Narrative Consistency',
    score: 70,
    maxScore: 100,
    status: 'adequate',
    findings: [
      'Revenue growth story is clear and well-supported',
      'Scenario model references a strategic partnership with no supporting documentation',
      'Board pack mentions "expanding into Europe" but no market sizing data shared',
    ],
  },
  {
    label: 'Financial Hygiene',
    score: 88,
    maxScore: 100,
    status: 'strong',
    findings: [
      'All accounts properly categorised',
      'No unexplained large journal entries',
      'Budget vs actual variance within acceptable range',
      'Recommendation: add notes to the 3 largest variance items',
    ],
  },
  {
    label: 'Competitive Positioning',
    score: 55,
    maxScore: 100,
    status: 'needs_work',
    findings: [
      'No competitive analysis or market map shared',
      'Unit economics are strong but not contextualised against benchmarks',
      'Add: industry benchmark comparisons for key KPIs',
      'Add: brief competitive moat description',
    ],
  },
];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  strong: { bg: 'bg-green-50', text: 'text-green-700' },
  adequate: { bg: 'bg-blue-50', text: 'text-blue-700' },
  needs_work: { bg: 'bg-amber-50', text: 'text-amber-700' },
  missing: { bg: 'bg-red-50', text: 'text-red-700' },
};

export default function ReadinessCheckPage() {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(true); // Show results by default for demo

  const overallScore = Math.round(
    READINESS_DATA.reduce((sum, cat) => sum + cat.score, 0) / READINESS_DATA.length
  );

  function handleScan() {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
    }, 3000);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/investor-portal" className="text-muted-foreground hover:text-foreground">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">AI Readiness Check</h2>
          <p className="text-sm text-muted-foreground">
            Scan your data before sharing with investors. Find gaps before they do.
          </p>
        </div>
      </div>

      {!scanned && !scanning && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="h-16 w-16 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <h3 className="text-lg font-semibold mb-2">Ready to check your readiness?</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Our AI will scan all your financial data, scenarios, and documents to identify gaps,
              inconsistencies, and likely investor questions. Takes about 30 seconds.
            </p>
            <Button size="lg" onClick={handleScan}>
              Run Readiness Scan
            </Button>
          </CardContent>
        </Card>
      )}

      {scanning && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-primary animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Scanning your data...</h3>
            <p className="text-sm text-muted-foreground">Checking completeness, consistency, and investor-readiness</p>
          </CardContent>
        </Card>
      )}

      {scanned && (
        <>
          {/* Overall score */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="relative h-24 w-24 flex-shrink-0">
                  <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="45" fill="none"
                      stroke={overallScore >= 75 ? '#22c55e' : overallScore >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8"
                      strokeDasharray={`${overallScore * 2.83} 283`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{overallScore}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Overall Readiness Score</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {overallScore >= 80
                      ? 'Looking strong. A few small improvements would make this bulletproof.'
                      : overallScore >= 60
                      ? 'Good foundation. Address the items below to significantly improve your position.'
                      : 'Some important gaps to address before sharing with investors.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category breakdowns */}
          <div className="grid gap-4 md:grid-cols-2">
            {READINESS_DATA.map((cat) => {
              const style = STATUS_STYLES[cat.status];
              return (
                <Card key={cat.label}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{cat.label}</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{cat.score}</span>
                        <Badge className={`${style.bg} ${style.text}`}>
                          {cat.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-slate-100 rounded-full mt-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${cat.score}%`,
                          backgroundColor: cat.score >= 75 ? '#22c55e' : cat.score >= 50 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {cat.findings.map((finding, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 flex-shrink-0 ${finding.startsWith('Missing') || finding.startsWith('Add') ? 'text-amber-500' : 'text-green-500'}`}>
                          {finding.startsWith('Missing') || finding.startsWith('Add') || finding.startsWith('Recommendation') ? (
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="text-muted-foreground">{finding}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Likely investor questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <svg className="h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Questions investors will likely ask
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                'What is your path to profitability and when do you expect to break even?',
                'How do you plan to manage cash flow if growth slows by 20%?',
                'What are your customer acquisition costs and how do they trend over time?',
                'Who are your top 3 competitors and what is your competitive moat?',
                'What would you do differently if you only raised half the target amount?',
              ].map((q, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground w-5 flex-shrink-0">{i + 1}.</span>
                  <span className="text-sm">{q}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleScan} className="flex-1">Re-scan</Button>
            <Link href="/investor-portal/builder" className="flex-1">
              <Button className="w-full">Create Room with These Insights</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
