'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';
import { getMockAuditResult } from '@/lib/marketplace/ai-solutions-data';
import { cn } from '@/lib/utils';

const RISK_COLOURS: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-red-100 text-red-700 border-red-200',
};

function scoreColour(score: number) {
  if (score < 50) return 'text-red-600';
  if (score <= 75) return 'text-amber-500';
  return 'text-emerald-600';
}

export default function AuditPage() {
  const audit = getMockAuditResult();

  return (
    <IntelligencePageWrapper
      section="ai-solutions"
      title="AI Stack Audit"
      subtitle="Free assessment of your AI tools and governance posture"
    >
      <div className="space-y-6">
        {/* Hero — governance score */}
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <p className="text-sm font-medium text-muted-foreground">
              Your AI Governance Score
            </p>
            <p className={cn('text-6xl font-bold tabular-nums', scoreColour(audit.governanceScore))}>
              {audit.governanceScore}
              <span className="text-2xl text-muted-foreground font-normal">/100</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {audit.governanceScore < 50
                ? 'Significant governance gaps detected'
                : audit.governanceScore <= 75
                  ? 'Moderate governance posture'
                  : 'Strong governance posture'}
            </p>
          </CardContent>
        </Card>

        {/* Tools detected */}
        <div>
          <h2 className="text-base font-semibold mb-3">Tools Detected</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {audit.toolsDetected.map((tool) => (
              <Card key={tool.name} className="py-4">
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold truncate">{tool.name}</p>
                    <Badge className={cn('capitalize text-xs', RISK_COLOURS[tool.riskLevel])}>
                      {tool.riskLevel}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{tool.category}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tool.governanceGap}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Risks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Risks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {audit.risks.map((risk) => (
              <div key={risk} className="flex gap-3">
                <svg
                  className="mt-0.5 size-5 shrink-0 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
                <p className="text-sm leading-relaxed">{risk}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {audit.recommendations.map((rec) => (
              <div key={rec} className="flex gap-3">
                <svg
                  className="mt-0.5 size-5 shrink-0 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
                <p className="text-sm leading-relaxed">{rec}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit a tool */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submit a Tool for Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Enter AI tool name..."
                className="flex-1"
              />
              <Button disabled className="whitespace-nowrap">
                Assess Tool
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Assessments are reviewed within 48 hours. Express interest to be notified.
            </p>
          </CardContent>
        </Card>
      </div>
    </IntelligencePageWrapper>
  );
}
