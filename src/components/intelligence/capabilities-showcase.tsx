'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CapabilitiesShowcaseProps {
  section: string;
}

interface Capability {
  icon: string;
  title: string;
  description: string;
  href: string;
}

const CAPABILITIES_MAP: Record<string, Capability[]> = {
  dashboard: [
    { icon: '🔍', title: 'View AI-Generated Insights', description: 'Get instant analysis of your financial performance.', href: '/dashboard#insights' },
    { icon: '📊', title: 'Switch Dashboard Views', description: 'Toggle between executive, operational, and investor views.', href: '/dashboard#views' },
    { icon: '🔢', title: 'Drill Into Any Number', description: 'Click any metric to see the underlying Xero transactions.', href: '/dashboard#drill' },
    { icon: '📋', title: 'Generate Board Pack', description: 'Create a polished PDF report for your board in seconds.', href: '/reports' },
    { icon: '📈', title: 'Track Custom KPIs', description: 'Define and monitor the metrics that matter most to you.', href: '/kpi' },
    { icon: '⚖️', title: 'Compare Scenarios', description: 'See how different assumptions impact your forecast.', href: '/scenarios' },
  ],
  kpi: [
    { icon: '📈', title: 'Define Custom KPIs', description: 'Create KPIs tailored to your business model and goals.', href: '/kpi#define' },
    { icon: '🎯', title: 'Set Targets & Thresholds', description: 'Configure green, amber, and red thresholds for each metric.', href: '/kpi#targets' },
    { icon: '📊', title: 'View Trend Analysis', description: 'See how your KPIs have trended over the past 12 months.', href: '/kpi#trends' },
    { icon: '🔔', title: 'Configure Alerts', description: 'Get notified when a KPI crosses a threshold.', href: '/kpi#alerts' },
    { icon: '💡', title: 'AI KPI Recommendations', description: 'Let AI suggest KPIs based on your industry and data.', href: '/kpi#recommend' },
    { icon: '📋', title: 'Export KPI Report', description: 'Generate a formatted KPI summary for stakeholders.', href: '/kpi#export' },
  ],
  variance: [
    { icon: '📉', title: 'View Variance Summary', description: 'See all budget vs actual variances at a glance.', href: '/variance#summary' },
    { icon: '🔍', title: 'Drill Into Variances', description: 'Click any variance to see the line-item breakdown.', href: '/variance#drill' },
    { icon: '💬', title: 'AI Variance Commentary', description: 'Get plain-English explanations for every significant variance.', href: '/variance#commentary' },
    { icon: '📅', title: 'Period Comparison', description: 'Compare variances across different time periods.', href: '/variance#compare' },
    { icon: '🏷️', title: 'Categorise & Tag', description: 'Label variances as one-off, recurring, or structural.', href: '/variance#tag' },
  ],
  financials: [
    { icon: '📄', title: 'View Financial Statements', description: 'Access P&L, balance sheet, and cash flow statements.', href: '/financials#statements' },
    { icon: '🔍', title: 'Drill to Transactions', description: 'Click any line item to see source Xero transactions.', href: '/financials#drill' },
    { icon: '📊', title: 'Ratio Analysis', description: 'View key financial ratios with industry benchmarks.', href: '/financials#ratios' },
    { icon: '💡', title: 'AI Financial Summary', description: 'Get a narrative summary of your financial position.', href: '/financials#summary' },
    { icon: '📈', title: 'Trend Charts', description: 'Visualise financial trends over customisable periods.', href: '/financials#trends' },
  ],
  scenarios: [
    { icon: '🧪', title: 'Create What-If Scenarios', description: 'Model different business assumptions and see projected outcomes.', href: '/scenarios#create' },
    { icon: '💬', title: 'Chat-Based Builder', description: 'Describe scenarios in plain English and let AI structure them.', href: '/scenarios#chat' },
    { icon: '⚖️', title: 'Compare Side by Side', description: 'View multiple scenarios against your base case.', href: '/scenarios#compare' },
    { icon: '📊', title: 'Sensitivity Analysis', description: 'See which assumptions have the biggest impact on outcomes.', href: '/scenarios#sensitivity' },
    { icon: '📋', title: 'Export Scenario Report', description: 'Generate a board-ready scenario comparison document.', href: '/scenarios#export' },
  ],
  playbook: [
    { icon: '📋', title: 'View Maturity Score', description: 'See your overall governance maturity rating out of 100.', href: '/playbook#score' },
    { icon: '✅', title: 'Complete Actions', description: 'Work through recommended governance improvements.', href: '/playbook#actions' },
    { icon: '🗺️', title: 'View Roadmap', description: 'See the prioritised path to governance excellence.', href: '/playbook#roadmap' },
    { icon: '📊', title: 'Benchmark Progress', description: 'Compare your maturity against industry standards.', href: '/playbook#benchmark' },
    { icon: '💡', title: 'AI Recommendations', description: 'Get personalised next steps based on your current score.', href: '/playbook#recommend' },
  ],
  reports: [
    { icon: '📋', title: 'Generate Board Pack', description: 'Create a comprehensive PDF report for board meetings.', href: '/reports#generate' },
    { icon: '🎨', title: 'Choose Report Theme', description: 'Select from professional themes that match your brand.', href: '/reports#themes' },
    { icon: '✏️', title: 'Edit Narratives', description: 'Review and refine AI-generated commentary before publishing.', href: '/reports#edit' },
    { icon: '📤', title: 'Share & Export', description: 'Send reports via email or download as PDF.', href: '/reports#share' },
    { icon: '📅', title: 'Schedule Reports', description: 'Set up automatic report generation on a recurring schedule.', href: '/reports#schedule' },
  ],
  modules: [
    { icon: '🧩', title: 'Browse Available Modules', description: 'Explore add-on capabilities for your platform.', href: '/modules#browse' },
    { icon: '⚡', title: 'Activate Modules', description: 'Enable new features with a single click.', href: '/modules#activate' },
    { icon: '🔧', title: 'Configure Settings', description: 'Customise module behaviour to fit your workflow.', href: '/modules#configure' },
    { icon: '📊', title: 'Module Health Check', description: 'Monitor the status and performance of active modules.', href: '/modules#health' },
  ],
  agents: [
    { icon: '🤖', title: 'View Active Agents', description: 'See which AI agents are running and their current status.', href: '/agents#active' },
    { icon: '📊', title: 'Agent Performance', description: 'Review accuracy, speed, and task completion metrics.', href: '/agents#performance' },
    { icon: '🔔', title: 'Review Flagged Items', description: 'Check items agents have flagged for your attention.', href: '/agents#flagged' },
    { icon: '⚙️', title: 'Configure Agents', description: 'Adjust sensitivity thresholds and notification preferences.', href: '/agents#configure' },
  ],
  billing: [
    { icon: '💳', title: 'View Current Plan', description: 'See your subscription details and usage limits.', href: '/billing#plan' },
    { icon: '📊', title: 'Usage Dashboard', description: 'Monitor your API calls, storage, and feature usage.', href: '/billing#usage' },
    { icon: '📄', title: 'Download Invoices', description: 'Access past invoices and payment receipts.', href: '/billing#invoices' },
    { icon: '⬆️', title: 'Upgrade Plan', description: 'Explore higher tiers for more features and capacity.', href: '/billing#upgrade' },
  ],
  consultants: [
    { icon: '👥', title: 'View Engagements', description: 'See all active fractional executive engagements.', href: '/consultants#engagements' },
    { icon: '📊', title: 'Track Deliverables', description: 'Monitor scope, milestones, and progress for each engagement.', href: '/consultants#deliverables' },
    { icon: '💬', title: 'Communication Log', description: 'Review notes and communications with your advisors.', href: '/consultants#comms' },
    { icon: '📋', title: 'Engagement Reports', description: 'Generate summary reports of consultant contributions.', href: '/consultants#reports' },
  ],
  'custom-builds': [
    { icon: '🔌', title: 'View Integrations', description: 'See all custom integrations and their current status.', href: '/custom-builds#integrations' },
    { icon: '🛠️', title: 'Request a Build', description: 'Submit a request for a custom feature or integration.', href: '/custom-builds#request' },
    { icon: '📊', title: 'Integration Health', description: 'Monitor uptime, error rates, and sync status.', href: '/custom-builds#health' },
    { icon: '📄', title: 'API Documentation', description: 'Access docs for your custom endpoints and webhooks.', href: '/custom-builds#docs' },
  ],
};

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4', className)}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-3', className)}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function CapabilitiesShowcase({ section }: CapabilitiesShowcaseProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const capabilities = CAPABILITIES_MAP[section] ?? CAPABILITIES_MAP.dashboard ?? [];

  return (
    <section aria-label="Capabilities">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded((prev) => !prev)}
        className={cn(
          'h-auto px-3 py-2 text-sm font-medium text-muted-foreground',
          'hover:text-foreground hover:bg-muted/50 gap-2'
        )}
      >
        <ChevronDownIcon
          className={cn(
            'size-4 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
        What can I do here?
      </Button>

      {isExpanded && (
        <div
          className={cn(
            'mt-3 bg-muted/30 rounded-xl p-4',
            'animate-in fade-in slide-in-from-top-1 duration-200'
          )}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {capabilities.map((capability) => (
              <a
                key={capability.title}
                href={capability.href}
                className={cn(
                  'group flex flex-col gap-1.5 rounded-lg p-3',
                  'bg-background/60 border border-border/40',
                  'hover:bg-background hover:border-border/60 hover:shadow-sm',
                  'transition-all duration-150'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">
                    {capability.icon}
                  </span>
                  <span className="font-medium text-sm text-foreground">
                    {capability.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                  {capability.description}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors pl-7">
                  Try it
                  <ArrowRightIcon />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
