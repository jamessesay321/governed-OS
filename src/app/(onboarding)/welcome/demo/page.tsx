import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createServiceClient } from '@/lib/supabase/server';
import { DemoCollectionClient } from '@/components/onboarding/demo-collection-client';

export default async function DemoPage() {
  const { displayName, orgName, orgId } = await getUserProfile();

  // Query previously saved data so the form pre-populates on revisit
  let savedIndustry = '';
  let savedWebsite = '';
  let savedSocial = '';
  let savedRevenue = '';
  let savedTeamSize = '';

  try {
    const service = await createServiceClient();
    const { data: orgData } = await service
      .from('organisations' as any)
      .select('demo_company_name, demo_industry, website_url, demo_social_url, demo_revenue_range, demo_team_size')
      .eq('id', orgId)
      .single();

    if (orgData) {
      const org = orgData as unknown as Record<string, unknown>;
      savedIndustry = (org.demo_industry as string) || '';
      savedWebsite = (org.website_url as string) || '';
      savedSocial = (org.demo_social_url as string) || '';
      savedRevenue = (org.demo_revenue_range as string) || '';
      savedTeamSize = (org.demo_team_size as string) || '';
    }
  } catch {
    // Best-effort: columns may not exist yet
  }

  return (
    <DemoCollectionClient
      displayName={displayName}
      orgName={orgName}
      orgId={orgId}
      savedIndustry={savedIndustry}
      savedWebsite={savedWebsite}
      savedSocial={savedSocial}
      savedRevenue={savedRevenue}
      savedTeamSize={savedTeamSize}
    />
  );
}
