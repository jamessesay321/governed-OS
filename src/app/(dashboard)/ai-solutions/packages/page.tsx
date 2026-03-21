'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';
import { getAIPackages } from '@/lib/marketplace/ai-solutions-data';
import { cn } from '@/lib/utils';

function formatMonthly(pence: number): string {
  return `\u00A3${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PackagesPage() {
  const packages = getAIPackages();

  return (
    <IntelligencePageWrapper
      section="ai-solutions"
      title="AI Governance Packages"
      subtitle="Ongoing governance, compliance, and AI oversight"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <Card
            key={pkg.id}
            className={cn(
              'relative flex flex-col',
              pkg.recommended && 'ring-2 ring-primary'
            )}
          >
            {pkg.recommended && (
              <div className="absolute -top-3 left-4">
                <Badge className="bg-primary text-primary-foreground">
                  Recommended
                </Badge>
              </div>
            )}

            <CardHeader>
              <CardTitle className="text-lg">{pkg.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{pkg.description}</p>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4">
              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">
                  {formatMonthly(pkg.monthlyPrice)}
                </span>
                <span className="text-xs text-muted-foreground">/month</span>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1">
                {pkg.features.map((f) => (
                  <li key={f} className="flex gap-2 text-xs leading-relaxed">
                    <svg className="mt-0.5 size-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Button disabled className="w-full mt-auto">
                Express Interest
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </IntelligencePageWrapper>
  );
}
