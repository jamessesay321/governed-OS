'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { BusinessContextProfile } from '@/types';

type Props = {
  orgId: string;
  interviewId: string;
  profile?: Partial<BusinessContextProfile> | null;
  redirectTo?: string;
};

type EditableProfile = {
  revenue_model: string;
  revenue_streams: string;
  industry: string;
  business_stage: string;
  twelve_month_goals: string;
  biggest_challenges: string;
  success_definition: string;
  team_size: string;
  risk_tolerance: string;
  target_revenue_growth: string;
  target_gross_margin: string;
  target_net_margin: string;
};

export function InterviewCompletion({ orgId, interviewId, profile, redirectTo }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(!profile);
  const [extracting, setExtracting] = useState(!profile);
  const [saving, setSaving] = useState(false);
  const [extractedProfile, setExtractedProfile] = useState<Partial<BusinessContextProfile> | null>(
    profile ?? null
  );
  const [edits, setEdits] = useState<EditableProfile>({
    revenue_model: profile?.revenue_model ?? '',
    revenue_streams: profile?.revenue_streams?.join(', ') ?? '',
    industry: profile?.industry ?? '',
    business_stage: profile?.business_stage ?? '',
    twelve_month_goals: profile?.twelve_month_goals?.join(', ') ?? '',
    biggest_challenges: profile?.biggest_challenges?.join(', ') ?? '',
    success_definition: profile?.success_definition ?? '',
    team_size: profile?.team_size?.toString() ?? '',
    risk_tolerance: profile?.risk_tolerance ?? '',
    target_revenue_growth: profile?.target_revenue_growth
      ? (profile.target_revenue_growth * 100).toFixed(0)
      : '',
    target_gross_margin: profile?.target_gross_margin
      ? (profile.target_gross_margin * 100).toFixed(0)
      : '',
    target_net_margin: profile?.target_net_margin
      ? (profile.target_net_margin * 100).toFixed(0)
      : '',
  });

  // Extract profile from interview transcript if not already provided
  useState(() => {
    if (profile) {
      setLoading(false);
      setExtracting(false);
      return;
    }

    // Auto-extract on mount
    async function extract() {
      try {
        const res = await fetch(`/api/interview/${orgId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewId }),
        });

        const data = await res.json();

        if (res.ok && data.profile) {
          setExtractedProfile(data.profile);
          setEdits({
            revenue_model: data.profile.revenue_model ?? '',
            revenue_streams: data.profile.revenue_streams?.join(', ') ?? '',
            industry: data.profile.industry ?? '',
            business_stage: data.profile.business_stage ?? '',
            twelve_month_goals: data.profile.twelve_month_goals?.join(', ') ?? '',
            biggest_challenges: data.profile.biggest_challenges?.join(', ') ?? '',
            success_definition: data.profile.success_definition ?? '',
            team_size: data.profile.team_size?.toString() ?? '',
            risk_tolerance: data.profile.risk_tolerance ?? '',
            target_revenue_growth: data.profile.target_revenue_growth
              ? (data.profile.target_revenue_growth * 100).toFixed(0)
              : '',
            target_gross_margin: data.profile.target_gross_margin
              ? (data.profile.target_gross_margin * 100).toFixed(0)
              : '',
            target_net_margin: data.profile.target_net_margin
              ? (data.profile.target_net_margin * 100).toFixed(0)
              : '',
          });
        }
      } catch {
        // Profile extraction failed — user can still proceed
      } finally {
        setLoading(false);
        setExtracting(false);
      }
    }

    extract();
  });

  async function handleSaveAndContinue() {
    setSaving(true);

    try {
      // Build edits to send
      const editPayload: Record<string, unknown> = {};

      if (edits.revenue_model) editPayload.revenue_model = edits.revenue_model;
      if (edits.revenue_streams) {
        editPayload.revenue_streams = edits.revenue_streams.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (edits.industry) editPayload.industry = edits.industry;
      if (edits.business_stage) editPayload.business_stage = edits.business_stage;
      if (edits.twelve_month_goals) {
        editPayload.twelve_month_goals = edits.twelve_month_goals.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (edits.biggest_challenges) {
        editPayload.biggest_challenges = edits.biggest_challenges.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (edits.success_definition) editPayload.success_definition = edits.success_definition;
      if (edits.team_size) editPayload.team_size = parseInt(edits.team_size, 10) || null;
      if (edits.risk_tolerance) editPayload.risk_tolerance = edits.risk_tolerance;
      if (edits.target_revenue_growth) {
        editPayload.target_revenue_growth = parseFloat(edits.target_revenue_growth) / 100;
      }
      if (edits.target_gross_margin) {
        editPayload.target_gross_margin = parseFloat(edits.target_gross_margin) / 100;
      }
      if (edits.target_net_margin) {
        editPayload.target_net_margin = parseFloat(edits.target_net_margin) / 100;
      }

      // If we haven't extracted yet, do extraction with edits
      if (!extractedProfile) {
        await fetch(`/api/interview/${orgId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewId, edits: editPayload }),
        });
      }

      router.push(redirectTo || '/dashboard');
    } catch {
      // Navigate anyway — profile save is best effort
      router.push(redirectTo || '/dashboard');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
            <div className="h-3 w-3 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
            <div className="h-3 w-3 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-sm text-muted-foreground">
            Compiling your business profile from the interview...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Interview Complete</h1>
        <p className="text-muted-foreground">
          Here is what we captured. Review and make any corrections before we set up your dashboard.
        </p>
      </div>

      {/* Business Model Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge variant="outline">1</Badge>
            Business Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="revenue_model">Revenue Model</Label>
            <Input
              id="revenue_model"
              value={edits.revenue_model}
              onChange={(e) => setEdits((prev) => ({ ...prev, revenue_model: e.target.value }))}
              placeholder="e.g., SaaS subscriptions, project-based consulting"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="revenue_streams">Revenue Streams (comma-separated)</Label>
            <Input
              id="revenue_streams"
              value={edits.revenue_streams}
              onChange={(e) => setEdits((prev) => ({ ...prev, revenue_streams: e.target.value }))}
              placeholder="e.g., Monthly subscriptions, Setup fees, Consulting"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={edits.industry}
                onChange={(e) => setEdits((prev) => ({ ...prev, industry: e.target.value }))}
                placeholder="e.g., Technology, Healthcare"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_stage">Business Stage</Label>
              <Input
                id="business_stage"
                value={edits.business_stage}
                onChange={(e) => setEdits((prev) => ({ ...prev, business_stage: e.target.value }))}
                placeholder="e.g., Growth, Mature"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge variant="outline">2</Badge>
            Goals & Priorities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goals">12-Month Goals (comma-separated)</Label>
            <Input
              id="goals"
              value={edits.twelve_month_goals}
              onChange={(e) => setEdits((prev) => ({ ...prev, twelve_month_goals: e.target.value }))}
              placeholder="e.g., Hit $1M ARR, Hire 3 engineers, Launch v2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="challenges">Biggest Challenges (comma-separated)</Label>
            <Input
              id="challenges"
              value={edits.biggest_challenges}
              onChange={(e) => setEdits((prev) => ({ ...prev, biggest_challenges: e.target.value }))}
              placeholder="e.g., Cash flow timing, Hiring engineers, Customer churn"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="success">What Success Looks Like</Label>
            <Input
              id="success"
              value={edits.success_definition}
              onChange={(e) => setEdits((prev) => ({ ...prev, success_definition: e.target.value }))}
              placeholder="e.g., Profitable growth with 6+ months runway"
            />
          </div>
        </CardContent>
      </Card>

      {/* Context Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge variant="outline">3</Badge>
            Context
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team_size">Team Size</Label>
              <Input
                id="team_size"
                type="number"
                value={edits.team_size}
                onChange={(e) => setEdits((prev) => ({ ...prev, team_size: e.target.value }))}
                placeholder="e.g., 12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk_tolerance">Risk Tolerance</Label>
              <Input
                id="risk_tolerance"
                value={edits.risk_tolerance}
                onChange={(e) => setEdits((prev) => ({ ...prev, risk_tolerance: e.target.value }))}
                placeholder="conservative, moderate, or aggressive"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Baseline Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge variant="outline">4</Badge>
            KPI Baseline Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="revenue_growth">Revenue Growth (%)</Label>
              <Input
                id="revenue_growth"
                type="number"
                value={edits.target_revenue_growth}
                onChange={(e) =>
                  setEdits((prev) => ({ ...prev, target_revenue_growth: e.target.value }))
                }
                placeholder="e.g., 20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gross_margin">Gross Margin (%)</Label>
              <Input
                id="gross_margin"
                type="number"
                value={edits.target_gross_margin}
                onChange={(e) =>
                  setEdits((prev) => ({ ...prev, target_gross_margin: e.target.value }))
                }
                placeholder="e.g., 65"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="net_margin">Net Margin (%)</Label>
              <Input
                id="net_margin"
                type="number"
                value={edits.target_net_margin}
                onChange={(e) =>
                  setEdits((prev) => ({ ...prev, target_net_margin: e.target.value }))
                }
                placeholder="e.g., 15"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <p className="text-xs text-muted-foreground">
          You can always update this later from Settings.
        </p>
        <Button
          onClick={handleSaveAndContinue}
          disabled={saving}
          size="lg"
        >
          {saving ? (
            <>
              <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            redirectTo ? 'Looks good, continue setup' : 'Looks good, take me to my dashboard'
          )}
        </Button>
      </div>
    </div>
  );
}
