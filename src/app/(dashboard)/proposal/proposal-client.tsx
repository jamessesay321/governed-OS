'use client';

import { useState, useMemo } from 'react';
import { Check, Clock, Sparkles, Zap } from 'lucide-react';
import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';
import {
  getMockProposal,
  type ProposalItem,
  type ProposalTimeline,
} from '@/lib/proposal/proposal-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatPence(pence: number): string {
  return `\u00a3${(pence / 100).toLocaleString()}`;
}

/* ------------------------------------------------------------------ */
/*  Toggle Switch                                                      */
/* ------------------------------------------------------------------ */

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Item Cards                                                         */
/* ------------------------------------------------------------------ */

function IncludedCard({ item }: { item: ProposalItem }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{item.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.description}
        </p>
      </div>
      <Badge variant="secondary" className="shrink-0 text-xs">
        Free
      </Badge>
    </div>
  );
}

function ToggleableCard({
  item,
  enabled,
  onToggle,
  isAnnual,
}: {
  item: ProposalItem;
  enabled: boolean;
  onToggle: (id: string) => void;
  isAnnual: boolean;
}) {
  const price = isAnnual ? item.annualPrice / 12 : item.monthlyPrice;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 sm:p-4 transition-colors',
        enabled
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-card'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <ToggleSwitch
            checked={enabled}
            onChange={() => onToggle(item.id)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{item.name}</p>
            <Badge variant="outline" className="text-xs capitalize">
              {item.type}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.description}
          </p>
          {item.reasoning && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80 italic">
              {item.reasoning}
            </p>
          )}
        </div>
        <p className="shrink-0 text-sm font-semibold text-foreground">
          {formatPence(price)}
          <span className="text-xs font-normal text-muted-foreground">
            /mo
          </span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline                                                           */
/* ------------------------------------------------------------------ */

function TimelineSection({ timeline }: { timeline: ProposalTimeline[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Rollout Timeline
      </h3>
      <div className="space-y-2">
        {timeline.map((t) => (
          <div key={t.week} className="flex items-start gap-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {t.week}
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">
                {t.milestone}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Investment Summary                                                 */
/* ------------------------------------------------------------------ */

function InvestmentSummary({
  enabledIds,
  items,
  isAnnual,
  setIsAnnual,
  timeline,
}: {
  enabledIds: Set<string>;
  items: ProposalItem[];
  isAnnual: boolean;
  setIsAnnual: (v: boolean) => void;
  timeline: ProposalTimeline[];
}) {
  const selectedItems = items.filter(
    (i) => !i.included && enabledIds.has(i.id)
  );

  const monthlyTotal = selectedItems.reduce(
    (sum, i) => sum + i.monthlyPrice,
    0
  );
  const annualTotal = selectedItems.reduce(
    (sum, i) => sum + i.annualPrice,
    0
  );
  const annualSavings = monthlyTotal * 12 - annualTotal;
  const displayTotal = isAnnual ? annualTotal / 12 : monthlyTotal;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Investment Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Monthly / Annual toggle */}
        <div className="flex rounded-lg border bg-muted/50 p-0.5">
          <button
            type="button"
            onClick={() => setIsAnnual(false)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              !isAnnual
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setIsAnnual(true)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              isAnnual
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Annual
          </button>
        </div>

        {/* Total */}
        <div className="text-center">
          <p className="text-3xl font-bold text-foreground">
            {formatPence(displayTotal)}
            <span className="text-base font-normal text-muted-foreground">
              /mo
            </span>
          </p>
          {isAnnual && annualSavings > 0 && (
            <Badge className="mt-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              Save {formatPence(annualSavings)}/yr
            </Badge>
          )}
        </div>

        {/* Count */}
        <p className="text-center text-xs text-muted-foreground">
          {selectedItems.length} service{selectedItems.length !== 1 ? 's' : ''}{' '}
          selected
        </p>

        {/* Divider */}
        <div className="border-t border-border/40" />

        {/* Timeline */}
        <TimelineSection timeline={timeline} />

        {/* CTA */}
        <Button className="w-full" disabled>
          <Sparkles className="mr-2 h-4 w-4" />
          Express Interest
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Coming soon. We&apos;ll notify you when this is live.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Client Component                                              */
/* ------------------------------------------------------------------ */

export function ProposalClient() {
  const proposal = useMemo(() => getMockProposal(), []);

  // Initialise toggles: recommended items start enabled
  const [enabledIds, setEnabledIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    proposal.items.forEach((item) => {
      if (item.recommended) ids.add(item.id);
    });
    return ids;
  });

  const [isAnnual, setIsAnnual] = useState(false);

  const toggle = (id: string) => {
    setEnabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const included = proposal.items.filter((i) => i.included);
  const recommended = proposal.items.filter(
    (i) => !i.included && i.recommended
  );
  const optional = proposal.items.filter(
    (i) => !i.included && !i.recommended
  );

  return (
    <IntelligencePageWrapper
      section="proposal"
      title="Your AI Strategy"
      subtitle="A personalised recommendation that evolves with your business"
      showSearch={false}
      showRecommendations={false}
    >
      {/* MOBILE summary — visible only below lg */}
      <div className="lg:hidden mb-6">
        <InvestmentSummary
          enabledIds={enabledIds}
          items={proposal.items}
          isAnnual={isAnnual}
          setIsAnnual={setIsAnnual}
          timeline={proposal.timeline}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT — item cards */}
        <div className="space-y-8 lg:col-span-2">
          {/* Included */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-foreground">
                Included (Free Forever)
              </h2>
            </div>
            <div className="space-y-2">
              {included.map((item) => (
                <IncludedCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          {/* Recommended */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Recommended for ALONUKO
              </h2>
            </div>
            <div className="space-y-2">
              {recommended.map((item) => (
                <ToggleableCard
                  key={item.id}
                  item={item}
                  enabled={enabledIds.has(item.id)}
                  onToggle={toggle}
                  isAnnual={isAnnual}
                />
              ))}
            </div>
          </section>

          {/* Optional */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                Optional Add-ons
              </h2>
            </div>
            <div className="space-y-2">
              {optional.map((item) => (
                <ToggleableCard
                  key={item.id}
                  item={item}
                  enabled={enabledIds.has(item.id)}
                  onToggle={toggle}
                  isAnnual={isAnnual}
                />
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT — sticky sidebar, hidden on mobile (shown above) */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <InvestmentSummary
              enabledIds={enabledIds}
              items={proposal.items}
              isAnnual={isAnnual}
              setIsAnnual={setIsAnnual}
              timeline={proposal.timeline}
            />
          </div>
        </div>
      </div>

      {/* Bottom note */}
      <div className="mt-8 flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/30 p-4">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          This proposal evolves with your business. As we learn more about
          ALONUKO through your data and interactions, recommendations will
          update automatically.
        </p>
      </div>
    </IntelligencePageWrapper>
  );
}
