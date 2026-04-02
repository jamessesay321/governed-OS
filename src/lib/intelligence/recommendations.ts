// src/lib/intelligence/recommendations.ts
// Recommendation engine powering "Recommended for You" sections across the platform.
// 'use client' compatible — no server-side imports, all inline mock data.

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  reasoning: string;
  actionLabel: string;
  actionHref: string;
  priority: RecommendationPriority;
  icon: string;
  section: string;
}

// ---------------------------------------------------------------------------
// Section -> Recommendations map (demo mode sample data)
// ---------------------------------------------------------------------------

const SECTION_RECOMMENDATIONS: Record<string, Recommendation[]> = {
  dashboard: [
    {
      id: 'dash-1',
      title: 'Try Marketing Dashboard view',
      description:
        'Switch to the Marketing lens to see acquisition metrics, social engagement and campaign ROI alongside your financial overview.',
      reasoning:
        'Based on your bridal business, marketing spend is one of your top three cost lines — a dedicated view keeps it visible.',
      actionLabel: 'Switch view',
      actionHref: '/dashboard?view=marketing',
      priority: 'medium',
      icon: '📊',
      section: 'dashboard',
    },
    {
      id: 'dash-2',
      title: 'Activate Cash Forecaster for bridal seasonality',
      description:
        'The Cash Forecaster module models seasonal peaks around wedding season and quieter winter months, giving you a 13-week rolling forecast.',
      reasoning:
        'Based on your bridal business, cash flow swings dramatically between peak season (Apr-Sep) and off-season — forecasting smooths surprises.',
      actionLabel: 'Activate module',
      actionHref: '/modules?activate=cash-forecaster',
      priority: 'high',
      icon: '💰',
      section: 'dashboard',
    },
    {
      id: 'dash-3',
      title: 'Connect your Barclays account for real-time balances',
      description:
        'Link your business bank account via Open Banking to see live cash balances and recent transactions on your dashboard.',
      reasoning:
        'Based on your bridal business, real-time visibility into cash eliminates manual reconciliation and reduces month-end surprises.',
      actionLabel: 'Connect bank',
      actionHref: '/settings/integrations?provider=barclays',
      priority: 'high',
      icon: '🏦',
      section: 'dashboard',
    },
    {
      id: 'dash-4',
      title: 'Review your KPI targets for Q2',
      description:
        'Q2 is your busiest quarter for fittings and alterations — make sure your KPI targets reflect seasonal expectations.',
      reasoning:
        'Based on your bridal business, Q2 historically generates 35% of annual revenue. Accurate targets prevent false alarms in variance tracking.',
      actionLabel: 'Review targets',
      actionHref: '/kpi?period=q2-2026',
      priority: 'medium',
      icon: '🎯',
      section: 'dashboard',
    },
  ],

  kpi: [
    {
      id: 'kpi-1',
      title: 'Add custom bridal KPIs: Revenue per dress, Fitting conversion rate',
      description:
        'Track luxury-specific metrics that standard templates miss — revenue per gown sold, consultation-to-fitting conversion, and alteration turnaround time.',
      reasoning:
        'Based on your bridal business, generic retail KPIs overlook the high-value, low-volume dynamics of luxury bridal. Custom metrics give sharper insight.',
      actionLabel: 'Add KPIs',
      actionHref: '/kpi/custom/new',
      priority: 'high',
      icon: '👗',
      section: 'kpi',
    },
    {
      id: 'kpi-2',
      title: 'Benchmark against luxury retail sector',
      description:
        'Compare your gross margin, staff-to-revenue ratio and customer lifetime value against anonymised luxury retail peers.',
      reasoning:
        'Based on your bridal business, luxury retail benchmarks are the closest comparison — mainstream fashion metrics would set misleading expectations.',
      actionLabel: 'View benchmarks',
      actionHref: '/kpi/benchmarks?sector=luxury-retail',
      priority: 'medium',
      icon: '📈',
      section: 'kpi',
    },
    {
      id: 'kpi-3',
      title: 'Set variance alert thresholds',
      description:
        'Define acceptable deviation ranges for each KPI so you get notified only when something truly needs attention.',
      reasoning:
        'Based on your bridal business, seasonal swings can trigger false alerts — custom thresholds keep notifications meaningful.',
      actionLabel: 'Configure alerts',
      actionHref: '/dashboard/alerts',
      priority: 'medium',
      icon: '🔔',
      section: 'kpi',
    },
    {
      id: 'kpi-4',
      title: 'Track trunk show ROI as a custom KPI',
      description:
        'Measure the revenue, cost and conversion from each trunk show as a dedicated KPI to optimise your event calendar.',
      reasoning:
        'Based on your bridal business, trunk shows are a significant investment — tracking ROI per event helps prioritise the most profitable ones.',
      actionLabel: 'Create KPI',
      actionHref: '/kpi/custom/new?template=event-roi',
      priority: 'high',
      icon: '✨',
      section: 'kpi',
    },
  ],

  variance: [
    {
      id: 'var-1',
      title: 'Drill into your highest variance items this month',
      description:
        'Your top three variance items this month account for over 60% of the total deviation — click through to see the line-level detail.',
      reasoning:
        'Based on your bridal business, fabric and embellishment costs are volatile. Drilling into the top variances quickly isolates supplier or design-driven overruns.',
      actionLabel: 'View top variances',
      actionHref: '/variance?sort=highest&period=current',
      priority: 'high',
      icon: '🔍',
      section: 'variance',
    },
    {
      id: 'var-2',
      title: 'Set up automated variance alerts',
      description:
        'Receive a notification when any budget line deviates beyond your configured threshold so you can act before month-end.',
      reasoning:
        'Based on your bridal business, catching overruns early in the month leaves time to negotiate with suppliers or adjust production schedules.',
      actionLabel: 'Set up alerts',
      actionHref: '/dashboard/alerts',
      priority: 'medium',
      icon: '⚡',
      section: 'variance',
    },
    {
      id: 'var-3',
      title: 'Compare seasonal patterns year-over-year',
      description:
        'Overlay this year\u2019s variance trends against the same months last year to distinguish genuine anomalies from normal seasonal patterns.',
      reasoning:
        'Based on your bridal business, wedding season creates predictable spikes — year-over-year comparison prevents unnecessary alarm.',
      actionLabel: 'Compare YoY',
      actionHref: '/variance?compare=yoy',
      priority: 'medium',
      icon: '📅',
      section: 'variance',
    },
  ],

  financials: [
    {
      id: 'fin-1',
      title: 'Set up budget tracking for 2026',
      description:
        'Create your 2026 annual budget with monthly breakdowns so every transaction is automatically tracked against plan.',
      reasoning:
        'Based on your bridal business, having a structured budget in place before peak season starts lets you monitor spend in real time.',
      actionLabel: 'Create budget',
      actionHref: '/financials/budget/new?year=2026',
      priority: 'high',
      icon: '📋',
      section: 'financials',
    },
    {
      id: 'fin-2',
      title: 'Enable revenue recognition by collection',
      description:
        'Recognise revenue at the collection level — Bridal, Evening Wear, Accessories — for clearer margin analysis per product line.',
      reasoning:
        'Based on your bridal business, each collection carries different margins. Segment-level recognition surfaces which lines drive profitability.',
      actionLabel: 'Configure',
      actionHref: '/financials/settings/revenue-recognition',
      priority: 'medium',
      icon: '🏷️',
      section: 'financials',
    },
    {
      id: 'fin-3',
      title: 'Compare gross margins across dress categories',
      description:
        'See a side-by-side margin comparison for bespoke gowns, ready-to-wear, and accessories to guide pricing and production decisions.',
      reasoning:
        'Based on your bridal business, bespoke gowns carry the highest margin but also the most labour — comparing categories clarifies where profit really comes from.',
      actionLabel: 'View margins',
      actionHref: '/financials/margins?groupBy=category',
      priority: 'medium',
      icon: '💎',
      section: 'financials',
    },
  ],

  scenarios: [
    {
      id: 'scen-1',
      title: 'Model: What if we open a second showroom?',
      description:
        'Simulate the capital outlay, ongoing costs and revenue uplift of a second showroom in a different city.',
      reasoning:
        'Based on your bridal business, expanding to a second location is a common growth lever for luxury bridal — modelling it de-risks the decision.',
      actionLabel: 'Create scenario',
      actionHref: '/scenarios/new?template=second-location',
      priority: 'high',
      icon: '🏪',
      section: 'scenarios',
    },
    {
      id: 'scen-2',
      title: 'Hiring impact: 2 new seamstresses',
      description:
        'Model the cost, capacity increase and break-even timeline of adding two skilled seamstresses to your production team.',
      reasoning:
        'Based on your bridal business, production capacity is your main bottleneck during peak season. This scenario quantifies the payoff of extra hands.',
      actionLabel: 'Create scenario',
      actionHref: '/scenarios/new?template=hiring-impact&roles=seamstress&count=2',
      priority: 'high',
      icon: '🧵',
      section: 'scenarios',
    },
    {
      id: 'scen-3',
      title: 'Price increase simulation: 5% across bridal range',
      description:
        'See how a 5% price increase affects revenue, demand elasticity and margin under optimistic, base and conservative assumptions.',
      reasoning:
        'Based on your bridal business, luxury buyers are less price-sensitive — modelling confirms whether a modest increase flows straight to profit.',
      actionLabel: 'Create scenario',
      actionHref: '/scenarios/new?template=price-change&pct=5',
      priority: 'medium',
      icon: '💷',
      section: 'scenarios',
    },
    {
      id: 'scen-4',
      title: 'US trunk show expansion scenario',
      description:
        'Model the investment and projected returns from expanding your trunk show programme to three new US cities.',
      reasoning:
        'Based on your bridal business and US expansion goals, quantifying the cost-per-city and expected bookings turns ambition into a funded plan.',
      actionLabel: 'Create scenario',
      actionHref: '/scenarios/new?template=market-expansion&market=us',
      priority: 'high',
      icon: '🇺🇸',
      section: 'scenarios',
    },
  ],

  playbook: [
    {
      id: 'play-1',
      title: 'Run maturity assessment',
      description:
        'Take a 15-minute assessment to score your business across 8 governance dimensions and get a tailored improvement roadmap.',
      reasoning:
        'Based on your bridal business, knowing where you stand today is the first step to sustainable growth — the assessment surfaces blind spots.',
      actionLabel: 'Start assessment',
      actionHref: '/playbook/assess',
      priority: 'high',
      icon: '📝',
      section: 'playbook',
    },
    {
      id: 'play-2',
      title: 'Compare to luxury retail peers',
      description:
        'See how your maturity scores stack up against anonymised luxury retail businesses at a similar stage.',
      reasoning:
        'Based on your bridal business, peer comparison highlights areas where you are ahead of or behind comparable companies.',
      actionLabel: 'View comparison',
      actionHref: '/playbook/benchmarks?sector=luxury-retail',
      priority: 'medium',
      icon: '⚖️',
      section: 'playbook',
    },
    {
      id: 'play-3',
      title: 'Review growth dimension actions',
      description:
        'Your growth dimension has 4 pending action items — completing them would move your overall maturity from Stage 2 to Stage 3.',
      reasoning:
        'Based on your bridal business, growth readiness directly affects your ability to attract investment and scale operations.',
      actionLabel: 'View actions',
      actionHref: '/playbook/dimensions/growth',
      priority: 'medium',
      icon: '🚀',
      section: 'playbook',
    },
  ],

  reports: [
    {
      id: 'rep-1',
      title: 'Generate Q1 board pack for investors',
      description:
        'Create a polished investor-ready report covering Q1 2026 financials, KPIs, scenario outcomes and governance highlights.',
      reasoning:
        'Based on your bridal business and growth ambitions, a professional board pack demonstrates governance maturity to potential investors.',
      actionLabel: 'Generate report',
      actionHref: '/reports/new?template=board-pack&period=q1-2026',
      priority: 'high',
      icon: '📑',
      section: 'reports',
    },
    {
      id: 'rep-2',
      title: 'Monthly review for March 2026',
      description:
        'Auto-generate a monthly management review with variance commentary, KPI traffic lights and cash position summary.',
      reasoning:
        'Based on your bridal business, a structured monthly review keeps you on top of performance as peak season begins.',
      actionLabel: 'Generate report',
      actionHref: '/reports/new?template=monthly-review&period=mar-2026',
      priority: 'high',
      icon: '📄',
      section: 'reports',
    },
    {
      id: 'rep-3',
      title: 'Create trunk show ROI report',
      description:
        'Compile a dedicated report tracking the costs, bookings and revenue attributed to each trunk show event this year.',
      reasoning:
        'Based on your bridal business, trunk shows are a major investment. A dedicated ROI report helps decide which cities to revisit.',
      actionLabel: 'Generate report',
      actionHref: '/reports/new?template=event-roi&category=trunk-shows',
      priority: 'medium',
      icon: '🎪',
      section: 'reports',
    },
  ],

  modules: [
    {
      id: 'mod-1',
      title: 'Cash Forecaster — essential for seasonal bridal cash flow',
      description:
        'Get a 13-week rolling cash forecast that accounts for seasonal peaks, deposit schedules and supplier payment terms.',
      reasoning:
        'Based on your bridal business, bespoke gowns involve long lead times and staged payments — the Cash Forecaster prevents liquidity gaps.',
      actionLabel: 'Explore module',
      actionHref: '/modules/cash-forecaster',
      priority: 'high',
      icon: '💰',
      section: 'modules',
    },
    {
      id: 'mod-2',
      title: 'Investment Readiness — prepare for your growth round',
      description:
        'Run through a structured investment readiness programme covering financials, governance, pitch materials and due diligence prep.',
      reasoning:
        'Based on your bridal business and expansion goals, being investment-ready means you can move quickly when the right opportunity arises.',
      actionLabel: 'Explore module',
      actionHref: '/modules/investment-readiness',
      priority: 'high',
      icon: '🎯',
      section: 'modules',
    },
    {
      id: 'mod-3',
      title: 'Health Check — benchmark against fashion industry',
      description:
        'Run a comprehensive business health check that scores you across financial, operational and strategic dimensions against fashion sector norms.',
      reasoning:
        'Based on your bridal business, an industry-specific health check surfaces issues generic tools miss — like production efficiency and atelier utilisation.',
      actionLabel: 'Explore module',
      actionHref: '/modules/health-check',
      priority: 'medium',
      icon: '🩺',
      section: 'modules',
    },
  ],

  billing: [
    {
      id: 'bill-1',
      title: 'Creative Empire bundle saves you 40%',
      description:
        'Bundle the Cash Forecaster, Investment Readiness and Health Check modules together and save 40% compared to individual pricing.',
      reasoning:
        'Based on your bridal business, you would benefit from all three modules — bundling is the most cost-effective route.',
      actionLabel: 'View bundle',
      actionHref: '/billing/bundles/creative-empire',
      priority: 'high',
      icon: '🎁',
      section: 'billing',
    },
    {
      id: 'bill-2',
      title: 'Refer a fellow designer to earn credits',
      description:
        'Refer another fashion or luxury business to Governed OS and earn platform credits worth one month free.',
      reasoning:
        'Based on your bridal business, your network of fellow designers is a natural referral pool — and you both benefit.',
      actionLabel: 'Refer now',
      actionHref: '/billing/referrals',
      priority: 'low',
      icon: '🤝',
      section: 'billing',
    },
    {
      id: 'bill-3',
      title: 'Review your platform value breakdown',
      description:
        'See a transparent breakdown of the value you have received this month — time saved, insights generated and decisions supported.',
      reasoning:
        'Based on your bridal business, understanding the ROI of your subscription helps justify the cost to stakeholders and partners.',
      actionLabel: 'View breakdown',
      actionHref: '/billing/value-report',
      priority: 'low',
      icon: '📊',
      section: 'billing',
    },
  ],

  settings: [
    {
      id: 'set-1',
      title: 'Invite your accountant as an advisor',
      description:
        'Give your accountant read-only access to financials, reports and variance data so they can support you without needing separate exports.',
      reasoning:
        'Based on your bridal business, an advisor seat saves hours of manual reporting and keeps your accountant in the loop in real time.',
      actionLabel: 'Send invite',
      actionHref: '/settings/team/invite?role=advisor',
      priority: 'high',
      icon: '👤',
      section: 'settings',
    },
    {
      id: 'set-2',
      title: 'Set preferred currency',
      description:
        'Configure GBP as your primary currency with USD as a secondary for US trunk show transactions.',
      reasoning:
        'Based on your bridal business, accurate multi-currency handling prevents conversion errors in your financial reports.',
      actionLabel: 'Configure',
      actionHref: '/settings/preferences/currency',
      priority: 'medium',
      icon: '💱',
      section: 'settings',
    },
    {
      id: 'set-3',
      title: 'Configure notification preferences',
      description:
        'Choose which alerts you receive by email, in-app or both — and set quiet hours during evening fittings.',
      reasoning:
        'Based on your bridal business, evenings are often spent with brides at fittings. Quiet hours prevent interruptions during high-value appointments.',
      actionLabel: 'Configure',
      actionHref: '/settings/notifications',
      priority: 'low',
      icon: '🔕',
      section: 'settings',
    },
  ],

  intelligence: [
    {
      id: 'intel-1',
      title: 'Configure anomaly alerts for luxury retail sector',
      description:
        'Set up AI-powered anomaly detection tuned to luxury retail patterns so alerts reflect your sector, not generic thresholds.',
      reasoning:
        'Based on your bridal business, luxury retail has unique spending and revenue patterns — sector-specific detection reduces noise.',
      actionLabel: 'Configure',
      actionHref: '/intelligence',
      priority: 'high',
      icon: '🤖',
      section: 'intelligence',
    },
    {
      id: 'intel-2',
      title: 'Track bridal industry trends',
      description:
        'Subscribe to AI-curated trend reports covering bridal fashion, luxury consumer spending and wedding market forecasts.',
      reasoning:
        'Based on your bridal business, staying ahead of industry trends informs collection design and pricing strategy.',
      actionLabel: 'Subscribe',
      actionHref: '/intelligence/trends?topic=bridal-industry',
      priority: 'medium',
      icon: '📰',
      section: 'intelligence',
    },
    {
      id: 'intel-3',
      title: 'Set up competitor monitoring',
      description:
        'Track publicly available signals from comparable luxury bridal brands — pricing changes, new collections, trunk show calendars.',
      reasoning:
        'Based on your bridal business, understanding competitor positioning helps you differentiate and price effectively.',
      actionLabel: 'Set up',
      actionHref: '/intelligence/competitors/configure',
      priority: 'medium',
      icon: '👁️',
      section: 'intelligence',
    },
  ],

  agents: [
    {
      id: 'agent-1',
      title: 'Finance Agent automates your month-end close',
      description:
        'The Finance Agent reconciles transactions, flags discrepancies and prepares draft management accounts — cutting month-end from days to hours.',
      reasoning:
        'Based on your bridal business, month-end currently takes significant manual effort. Automating routine reconciliation frees you to focus on design.',
      actionLabel: 'Explore agent',
      actionHref: '/agents/finance',
      priority: 'high',
      icon: '🧮',
      section: 'agents',
    },
    {
      id: 'agent-2',
      title: 'Marketing Agent manages social scheduling',
      description:
        'The Marketing Agent schedules posts, analyses engagement and suggests content themes aligned with your bridal calendar.',
      reasoning:
        'Based on your bridal business, consistent social presence drives consultation bookings — the agent keeps your pipeline full without daily manual posting.',
      actionLabel: 'Explore agent',
      actionHref: '/agents/marketing',
      priority: 'medium',
      icon: '📱',
      section: 'agents',
    },
    {
      id: 'agent-3',
      title: 'Try all 6 agents with the bundle — save £396/year',
      description:
        'Access Finance, Marketing, Operations, Legal, Strategy, and HR agents together at a discount versus individual subscriptions.',
      reasoning:
        'Based on your bridal business, you would benefit from multiple agents as you scale — the bundle is the most cost-effective option.',
      actionLabel: 'View bundle',
      actionHref: '/agents/bundle',
      priority: 'high',
      icon: '🎁',
      section: 'agents',
    },
  ],

  consultants: [
    {
      id: 'cons-1',
      title: 'Based on your US expansion goals, a Sales consultant could accelerate market entry',
      description:
        'Connect with a vetted sales consultant who specialises in luxury fashion market entry to develop your US distribution strategy.',
      reasoning:
        'Based on your bridal business and US expansion goals, a specialist consultant reduces the time and risk of entering a new market.',
      actionLabel: 'Find consultants',
      actionHref: '/consultants?speciality=sales&market=us',
      priority: 'high',
      icon: '🌎',
      section: 'consultants',
    },
    {
      id: 'cons-2',
      title: 'A Fractional CMO could optimise your trunk show strategy',
      description:
        'Hire a fractional Chief Marketing Officer experienced in luxury events to maximise your trunk show ROI and brand positioning.',
      reasoning:
        'Based on your bridal business, trunk shows are a core revenue driver. A fractional CMO brings expertise without a full-time salary commitment.',
      actionLabel: 'Browse CMOs',
      actionHref: '/consultants?role=fractional-cmo&sector=luxury',
      priority: 'medium',
      icon: '🎯',
      section: 'consultants',
    },
  ],

  'custom-builds': [
    {
      id: 'cb-1',
      title: 'Production Calendar — track your bridal collection pipeline end-to-end',
      description:
        'A custom-built tool to manage your production pipeline from fabric sourcing through cutting, sewing, embellishment and final fitting.',
      reasoning:
        'Based on your bridal business, production tracking is currently manual. A dedicated calendar connects timelines to financial forecasts.',
      actionLabel: 'Learn more',
      actionHref: '/custom-builds/templates/production-calendar',
      priority: 'high',
      icon: '📆',
      section: 'custom-builds',
    },
    {
      id: 'cb-2',
      title: 'Client Portal — let brides track their dress journey',
      description:
        'Give each bride a personalised portal to view their dress progress, upcoming fittings, payment schedule and mood boards.',
      reasoning:
        'Based on your bridal business, a client portal elevates the luxury experience and reduces "where is my dress?" enquiries.',
      actionLabel: 'Learn more',
      actionHref: '/custom-builds/templates/client-portal',
      priority: 'high',
      icon: '💍',
      section: 'custom-builds',
    },
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the tailored recommendations for a given section of the platform.
 * Falls back to an empty array for unknown sections.
 */
export function getRecommendationsForSection(section: string): Recommendation[] {
  return SECTION_RECOMMENDATIONS[section] || [];
}

/**
 * Returns all available section keys that have recommendations.
 */
export function getAvailableSections(): string[] {
  return Object.keys(SECTION_RECOMMENDATIONS);
}

/**
 * Returns all recommendations across every section, optionally filtered by priority.
 */
export function getAllRecommendations(
  priority?: RecommendationPriority,
): Recommendation[] {
  const all = Object.values(SECTION_RECOMMENDATIONS).flat();
  if (!priority) return all;
  return all.filter((r) => r.priority === priority);
}
