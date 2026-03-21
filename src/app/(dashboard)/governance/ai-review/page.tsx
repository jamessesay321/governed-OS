'use client';

import Link from 'next/link';
import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getAIToolAssessments } from '@/lib/governance/governance-data';
import type { AIToolAssessment } from '@/lib/governance/governance-data';

export default function AIReviewPage() {
  const assessments = getAIToolAssessments();

  return (
    <IntelligencePageWrapper
      section="governance"
      title="AI Stack Review"
      subtitle="Submit AI tools for governance assessment"
      showSearch={false}
      showRecommendations={false}
    >
      {/* Community Assessments */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Community Assessments</h2>
        <div className="grid grid-cols-1 gap-4">
          {assessments.map((tool) => (
            <ToolAssessmentCard key={tool.name} tool={tool} />
          ))}
        </div>
      </section>

      {/* Submit a Tool */}
      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Submit a Tool for Review</h2>
        <Card>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tool-name">Tool name</Label>
                <Input id="tool-name" placeholder="e.g. ChatGPT, Notion AI" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tool-url">Website URL</Label>
                <Input id="tool-url" type="url" placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tool-use">What you use it for</Label>
                <Input id="tool-use" placeholder="e.g. Financial analysis, board packs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tool-data">What data it accesses</Label>
                <Input id="tool-data" placeholder="e.g. P&L data, customer emails" />
              </div>
            </div>
            <Button disabled className="w-full sm:w-auto">
              Submit for Review
            </Button>
            <p className="text-xs text-muted-foreground">
              Express interest — community reviews are coming soon.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Link to AI audit */}
      <section className="mt-6">
        <Link
          href="/ai-solutions/audit"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Want a full AI stack audit? Get your free assessment
        </Link>
      </section>
    </IntelligencePageWrapper>
  );
}

// ── Tool Assessment Card ─────────────────────────────────────────

function ToolAssessmentCard({ tool }: { tool: AIToolAssessment }) {
  const scoreColor =
    tool.safetyScore >= 80
      ? 'bg-green-500'
      : tool.safetyScore >= 60
        ? 'bg-amber-500'
        : 'bg-red-500';

  const scoreTextColor =
    tool.safetyScore >= 80
      ? 'text-green-700 dark:text-green-400'
      : tool.safetyScore >= 60
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-red-700 dark:text-red-400';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">{tool.name}</CardTitle>
          <Badge variant="secondary">{tool.category}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Safety score bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Safety Score</span>
            <span className={cn('font-semibold', scoreTextColor)}>
              {tool.safetyScore}/100
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', scoreColor)}
              style={{ width: `${tool.safetyScore}%` }}
            />
          </div>
        </div>

        {/* Concerns */}
        {tool.concerns.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Concerns</p>
            <ul className="space-y-0.5 text-sm">
              {tool.concerns.map((concern, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  {concern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendation */}
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Recommendation: </span>
          {tool.recommendation}
        </p>
      </CardContent>
    </Card>
  );
}
