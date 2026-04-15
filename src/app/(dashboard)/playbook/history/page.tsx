import type { Metadata } from 'next';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { HistoryClient } from './history-client';

export const metadata: Metadata = {
  title: 'Assessment History | Grove',
};

/** Raw row shape from playbook_assessments table */
export interface AssessmentRow {
  id: string;
  org_id: string;
  template_id: string;
  template_name?: string | null;
  overall_score: number;
  overall_label?: string | null;
  current_maturity_level?: string | null;
  target_maturity_level?: string | null;
  category_scores: Record<string, number> | null;
  dimension_scores?: Array<{
    dimensionId: string;
    dimensionName: string;
    score: number;
    label: string;
    weight: number;
    kpiValues: Record<string, number | string | null>;
    reasoning: string;
  }> | null;
  ai_recommendations: string[] | null;
  ai_summary?: string | null;
  assessed_at: string;
  assessed_by?: string | null;
  previous_score?: number | null;
}

export default async function PlaybookHistoryPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  const { data, error } = await supabase
    .from('playbook_assessments')
    .select('*')
    .eq('org_id', orgId)
    .order('assessed_at', { ascending: false });

  if (error) {
    console.error('[PlaybookHistory] Failed to fetch assessments:', error);
  }

  const assessments: AssessmentRow[] = (data ?? []) as AssessmentRow[];

  return <HistoryClient assessments={assessments} />;
}
