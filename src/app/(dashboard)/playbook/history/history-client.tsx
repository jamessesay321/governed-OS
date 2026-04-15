'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AssessmentRow } from './page';

// ── Constants ──

const MATURITY_LABELS: Record<number, string> = {
  1: 'Foundation',
  2: 'Developing',
  3: 'Established',
  4: 'Advanced',
  5: 'Leading',
};

const MATURITY_COLORS: Record<string, string> = {
  Foundation: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Developing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Established: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Advanced: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Leading: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

const DIMENSION_CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#f97316', // orange
];

// ── Helpers ──

function getLabel(assessment: AssessmentRow): string {
  if (assessment.overall_label) return assessment.overall_label;
  if (assessment.current_maturity_level) {
    // Capitalise the enum value (e.g. "growth" -> "Growth")
    return assessment.current_maturity_level.charAt(0).toUpperCase() +
      assessment.current_maturity_level.slice(1);
  }
  // Derive from score
  const rounded = Math.round(assessment.overall_score) as 1 | 2 | 3 | 4 | 5;
  return MATURITY_LABELS[Math.min(5, Math.max(1, rounded))] ?? 'Unknown';
}

function getLabelColor(label: string): string {
  return MATURITY_COLORS[label] ?? 'bg-muted text-muted-foreground';
}

/** Get dimension-level data from either dimension_scores or category_scores */
function getDimensions(assessment: AssessmentRow): Array<{
  name: string;
  score: number;
  label: string;
}> {
  if (assessment.dimension_scores && assessment.dimension_scores.length > 0) {
    return assessment.dimension_scores.map((d) => ({
      name: d.dimensionName,
      score: d.score,
      label: d.label,
    }));
  }
  if (assessment.category_scores) {
    return Object.entries(assessment.category_scores).map(([key, score]) => ({
      name: key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      score: typeof score === 'number' ? score : 0,
      label: '',
    }));
  }
  return [];
}

/** Get narrative text from either ai_summary or ai_recommendations */
function getNarrative(assessment: AssessmentRow): string {
  if (assessment.ai_summary) return assessment.ai_summary;
  if (assessment.ai_recommendations && assessment.ai_recommendations.length > 0) {
    return assessment.ai_recommendations.join(' ');
  }
  return '';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDate(dateStr);
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Components ──

interface HistoryClientProps {
  assessments: AssessmentRow[];
}

export function HistoryClient({ assessments }: HistoryClientProps) {
  if (assessments.length === 0) {
    return <EmptyState />;
  }

  const latest = assessments[0];
  const previous = assessments.length > 1 ? assessments[1] : null;

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/playbook"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Playbook
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Assessment History</h1>
          <p className="text-sm text-muted-foreground">
            Track how your maturity scores have changed over time
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards
        latest={latest}
        previous={previous}
        totalCount={assessments.length}
      />

      {/* Score trend chart */}
      {assessments.length >= 2 && (
        <ScoreTrendChart assessments={assessments} />
      )}

      {/* Dimension comparison */}
      {assessments.length >= 2 && (
        <DimensionComparisonChart assessments={assessments} />
      )}

      {/* Assessment timeline */}
      <AssessmentTimeline assessments={assessments} />
    </div>
  );
}

// ── Empty State ──

function EmptyState() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <Link
          href="/playbook"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Playbook
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Assessment History</h1>
        <p className="text-sm text-muted-foreground">
          Track how your maturity scores have changed over time
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
            <svg
              className="h-7 w-7 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No assessments yet</h3>
          <p className="max-w-sm text-sm text-muted-foreground mb-6">
            Run your first playbook assessment to start tracking your
            organisation&apos;s maturity over time.
          </p>
          <Link
            href="/playbook"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to Playbook
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Summary Cards ──

function SummaryCards({
  latest,
  previous,
  totalCount,
}: {
  latest: AssessmentRow;
  previous: AssessmentRow | null;
  totalCount: number;
}) {
  const latestLabel = getLabel(latest);
  const scoreDiff = previous
    ? latest.overall_score - previous.overall_score
    : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Latest score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Latest Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">
              {latest.overall_score.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">/ 5</span>
          </div>
          <Badge className={cn('mt-1', getLabelColor(latestLabel))}>
            {latestLabel}
          </Badge>
        </CardContent>
      </Card>

      {/* Score trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Score Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scoreDiff !== null ? (
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  'text-3xl font-bold tabular-nums',
                  scoreDiff > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : scoreDiff < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-muted-foreground'
                )}
              >
                {scoreDiff > 0 ? '+' : ''}
                {scoreDiff.toFixed(1)}
              </span>
              <span className="text-xl">
                {scoreDiff > 0.05 ? (
                  <svg className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                ) : scoreDiff < -0.05 ? (
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                  </svg>
                )}
              </span>
            </div>
          ) : (
            <span className="text-2xl font-bold text-muted-foreground">--</span>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {previous ? 'vs previous assessment' : 'Run another to compare'}
          </p>
        </CardContent>
      </Card>

      {/* Total assessments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-3xl font-bold tabular-nums">{totalCount}</span>
          <p className="mt-1 text-xs text-muted-foreground">assessments run</p>
        </CardContent>
      </Card>

      {/* Last assessed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Last Assessed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-bold">
            {formatRelativeDate(latest.assessed_at)}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(latest.assessed_at)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Score Trend Chart ──

function ScoreTrendChart({ assessments }: { assessments: AssessmentRow[] }) {
  const chartData = useMemo(() => {
    // Chronological order for the chart
    return [...assessments]
      .reverse()
      .map((a) => ({
        date: formatShortDate(a.assessed_at),
        score: Number(a.overall_score.toFixed(2)),
      }));
  }, [assessments]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Overall Score Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value) => [Number(value).toFixed(2), 'Score']}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Dimension Comparison Chart ──

function DimensionComparisonChart({ assessments }: { assessments: AssessmentRow[] }) {
  const { chartData, dimensionNames } = useMemo(() => {
    // Get the most recent assessments (up to 6) in chronological order
    const recent = [...assessments].slice(0, 6).reverse();

    // Collect all dimension/category names across assessments
    const nameSet = new Set<string>();
    for (const a of recent) {
      const dims = getDimensions(a);
      for (const d of dims) nameSet.add(d.name);
    }
    const names = [...nameSet];

    const data = recent.map((a) => {
      const dims = getDimensions(a);
      const row: Record<string, string | number> = {
        date: formatShortDate(a.assessed_at),
      };
      for (const d of dims) {
        row[d.name] = d.score;
      }
      return row;
    });

    return { chartData: data, dimensionNames: names };
  }, [assessments]);

  if (dimensionNames.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dimension Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toFixed(1) : String(value),
                  String(name),
                ]}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {dimensionNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={DIMENSION_CHART_COLORS[i % DIMENSION_CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Assessment Timeline ──

function AssessmentTimeline({ assessments }: { assessments: AssessmentRow[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">All Assessments</h2>
      {assessments.map((assessment, index) => {
        const previous = index < assessments.length - 1 ? assessments[index + 1] : null;
        return (
          <AssessmentCard
            key={assessment.id}
            assessment={assessment}
            previous={previous}
          />
        );
      })}
    </div>
  );
}

// ── Single Assessment Card ──

function AssessmentCard({
  assessment,
  previous,
}: {
  assessment: AssessmentRow;
  previous: AssessmentRow | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const label = getLabel(assessment);
  const dimensions = getDimensions(assessment);
  const narrative = getNarrative(assessment);
  const scoreDiff = previous
    ? assessment.overall_score - previous.overall_score
    : null;

  return (
    <Card>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full text-left"
      >
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: date + score */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                {assessment.overall_score.toFixed(1)}
              </div>
              <div>
                <p className="font-semibold">{formatDate(assessment.assessed_at)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className={cn('text-[11px]', getLabelColor(label))}>
                    {label}
                  </Badge>
                  {scoreDiff !== null && (
                    <span
                      className={cn(
                        'text-xs font-medium tabular-nums',
                        scoreDiff > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : scoreDiff < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-muted-foreground'
                      )}
                    >
                      {scoreDiff > 0 ? '+' : ''}
                      {scoreDiff.toFixed(1)} vs prev
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: dimension badges */}
            <div className="flex flex-wrap gap-1.5">
              {dimensions.slice(0, 5).map((dim) => (
                <DimensionBadge key={dim.name} name={dim.name} score={dim.score} />
              ))}
            </div>
          </div>

          {/* Expand hint */}
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <svg
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                expanded && 'rotate-90'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
            {expanded ? 'Hide details' : 'View details'}
          </div>
        </CardHeader>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <CardContent className="border-t pt-4 space-y-4">
          {/* AI narrative */}
          {narrative && (
            <div>
              <h4 className="text-sm font-semibold mb-1.5">AI Summary</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {narrative}
              </p>
            </div>
          )}

          {/* AI recommendations list */}
          {assessment.ai_recommendations &&
            assessment.ai_recommendations.length > 0 &&
            assessment.ai_summary && (
              <div>
                <h4 className="text-sm font-semibold mb-1.5">Recommendations</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {assessment.ai_recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Dimension breakdown */}
          {dimensions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Dimension Breakdown</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dimensions.map((dim) => (
                  <DimensionDetail key={dim.name} dimension={dim} />
                ))}
              </div>
            </div>
          )}

          {/* Detailed reasoning (only for dimension_scores data) */}
          {assessment.dimension_scores &&
            assessment.dimension_scores.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Scoring Rationale</h4>
                <div className="space-y-2">
                  {assessment.dimension_scores.map((ds) => (
                    <div key={ds.dimensionId} className="text-sm">
                      <span className="font-medium">{ds.dimensionName}:</span>{' '}
                      <span className="text-muted-foreground">
                        {ds.reasoning}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Dimension Badge (compact) ──

function DimensionBadge({ name, score }: { name: string; score: number }) {
  // Shorten long names for the badge
  const shortName =
    name.length > 16 ? name.split(' ').map((w) => w[0]).join('') : name;

  const barPct = (score / 5) * 100;
  const barColor =
    score >= 4
      ? 'bg-emerald-500'
      : score >= 3
        ? 'bg-yellow-500'
        : score >= 2
          ? 'bg-orange-500'
          : 'bg-red-500';

  return (
    <div
      className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]"
      title={`${name}: ${score}/5`}
    >
      <span className="font-medium truncate max-w-[80px]">{shortName}</span>
      <div className="h-1.5 w-8 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full', barColor)}
          style={{ width: `${barPct}%` }}
        />
      </div>
      <span className="tabular-nums text-muted-foreground">{score}</span>
    </div>
  );
}

// ── Dimension Detail Card ──

function DimensionDetail({
  dimension,
}: {
  dimension: { name: string; score: number; label: string };
}) {
  const barPct = (dimension.score / 5) * 100;
  const barColor =
    dimension.score >= 4
      ? 'bg-emerald-500'
      : dimension.score >= 3
        ? 'bg-yellow-500'
        : dimension.score >= 2
          ? 'bg-orange-500'
          : 'bg-red-500';

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium truncate">{dimension.name}</span>
        <span className="text-sm font-bold tabular-nums">
          {dimension.score}/5
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${barPct}%` }}
        />
      </div>
      {dimension.label && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {dimension.label}
        </p>
      )}
    </div>
  );
}
