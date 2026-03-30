'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  DollarSign,
  Brain,
  FileText,
  CheckCircle2,
  Circle,
  ArrowRight,
} from 'lucide-react';
import { EmptyStateIllustration } from '@/components/ui/illustrations';

type Props = {
  displayName: string;
  profileComplete: boolean;
  integrationConnected: boolean;
  lastSyncAt: string | null;
  lastSyncRecords: number | null;
};

const quickLinks = [
  {
    title: 'Dashboard',
    description: 'Overview of your business metrics',
    href: '/dashboard',
    icon: LayoutDashboard,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    title: 'Financials',
    description: 'Revenue, expenses, and cash flow',
    href: '/financials',
    icon: DollarSign,
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    title: 'Intelligence',
    description: 'AI-powered insights and analysis',
    href: '/intelligence',
    icon: Brain,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    title: 'Reports',
    description: 'Generate and view reports',
    href: '/reports',
    icon: FileText,
    color: 'text-amber-600 bg-amber-50',
  },
];

export function HomeClient({
  displayName,
  profileComplete,
  integrationConnected,
  lastSyncAt,
  lastSyncRecords,
}: Props) {
  const [dashboardExplored, setDashboardExplored] = useState(false);

  const setupSteps = [
    { label: 'Set up your Business Profile', href: '/interview', id: 'profile', done: profileComplete },
    { label: 'Connect your first integration', href: '/integrations', id: 'integration', done: integrationConnected },
    { label: 'Explore your Dashboard', href: '/dashboard', id: 'dashboard', done: dashboardExplored },
  ];

  const completedCount = setupSteps.filter((s) => s.done).length;
  const progressPercent = (completedCount / setupSteps.length) * 100;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Welcome to Grove
        </h1>
        <p className="mt-1 text-gray-500">
          Good to see you. Here&apos;s your command centre
        </p>
      </div>

      {/* Getting Started Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
            <p className="text-sm text-gray-500">
              Complete these steps to set up your workspace
            </p>
          </div>
          <Link
            href="/home/getting-started"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View full guide
            <ArrowRight className="ml-1 inline-block h-4 w-4" />
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              {completedCount}/{setupSteps.length} complete
            </span>
            <span className="text-gray-500">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn(
                'h-full rounded-full bg-blue-600 transition-all duration-500',
                completedCount === setupSteps.length && 'bg-emerald-500'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <ul className="mt-4 space-y-3">
          {setupSteps.map((step) => (
            <li key={step.id} className="flex items-center gap-3">
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
              ) : step.id === 'dashboard' ? (
                <button
                  type="button"
                  onClick={() => setDashboardExplored(true)}
                  className="flex-shrink-0"
                  aria-label={`Mark "${step.label}" complete`}
                >
                  <Circle className="h-5 w-5 text-gray-300" />
                </button>
              ) : (
                <Circle className="h-5 w-5 flex-shrink-0 text-gray-300" />
              )}
              <Link
                href={step.href}
                className={cn(
                  'text-sm font-medium hover:underline',
                  step.done ? 'text-gray-400 line-through' : 'text-gray-700'
                )}
              >
                {step.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Last sync info */}
        {integrationConnected && lastSyncAt && (
          <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
            Last synced: {new Date(lastSyncAt).toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {lastSyncRecords != null && ` \u00b7 ${lastSyncRecords} records`}
          </div>
        )}
      </div>

      {/* Quick Links Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Links</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={cn(
                  'mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg',
                  link.color
                )}
              >
                <link.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                {link.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Link
            href="/home/activity"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all
          </Link>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center py-6 text-center">
          <EmptyStateIllustration className="mb-3" />
          <p className="text-sm font-medium text-gray-500">No activity yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Complete setup to get started
          </p>
        </div>
      </div>
    </div>
  );
}
