'use client';

import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';

interface SettingsPageClientProps {
  children: React.ReactNode;
}

export function SettingsPageClient({ children }: SettingsPageClientProps) {
  return (
    <IntelligencePageWrapper
      title="Settings"
      subtitle="Manage your organisation, team members, and platform preferences"
      section="settings"
    >
      {children}
    </IntelligencePageWrapper>
  );
}
