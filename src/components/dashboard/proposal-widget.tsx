'use client';

import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { getMockProposal } from '@/lib/proposal/proposal-data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function formatPence(pence: number): string {
  return `\u00a3${(pence / 100).toLocaleString()}`;
}

export function ProposalWidget({ className }: { className?: string }) {
  const proposal = useMemo(() => getMockProposal(), []);

  const recommended = proposal.items.filter((i) => i.recommended);
  const monthlyTotal = recommended.reduce(
    (sum, i) => sum + i.monthlyPrice,
    0
  );

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Your AI Strategy
          </CardTitle>
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-foreground">
            {formatPence(monthlyTotal)}
          </span>
          <span className="text-xs text-muted-foreground">/mo recommended</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {recommended.length} service{recommended.length !== 1 ? 's' : ''}
          </Badge>
          <Badge
            variant="outline"
            className="text-xs text-primary border-primary/30"
          >
            New recommendations
          </Badge>
        </div>

        <Link
          href="/proposal"
          className={cn(
            'inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20'
          )}
        >
          View Proposal
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
