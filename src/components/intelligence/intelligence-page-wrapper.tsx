'use client';

import { RecommendedForYou } from './recommended-for-you';
import { AISearchBar } from './ai-search-bar';
import { NudgeBannerList } from '@/components/nudges/nudge-banner';
import { getNudgesForPage } from '@/lib/nudges/nudge-data';
import { cn } from '@/lib/utils';

interface IntelligencePageWrapperProps {
  title: string;
  subtitle?: string;
  section: string;
  showSearch?: boolean;
  showRecommendations?: boolean;
  showNudges?: boolean;
  children: React.ReactNode;
}

export function IntelligencePageWrapper({
  title,
  subtitle,
  section,
  showSearch = true,
  showRecommendations = true,
  showNudges = true,
  children,
}: IntelligencePageWrapperProps) {
  const nudges = showNudges ? getNudgesForPage(section) : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">
            {subtitle}
          </p>
        )}
      </header>

      {showSearch && <AISearchBar section={section} />}

      {nudges.length > 0 && <NudgeBannerList nudges={nudges} />}

      {showRecommendations && <RecommendedForYou section={section} />}

      <div
        className={cn(
          'border-b border-border/40',
          (!showSearch && !showRecommendations) && 'hidden'
        )}
      />

      <div>{children}</div>
    </div>
  );
}
