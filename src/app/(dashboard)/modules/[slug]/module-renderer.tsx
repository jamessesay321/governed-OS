'use client';

import { HealthCheck } from '@/components/modules/health-check/health-check';
import { CashForecaster } from '@/components/modules/cash-forecaster/cash-forecaster';
import { InvestmentReadiness } from '@/components/modules/investment-readiness/investment-readiness';
import { PricingAnalyser } from '@/components/modules/pricing-analyser/pricing-analyser';

type ModuleRendererProps = {
  slug: string;
  orgId: string;
};

export function ModuleRenderer({ slug, orgId }: ModuleRendererProps) {
  switch (slug) {
    case 'health-check':
      return <HealthCheck orgId={orgId} />;
    case 'cash-forecaster':
      return <CashForecaster orgId={orgId} />;
    case 'investment-readiness':
      return <InvestmentReadiness orgId={orgId} />;
    case 'pricing-analyser':
      return <PricingAnalyser orgId={orgId} />;
    default:
      return (
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Module not found.</p>
        </div>
      );
  }
}
