import { getUserProfile } from '@/lib/auth/get-user-profile';
import { getLatestAssessment } from '@/lib/playbook/assessment';
import { PlaybookClient } from '@/components/playbook/playbook-client';

export default async function PlaybookPage() {
  const { orgId } = await getUserProfile();

  // Try to load existing assessment
  let assessment = null;
  try {
    assessment = await getLatestAssessment(orgId);
  } catch {
    // No assessment yet - that's fine
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Growth Playbook</h1>
        <p className="text-muted-foreground">
          Assess your organisation&apos;s maturity and get a tailored action plan.
        </p>
      </div>

      <PlaybookClient
        initialAssessment={assessment}
        initialActions={[]}
        orgId={orgId}
      />
    </div>
  );
}
