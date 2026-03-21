'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';
import { getIntegrationPackages } from '@/lib/marketplace/ai-solutions-data';
import { cn } from '@/lib/utils';

function formatPrice(pence: number): string {
  if (pence === 0) return 'POA';
  return `\u00A3${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function IntegrationPage() {
  const packages = getIntegrationPackages();

  return (
    <IntelligencePageWrapper
      section="ai-solutions"
      title="Platform Integration"
      subtitle="Connect and govern your entire technology stack"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packages.map((pkg) => (
          <Card
            key={pkg.id}
            className={cn(
              'relative flex flex-col',
              pkg.popular && 'ring-2 ring-primary'
            )}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-4">
                <Badge className="bg-primary text-primary-foreground">
                  Popular
                </Badge>
              </div>
            )}

            <CardHeader>
              <CardTitle className="text-lg">{pkg.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{pkg.description}</p>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4">
              {/* Price + timeline */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{formatPrice(pkg.price)}</span>
                {pkg.price > 0 && (
                  <span className="text-xs text-muted-foreground">one-off</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {pkg.timeline}
              </div>

              {/* Deliverables */}
              <ul className="space-y-2 flex-1">
                {pkg.deliverables.map((d) => (
                  <li key={d} className="flex gap-2 text-xs leading-relaxed">
                    <svg className="mt-0.5 size-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {d}
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
