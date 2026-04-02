'use client';

import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';
import { ModulesMarketplace } from './modules-marketplace';
import type { ModuleDefinition } from '@/types/playbook';

interface ModulesPageClientProps {
  modules: ModuleDefinition[];
  orgId: string;
}

export function ModulesPageClient({ modules, orgId }: ModulesPageClientProps) {
  return (
    <IntelligencePageWrapper
      title="Modules"
      subtitle="Activate specialist modules to unlock deeper analysis and insights for your organisation"
      section="modules"
    >
      <ModulesMarketplace modules={modules} orgId={orgId} />
    </IntelligencePageWrapper>
  );
}
