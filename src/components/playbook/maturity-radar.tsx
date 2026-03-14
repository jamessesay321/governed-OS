'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DimensionScore } from '@/types/playbook';

type MaturityRadarProps = {
  scores: DimensionScore[];
  targetScore?: number;
};

export function MaturityRadar({ scores, targetScore = 4 }: MaturityRadarProps) {
  const data = scores.map((s) => ({
    dimension: s.dimensionName.replace(' & ', '\n& '),
    score: s.score,
    target: targetScore,
    fullMark: 5,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maturity Radar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid
                gridType="polygon"
                stroke="hsl(var(--border))"
              />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tickCount={6}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <Radar
                name="Target"
                dataKey="target"
                stroke="hsl(var(--muted-foreground))"
                fill="hsl(var(--muted))"
                fillOpacity={0.15}
                strokeDasharray="4 4"
              />
              <Radar
                name="Current Score"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
