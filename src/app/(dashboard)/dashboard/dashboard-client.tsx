'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KPICards } from '@/components/dashboard/kpi-cards';
import { PnLTable } from '@/components/dashboard/pnl-table';
import { useGlobalPeriodContext } from '@/components/providers/global-period-provider';
import { SyncStatus } from '@/components/dashboard/sync-status';
import { NarrativeSummary } from '@/components/dashboard/narrative-summary';
import { DataFreshness } from '@/components/dashboard/data-freshness';
import { DataHealthWidget } from '@/components/dashboard/data-health-widget';
import { useDrillDown } from '@/components/shared/drill-down-sheet';
import { WaterfallChart } from '@/components/dashboard/waterfall-chart';
import { VariancePanel } from '@/components/dashboard/variance-panel';
import { RoadmapWidget } from '@/components/dashboard/roadmap-widget';
import { ProposalWidget } from '@/components/dashboard/proposal-widget';
import { Celebration } from '@/components/ui/celebration';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/ui/voice-input';
import {
  BarChart3, TrendingUp, Target, Sparkles, FileText, PieChart,
  Settings2, Lightbulb, ShoppingCart, Megaphone, Briefcase, LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';
import { WelcomeIllustration } from '@/components/ui/illustrations';
import { formatCurrency } from '@/lib/formatting/currency';
import type { PnLSummary, PnLSection } from '@/lib/financial/aggregate';
import type { Role } from '@/types';
import { ROLE_HIERARCHY } from '@/types';
import { NumberLegend } from '@/components/data-primitives';
import { ActivityFeed } from '@/components/collaboration';
import type { DashboardTemplate } from '@/lib/dashboard/templates';
import type { DashboardRecommendations } from './page';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Quick actions adapt based on business context
function getQuickActions(context: BusinessContext) {
  const base = [
    { label: 'View P&L', href: '/financials', icon: PieChart },
    { label: 'Check KPIs', href: '/kpi', icon: Target },
    { label: 'Run Scenario', href: '/scenarios', icon: TrendingUp },
    { label: 'Generate Report', href: '/reports', icon: FileText },
    { label: 'Ask AI', href: '/intelligence', icon: Sparkles },
  ];

  // Add context-specific actions
  if (context.isEcommerce) {
    base.push({ label: 'Sales Data', href: '/modules', icon: ShoppingCart });
  }
  if (context.isSaaS) {
    base.push({ label: 'MRR Metrics', href: '/kpi', icon: TrendingUp });
  }
  if (context.challenges?.length) {
    base.push({ label: 'View Playbook', href: '/playbook', icon: Lightbulb });
  }

  return base.slice(0, 7); // Cap at 7 for layout
}

function getContextualInsight(
  pnl?: PnLSummary,
  previousPnl?: PnLSummary | null,
  context?: BusinessContext
): string | null {
  if (!pnl || !previousPnl) return null;

  if (pnl.revenue > 0 && previousPnl.revenue > 0) {
    const change = ((pnl.revenue - previousPnl.revenue) / previousPnl.revenue) * 100;
    if (change > 0) return `Your revenue is up ${change.toFixed(0)}% this period. Nice work.`;
    if (change < -5) return `Revenue dipped ${Math.abs(change).toFixed(0)}% this period. Worth a closer look.`;
  }
  if (pnl.netProfit > 0 && previousPnl.netProfit <= 0) return 'You moved into profit this period. Great momentum.';
  if (pnl.grossProfit > 0 && previousPnl.grossProfit > 0) {
    const gpMargin = (pnl.grossProfit / pnl.revenue) * 100;
    if (gpMargin > 60) return `Gross margin is strong at ${gpMargin.toFixed(0)}%. Keep it up.`;
  }
  return null;
}

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

type BusinessContext = {
  industry: string;
  interviewCompleted: boolean;
  isEcommerce: boolean;
  isSaaS: boolean;
  isServices: boolean;
  companyName: string;
  challenges: string[];
  goals: string[];
};

interface DashboardClientProps {
  orgId: string;
  periods: string[];
  defaultPeriod: string;
  pnlByPeriod: Record<string, PnLSummary>;
  connected: boolean;
  lastSync: {
    status: string;
    recordsSynced: number;
    startedAt: string;
    completedAt: string | null;
    error: string | null;
  } | null;
  role: string;
  displayName: string;
  template: DashboardTemplate;
  recommendations: DashboardRecommendations;
  businessContext: BusinessContext;
}

// Recommended sections based on industry
function getRecommendedSections(context: BusinessContext) {
  const sections: Array<{ title: string; desc: string; href: string; icon: React.ElementType; color: string }> = [];

  if (context.isEcommerce) {
    sections.push({
      title: 'E-Commerce Analytics',
      desc: 'Track GMV, AOV, and repeat purchase rates from your sales data.',
      href: '/modules',
      icon: ShoppingCart,
      color: 'bg-orange-50 border-orange-200 text-orange-700',
    });
    sections.push({
      title: 'Marketing Dashboard',
      desc: 'Connect your social channels to see engagement and ROI in one place.',
      href: '/marketing',
      icon: Megaphone,
      color: 'bg-pink-50 border-pink-200 text-pink-700',
    });
  }

  if (context.isSaaS) {
    sections.push({
      title: 'SaaS Metrics Suite',
      desc: 'MRR, ARR, churn, NRR, CAC, and LTV calculated automatically.',
      href: '/kpi',
      icon: TrendingUp,
      color: 'bg-violet-50 border-violet-200 text-violet-700',
    });
  }

  if (context.isServices) {
    sections.push({
      title: 'Project Billing',
      desc: 'Track utilisation rates and project margins across your team.',
      href: '/modules',
      icon: Briefcase,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
    });
  }

  return sections;
}

export function DashboardClient({
  orgId,
  periods,
  defaultPeriod,
  pnlByPeriod,
  connected,
  lastSync,
  role,
  displayName,
  template,
  recommendations,
  businessContext,
}: DashboardClientProps) {
  const { period: selectedPeriod } = useGlobalPeriodContext();
  const { openDrill } = useDrillDown();
  const [showVariance, setShowVariance] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const pnl = pnlByPeriod[selectedPeriod];

  // Celebrate on first visit
  useEffect(() => {
    const key = 'dashboard-celebrated';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      setShowCelebration(true);
    }
  }, []);

  const periodIdx = periods.indexOf(selectedPeriod);
  const previousPeriod = periodIdx < periods.length - 1 ? periods[periodIdx + 1] : null;
  const previousPnl = previousPeriod ? pnlByPeriod[previousPeriod] : null;

  const userRole = role as Role;
  const canSync = hasMinRole(userRole, 'advisor');
  const canConnect = hasMinRole(userRole, 'admin');

  const firstName = displayName?.split(' ')[0] || 'there';
  const quickActions = getQuickActions(businessContext);
  const recommendedSections = getRecommendedSections(businessContext);

  // Voice search handler
  const handleVoiceSearch = (text: string) => {
    // Navigate to intelligence with the voice query
    window.location.href = `/intelligence?q=${encodeURIComponent(text)}`;
  };

  if (!pnl || periods.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{getGreeting()}, {firstName}</h2>
          <p className="text-sm text-muted-foreground mt-1">Here&apos;s your financial overview.</p>
        </div>

        <SyncStatus
          connected={connected}
          lastSync={lastSync}
          canSync={canSync}
          canConnect={canConnect}
        />

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <WelcomeIllustration className="mb-4" />
            <p className="text-lg text-muted-foreground">
              {connected
                ? 'No financial data yet. Trigger a sync to pull data from Xero.'
                : 'Connect your Xero account to get started.'}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <RoadmapWidget />
          <ProposalWidget />
        </div>
      </div>
    );
  }

  function handleSectionClick(section: PnLSection) {
    openDrill({ type: 'pnl_section', section, period: selectedPeriod });
  }

  const insight = getContextualInsight(pnl, previousPnl, businessContext);

  // Build the widget order from the template
  const widgetOrder = template.widgets.map((w) => w.type);

  return (
    <div className="space-y-6">
      <Celebration trigger={showCelebration} />

      {/* Greeting + Context Badge + Period */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold">{getGreeting()}, {firstName}</h2>
            {businessContext.industry && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                {businessContext.industry}
              </Badge>
            )}
          </div>
          {insight && (
            <p className="text-sm text-muted-foreground mt-0.5">{insight}</p>
          )}
          <DataFreshness lastSyncAt={lastSync?.completedAt ?? null} />
        </div>
        <div className="flex items-center gap-2">
          <VoiceInput onTranscript={handleVoiceSearch} label="Ask a question" />
          {previousPnl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVariance(true)}
            >
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Variance</span>
            </Button>
          )}
          <Link href="/dashboard/widgets">
            <Button variant="outline" size="sm">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Customise</span>
            </Button>
          </Link>
          {/* Period selection now handled by global period selector in layout */}
        </div>
      </div>

      {/* Quick Actions (context-aware) */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {quickActions.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 sm:py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        ))}
      </div>

      {/* Recommended Sections (industry-specific) */}
      {recommendedSections.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {recommendedSections.map((section) => (
            <Link key={section.href + section.title} href={section.href}>
              <Card className={`border ${section.color} hover:shadow-md transition-shadow cursor-pointer`}>
                <CardContent className="flex items-start gap-3 p-4">
                  <section.icon className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{section.title}</p>
                    <p className="text-xs opacity-80 mt-0.5">{section.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* KPI Recommendation Banner (if interview completed and recs exist) */}
      {recommendations.kpis.length > 0 && recommendations.reasoning && recommendations.reasoning !== 'Default recommendations.' && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="flex items-start gap-3 p-4">
            <Lightbulb className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-indigo-900">Personalised for your business</p>
              <p className="text-xs text-indigo-700 mt-0.5">{recommendations.reasoning}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data type legend */}
      <NumberLegend />

      {/* Dynamic widget rendering based on template */}
      {widgetOrder.includes('narrative_summary') && (
        <NarrativeSummary orgId={orgId} period={selectedPeriod} />
      )}

      {/* KPI Cards with trend comparison */}
      {widgetOrder.includes('kpi_cards') && (
        <KPICards
          revenue={pnl.revenue}
          grossProfit={pnl.grossProfit}
          expenses={pnl.expenses}
          netProfit={pnl.netProfit}
          previousRevenue={previousPnl?.revenue}
          previousGrossProfit={previousPnl?.grossProfit}
          previousExpenses={previousPnl?.expenses}
          previousNetProfit={previousPnl?.netProfit}
          onCardClick={(metric) => {
            const value = metric === 'revenue' ? pnl.revenue
              : metric === 'gross_margin' ? (pnl.revenue > 0 ? (pnl.grossProfit / pnl.revenue) * 100 : 0)
              : metric === 'expenses' ? pnl.expenses
              : pnl.netProfit;
            const formatted = metric === 'gross_margin'
              ? `${value.toFixed(1)}%`
              : formatCurrency(value);
            openDrill({
              type: 'kpi',
              kpiKey: metric,
              label: metric.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
              value,
              formattedValue: formatted,
              period: selectedPeriod,
            });
          }}
        />
      )}

      {/* P&L + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {widgetOrder.includes('pnl_table') && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Profit & Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <PnLTable
                pnl={pnl}
                onSectionClick={handleSectionClick}
                onAccountClick={(accountId, accountCode, accountName, _sectionClass, amount) => {
                  openDrill({
                    type: 'account',
                    accountId,
                    accountCode,
                    accountName,
                    amount,
                    period: selectedPeriod,
                  });
                }}
              />
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <SyncStatus
            connected={connected}
            lastSync={lastSync}
            canSync={canSync}
            canConnect={canConnect}
          />
          <DataHealthWidget />
          <RoadmapWidget />
          <ProposalWidget />
        </div>
      </div>

      {/* Waterfall Chart */}
      {widgetOrder.includes('waterfall_chart') && (
        <WaterfallChart pnl={pnl} />
      )}

      {/* Activity Feed */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
          <Link href="/home/activity" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <ActivityFeed compact />
        </CardContent>
      </Card>

      {/* Drill-down is now handled by the shared DrillDownProvider in layout */}

      {/* Variance analysis slide-in panel */}
      {showVariance && (
        <VariancePanel
          metric="overview"
          currentPnl={pnl}
          previousPnl={previousPnl}
          orgId={orgId}
          onClose={() => setShowVariance(false)}
        />
      )}
    </div>
  );
}
