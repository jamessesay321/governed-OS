'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Activity,
  Beaker,
  Plane,
  Landmark,
  Users,
  RefreshCw,
  Heart,
  FileText,
  Shield,
  CreditCard,
  Bell,
  Settings,
  BarChart3,
  Package,
  UserPlus,
  Lock,
  Zap,
  DollarSign,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuditLog = {
  id: string;
  org_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type NameMap = Record<string, string>;

type FilterTab = 'all' | 'financial' | 'operational' | 'system';

interface ActivityClientProps {
  logs: AuditLog[];
  nameMap: NameMap;
}

// ---------------------------------------------------------------------------
// Filter Configuration
// ---------------------------------------------------------------------------

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'financial', label: 'Financial' },
  { key: 'operational', label: 'Operational' },
  { key: 'system', label: 'System' },
];

const FINANCIAL_ACTIONS = [
  'debt', 'budget', 'tax', 'payroll', 'xero', 'quickbooks', 'invoice',
  'payment', 'subscription', 'stripe', 'revenue', 'cashflow', 'forecast',
  'bridal_payment', 'bridal_order', 'finance', 'account_mapping',
  'data.exported', 'kpi',
];

const OPERATIONAL_ACTIONS = [
  'scenario', 'trunk_show', 'model', 'order', 'monday', 'shopify',
  'bridal_order', 'challenge', 'playbook', 'blueprint', 'dashboard',
  'vault', 'report', 'briefing', 'interview', 'anomaly', 'investor',
  'team', 'custom_kpi', 'assumption',
];

const SYSTEM_ACTIONS = [
  'sync', 'onboarding', 'gdpr', 'integration', 'slack', 'health_check',
  'ai_output', 'org.created', 'advisor', 'invitation', 'preferences',
  'xero.scheduled_sync', 'cron',
];

function getFilterCategory(action: string): FilterTab[] {
  const categories: FilterTab[] = [];
  const lower = action.toLowerCase();

  if (FINANCIAL_ACTIONS.some((a) => lower.includes(a))) categories.push('financial');
  if (OPERATIONAL_ACTIONS.some((a) => lower.includes(a))) categories.push('operational');
  if (SYSTEM_ACTIONS.some((a) => lower.includes(a))) categories.push('system');

  // Default to operational if no category matched
  if (categories.length === 0) categories.push('operational');

  return categories;
}

// ---------------------------------------------------------------------------
// Icon Mapping
// ---------------------------------------------------------------------------

function getActionIcon(action: string) {
  const lower = action.toLowerCase();

  if (lower.startsWith('scenario') || lower.includes('scenario'))
    return { icon: Beaker, color: 'text-violet-600', bg: 'bg-violet-100' };
  if (lower.startsWith('trunk_show') || lower.includes('trunk_show'))
    return { icon: Plane, color: 'text-sky-600', bg: 'bg-sky-100' };
  if (lower.includes('debt_facilit') || lower.includes('debt_facility'))
    return { icon: Landmark, color: 'text-amber-600', bg: 'bg-amber-100' };
  if (lower.includes('payroll'))
    return { icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100' };
  if (lower.includes('sync') || lower.includes('xero') || lower.includes('quickbooks') || lower.includes('shopify') || lower.includes('monday'))
    return { icon: RefreshCw, color: 'text-purple-600', bg: 'bg-purple-100' };
  if (lower.includes('health_check') || lower.includes('anomaly'))
    return { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-100' };
  if (lower.includes('budget') || lower.includes('tax'))
    return { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' };
  if (lower.includes('vault') || lower.includes('report') || lower.includes('export'))
    return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' };
  if (lower.includes('gdpr') || lower.includes('compliance'))
    return { icon: Shield, color: 'text-red-600', bg: 'bg-red-100' };
  if (lower.includes('stripe') || lower.includes('subscription'))
    return { icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-100' };
  if (lower.includes('alert') || lower.includes('briefing') || lower.includes('challenge'))
    return { icon: Bell, color: 'text-orange-600', bg: 'bg-orange-100' };
  if (lower.includes('onboarding') || lower.includes('interview'))
    return { icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' };
  if (lower.includes('kpi') || lower.includes('dashboard') || lower.includes('forecast'))
    return { icon: BarChart3, color: 'text-cyan-600', bg: 'bg-cyan-100' };
  if (lower.includes('bridal') || lower.includes('order'))
    return { icon: Package, color: 'text-pink-600', bg: 'bg-pink-100' };
  if (lower.includes('team') || lower.includes('invitation') || lower.includes('investor'))
    return { icon: UserPlus, color: 'text-teal-600', bg: 'bg-teal-100' };
  if (lower.includes('blueprint') || lower.includes('playbook'))
    return { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100' };
  if (lower.includes('ai_output') || lower.includes('governance'))
    return { icon: Lock, color: 'text-slate-600', bg: 'bg-slate-100' };

  return { icon: Activity, color: 'text-gray-500', bg: 'bg-gray-100' };
}

// ---------------------------------------------------------------------------
// Human-readable Descriptions
// ---------------------------------------------------------------------------

const DESCRIPTION_MAP: Record<string, string> = {
  // Scenarios
  'scenario.created': 'Created a new scenario',
  'scenario.updated': 'Updated a scenario',
  'scenario.duplicated': 'Duplicated a scenario',
  'scenario.locked': 'Locked a scenario',
  'scenario.seeded': 'Seeded strategic plan scenarios',
  'scenario.chat_interpreted': 'Interpreted scenario via AI chat',
  'scenario.chat_confirmed': 'Confirmed scenario chat suggestion',
  'scenario.chat_rejected': 'Rejected scenario chat suggestion',

  // Model
  'model.pipeline_run': 'Ran financial model pipeline',

  // Assumptions
  'assumption_set.created': 'Created a new assumption set',
  'assumption_value.created': 'Added assumption values',
  'segment.upserted': 'Updated scenario segments',

  // Debt
  'debt_facility_created': 'Added a new debt facility',
  'debt_facility_updated': 'Updated a debt facility',
  'debt_facilities_seeded': 'Debt facilities imported',

  // Payroll
  'payroll.group_created': 'Created a payroll group',
  'payroll.member_added': 'Added a team member to payroll',
  'payroll.member_updated': 'Updated a payroll member',
  'payroll.member_deleted': 'Removed a payroll member',
  'payroll.group_deleted': 'Deleted a payroll group',
  'payroll_groups_seeded': 'Payroll groups imported',

  // Trunk shows
  'trunk_show_plan.create': 'Created a trunk show plan',

  // Xero
  'xero.connected': 'Connected Xero integration',
  'xero.disconnected': 'Disconnected Xero integration',
  'xero.sync_completed': 'Xero data sync completed',
  'xero.sync_failed': 'Xero data sync failed',
  'xero.scheduled_sync': 'Scheduled Xero sync ran',

  // QuickBooks
  'quickbooks.connected': 'Connected QuickBooks integration',
  'quickbooks.disconnected': 'Disconnected QuickBooks integration',
  'quickbooks.sync_completed': 'QuickBooks sync completed',
  'quickbooks.sync_failed': 'QuickBooks sync failed',

  // Shopify
  'shopify.connected': 'Connected Shopify integration',
  'shopify.manual_sync': 'Triggered manual Shopify sync',
  'integration.connected': 'Connected a new integration',

  // Monday
  'monday.connected': 'Connected Monday.com integration',
  'monday.board_synced': 'Synced Monday.com board',
  'monday_orders_sync': 'Synced orders from Monday.com',

  // Slack
  'slack.test_message_sent': 'Sent Slack test message',
  'slack.briefing_sent': 'Sent briefing to Slack',

  // Vault
  'vault.item_created': 'Uploaded a new document',
  'vault.version_created': 'Uploaded a new document version',
  'vault.item_archived': 'Archived a document',
  'vault.file_uploaded': 'Uploaded a file to the vault',

  // Budget
  'budget.lines_upserted': 'Updated budget lines',
  'budget.variance_alert': 'Budget variance alert triggered',

  // Tax
  'tax_settings.updated': 'Updated tax settings',

  // KPIs
  'kpi.persisted': 'Saved KPI data',
  'kpi.alert_rule_created': 'Created a KPI alert rule',
  'kpi.alert_rule_updated': 'Updated a KPI alert rule',
  'kpi.alert_rule_deleted': 'Deleted a KPI alert rule',
  'custom_kpi.created': 'Created a custom KPI',
  'custom_kpi.updated': 'Updated a custom KPI',
  'custom_kpi.deleted': 'Deleted a custom KPI',

  // Reports
  'report.generated': 'Generated a report',
  'scheduled_report_created': 'Created a scheduled report',
  'scheduled_report_updated': 'Updated a scheduled report',
  'scheduled_report_deactivated': 'Deactivated a scheduled report',

  // Stripe
  'stripe.checkout.created': 'Started subscription checkout',
  'stripe.portal.opened': 'Opened billing portal',
  'subscription.created': 'Subscription activated',
  'subscription.updated': 'Subscription updated',
  'subscription.cancelled': 'Subscription cancelled',
  'subscription.payment_failed': 'Subscription payment failed',

  // Team
  'team.member_invited': 'Invited a new team member',
  'team.role_changed': 'Changed a team member role',
  'team.member_removed': 'Removed a team member',
  'team.invitation_cancelled': 'Cancelled a team invitation',

  // Invitation
  'invitation.accepted': 'Accepted a team invitation',

  // Onboarding
  'onboarding.completed': 'Completed onboarding',
  'onboarding.skipped': 'Skipped onboarding',
  'onboarding.website_scanned': 'Scanned business website',
  'onboarding.save_basics': 'Saved business basics',
  'onboarding.demo_completed': 'Completed demo setup',
  'onboarding.upgrade_from_demo': 'Upgraded from demo mode',

  // Interview
  'interview.profile_created': 'Created business profile via interview',
  'interview.started': 'Started business interview',
  'interview.stage_skipped': 'Skipped interview stage',
  'interview.message_sent': 'Sent interview message',

  // GDPR
  'gdpr.deletion_requested': 'Requested data deletion',
  'gdpr.deletion_confirmed': 'Confirmed data deletion',
  'gdpr.deletion_executing': 'Data deletion in progress',
  'gdpr.deletion_completed': 'Data deletion completed',
  'gdpr.deletion_failed': 'Data deletion failed',
  'gdpr.deletion_cancelled': 'Cancelled data deletion request',

  // Exports
  'data.exported': 'Exported data',

  // Dashboard
  'dashboard.widgets_saved': 'Saved dashboard widgets',
  'dashboard.widget_config_saved': 'Updated widget configuration',
  'dashboard_preference.updated': 'Updated dashboard preferences',

  // Blueprints & Playbook
  'blueprint.learned': 'Learned a new blueprint',
  'blueprint.applied': 'Applied a blueprint',
  'playbook.action_status_updated': 'Updated playbook action status',
  'playbook.assessment_run': 'Ran playbook assessment',

  // Alerts
  'alert.explanation_requested': 'Requested alert explanation',
  'anomaly.detection_run': 'Ran anomaly detection',

  // Bridal orders
  'bridal_order_created': 'Created a bridal order',
  'bridal_order_updated': 'Updated a bridal order',
  'bridal_order_deleted': 'Deleted a bridal order',
  'bridal_orders_seeded': 'Bridal orders imported',
  'bridal_payment_created': 'Recorded a bridal payment',

  // Investor
  'investor_invite_sent': 'Sent investor invite',
  'investor_invite_accepted': 'Investor accepted invite',
  'investor_access_revoked': 'Revoked investor access',
  'investor_shared_metric_updated': 'Updated shared investor metrics',

  // Advisor
  'advisor.switch_org': 'Switched to client organisation',
  'advisor.switch_clear': 'Returned to own organisation',

  // Org
  'org.created': 'Created organisation',

  // Preferences
  'preferences.updated': 'Updated preferences',

  // Account mappings
  'account_mappings.confirmed': 'Confirmed account mappings',
  'account_mappings.auto_mapped': 'Auto-mapped accounts',

  // Challenges
  'challenge.created': 'Created a new challenge',
  'challenges.digest_sent': 'Sent challenges digest',

  // Briefings
  'key_actions_briefing_generated': 'Generated key actions briefing',

  // AI governance
  'ai_output_created': 'AI output created and checkpointed',
};

function getDescription(action: string): string {
  if (DESCRIPTION_MAP[action]) return DESCRIPTION_MAP[action];

  // Handle ai_output:<type> pattern
  if (action.startsWith('ai_output:')) {
    const outputType = action
      .slice('ai_output:'.length)
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
    return `AI generated ${outputType.toLowerCase()}`;
  }

  // Fallback: transform action string to human-readable
  // e.g. "debt_facilities_seeded" -> "Debt facilities seeded"
  const cleaned = action
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  return cleaned;
}

// ---------------------------------------------------------------------------
// Link Mapping
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getEntityLink(action: string, entityId: string | null): string | null {
  const lower = action.toLowerCase();

  if (lower.includes('scenario') || lower.includes('assumption') || lower.includes('segment'))
    return '/scenarios';
  if (lower.includes('debt'))
    return '/debt';
  if (lower.includes('payroll'))
    return '/staff-costs';
  if (lower.includes('trunk_show'))
    return '/trunk-shows/planner';
  if (lower.includes('vault') || lower.includes('file'))
    return '/vault';
  if (lower.includes('budget'))
    return '/financials/income-statement';
  if (lower.includes('kpi') || lower.includes('custom_kpi'))
    return '/kpi/targets';
  if (lower.includes('dashboard') || lower.includes('widget'))
    return '/dashboard';
  if (lower.includes('report') || lower.includes('scheduled_report'))
    return '/reports';
  if (lower.includes('xero') || lower.includes('quickbooks') || lower.includes('shopify') || lower.includes('monday') || lower.includes('integration') || lower.includes('slack'))
    return '/settings/data';
  if (lower.includes('team') || lower.includes('invitation'))
    return '/settings/team';
  if (lower.includes('stripe') || lower.includes('subscription'))
    return '/settings/billing';
  if (lower.includes('bridal') || lower.includes('order'))
    return '/orders';
  if (lower.includes('anomaly'))
    return '/anomalies';
  if (lower.includes('investor'))
    return '/investors';
  if (lower.includes('tax'))
    return '/settings/account-mappings';
  if (lower.includes('playbook'))
    return '/playbook';
  if (lower.includes('blueprint'))
    return '/blueprints';
  if (lower.includes('interview'))
    return '/interview';
  if (lower.includes('challenge'))
    return '/challenges';
  if (lower.includes('forecast'))
    return '/cashflow-forecast';
  if (lower.includes('briefing'))
    return '/home';
  if (lower.includes('gdpr'))
    return '/settings/data';
  if (lower.includes('alert'))
    return '/kpi/targets';
  if (lower.includes('export'))
    return '/settings/data';

  return null;
}

// ---------------------------------------------------------------------------
// Date Grouping
// ---------------------------------------------------------------------------

type DateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Earlier';

function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  // Start of week (Monday)
  const startOfWeek = new Date(startOfToday);
  const dayOfWeek = startOfToday.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  if (date >= startOfWeek) return 'This Week';
  return 'Earlier';
}

// ---------------------------------------------------------------------------
// Relative Time
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ActivityClient({ logs, nameMap }: ActivityClientProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Filter logs by category
  const filteredLogs = useMemo(() => {
    if (activeTab === 'all') return logs;
    return logs.filter((log) => getFilterCategory(log.action).includes(activeTab));
  }, [logs, activeTab]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<DateGroup, AuditLog[]> = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Earlier': [],
    };

    for (const log of filteredLogs) {
      const group = getDateGroup(log.created_at);
      groups[group].push(log);
    }

    return groups;
  }, [filteredLogs]);

  const groupOrder: DateGroup[] = ['Today', 'Yesterday', 'This Week', 'Earlier'];

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <Activity className="h-7 w-7 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700">
            No activity yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            Once you start using the platform, your recent actions, system
            events, and notifications will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-sm text-gray-500">
              No activity matches this filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupOrder.map((groupName) => {
            const items = grouped[groupName];
            if (items.length === 0) return null;

            return (
              <div key={groupName}>
                {/* Date Group Header */}
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    {groupName}
                  </h3>
                  <div className="h-px flex-1 bg-gray-200" />
                  <Badge
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {items.length}
                  </Badge>
                </div>

                {/* Timeline Items */}
                <div className="space-y-1">
                  {items.map((log) => (
                    <ActivityItem
                      key={log.id}
                      log={log}
                      userName={nameMap[log.user_id]}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Item
// ---------------------------------------------------------------------------

function ActivityItem({
  log,
  userName,
}: {
  log: AuditLog;
  userName?: string;
}) {
  const { icon: Icon, color, bg } = getActionIcon(log.action);
  const description = getDescription(log.action);
  const link = getEntityLink(log.action, log.entity_id);
  const relativeTime = formatRelativeTime(log.created_at);

  const content = (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border border-transparent px-3 py-3 transition-colors',
        link && 'cursor-pointer hover:border-gray-200 hover:bg-gray-50',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          bg,
        )}
      >
        <Icon className={cn('h-4 w-4', color)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{description}</span>
          {log.entity_type && (
            <span className="ml-1.5 text-gray-500">
              &middot; {log.entity_type.replace(/_/g, ' ')}
            </span>
          )}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
          {userName && (
            <>
              <span>{userName}</span>
              <span>&middot;</span>
            </>
          )}
          <time
            dateTime={log.created_at}
            title={new Date(log.created_at).toLocaleString('en-GB')}
          >
            {relativeTime}
          </time>
          {log.entity_id && (
            <>
              <span>&middot;</span>
              <span className="font-mono text-gray-400">
                {log.entity_id.slice(0, 8)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Arrow indicator for clickable items */}
      {link && (
        <div className="mt-1 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}
