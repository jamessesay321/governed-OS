'use client';

import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';

interface PlaybookPageClientProps {
  children: React.ReactNode;
}

export function PlaybookPageClient({ children }: PlaybookPageClientProps) {
  return (
    <IntelligencePageWrapper
      title="Growth Playbook"
      subtitle="Assess your organisation's maturity and get a tailored action plan"
      section="playbook"
    >
      {children}
    </IntelligencePageWrapper>
  );
}
