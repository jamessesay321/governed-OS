'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { InvestmentReadinessResult, ReadinessCategory } from '@/types/playbook';

type InvestmentReadinessProps = {
  orgId: string;
};

export function InvestmentReadiness({ orgId }: InvestmentReadinessProps) {
  const [data, setData] = useState<InvestmentReadinessResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/modules/health-check/${orgId}?type=investment-readiness`);
        if (res.ok) {
          const json = await res.json();
          setData(json.readiness);
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="h-6 w-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // Generate demo data if API returns nothing
  const result: InvestmentReadinessResult = data ?? {
    orgId,
    overallScore: 62,
    categories: [
      { name: 'Financial Health', score: 72, maxScore: 25, gaps: ['Improve net margins above 10%', 'Build 12+ months cash runway'] },
      { name: 'Data Quality', score: 58, maxScore: 25, gaps: ['Complete 12+ months of clean financial data', 'Ensure all accounts are reconciled'] },
      { name: 'Growth Metrics', score: 65, maxScore: 25, gaps: ['Demonstrate consistent MoM revenue growth', 'Reduce customer concentration below 25%'] },
      { name: 'Governance', score: 53, maxScore: 25, gaps: ['Implement full audit trail', 'Establish board governance framework'] },
    ],
    investorMetrics: {
      'Revenue Growth': '18% YoY',
      'Gross Margin': '42%',
      'Net Margin': '8%',
      'Cash Runway': '9 months',
      'Customer Count': '47',
      'Data History': '8 months',
    },
    assessedAt: new Date().toISOString(),
  };

  const chartData = result.categories.map((c) => ({
    name: c.name,
    score: c.score,
    max: c.maxScore,
    pct: Math.round((c.score / c.maxScore) * 100),
  }));

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:items-start sm:gap-8">
          <ScoreGauge score={result.overallScore} />
          <div className="flex flex-1 flex-col gap-2 text-center sm:text-left">
            <h2 className="text-2xl font-bold">
              {result.overallScore >= 80 ? 'Investment Ready' :
               result.overallScore >= 60 ? 'Approaching Readiness' :
               result.overallScore >= 40 ? 'Early Stage' : 'Not Ready'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Your investment readiness score indicates how prepared your organisation
              is for external investment based on financial health, data quality,
              growth metrics, and governance.
            </p>
            <Badge
              variant={result.overallScore >= 70 ? 'default' : 'secondary'}
              className="w-fit mx-auto sm:mx-0"
            >
              {result.overallScore}/100 points
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Category Scores Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category Breakdown</CardTitle>
          <CardDescription>Score across four investment readiness pillars</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: unknown) => [`${Number(value ?? 0)}%`, 'Score']}
                />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.pct >= 75 ? 'hsl(var(--primary))' :
                        entry.pct >= 50 ? 'hsl(142, 76%, 36%)' :
                        entry.pct >= 30 ? 'hsl(48, 96%, 53%)' :
                        'hsl(0, 84%, 60%)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gap Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gap Analysis</CardTitle>
          <CardDescription>Key improvements to reach investment readiness</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {result.categories.map((cat) => (
              <GapSection key={cat.name} category={cat} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Investor Metrics Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investor-Ready Metrics</CardTitle>
          <CardDescription>Key figures investors will evaluate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(result.investorMetrics).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-muted/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">{key}</p>
                <p className="mt-0.5 text-lg font-semibold">{String(value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = Math.PI * radius; // semi-circle
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex shrink-0 items-center justify-center">
      <svg className="h-32 w-32" viewBox="0 0 128 80">
        <path
          d="M 10 70 A 54 54 0 0 1 118 70"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 10 70 A 54 54 0 0 1 118 70"
          fill="none"
          stroke={
            score >= 75 ? 'hsl(142, 76%, 36%)' :
            score >= 50 ? 'hsl(48, 96%, 53%)' :
            'hsl(0, 84%, 60%)'
          }
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-[10px] text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

function GapSection({ category }: { category: ReadinessCategory }) {
  const pct = Math.round((category.score / category.maxScore) * 100);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">{category.name}</h4>
        <span className={cn(
          'text-xs font-medium',
          pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
        )}>
          {pct}%
        </span>
      </div>
      {category.gaps.length > 0 && (
        <ul className="space-y-1.5">
          {category.gaps.map((gap, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <svg className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {gap}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
