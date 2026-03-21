'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Help & Support Centre                                               */
/* ------------------------------------------------------------------ */

const HELP_CATEGORIES = [
  {
    title: 'Getting Started',
    icon: '🚀',
    articles: [
      'How to connect your accounting software',
      'Setting up your business profile',
      'Understanding the dashboard',
      'Inviting team members',
    ],
  },
  {
    title: 'Financial Data',
    icon: '📊',
    articles: [
      'Interpreting your P&L statement',
      'Reading the balance sheet',
      'Cash flow analysis guide',
      'Budget vs actual explained',
    ],
  },
  {
    title: 'AI Agents',
    icon: '🤖',
    articles: [
      'How AI agents work',
      'Customising agent instructions',
      'Understanding agent timesheets',
      'Managing agent subscriptions',
    ],
  },
  {
    title: 'Modules & Features',
    icon: '🧩',
    articles: [
      'Activating and deactivating modules',
      'Credit system explained',
      'Module pricing tiers',
      'Recommended modules for your industry',
    ],
  },
  {
    title: 'Reports & Exports',
    icon: '📄',
    articles: [
      'Creating board packs',
      'Customising report templates',
      'Exporting data to PDF and Excel',
      'Scheduling automated reports',
    ],
  },
  {
    title: 'Billing & Account',
    icon: '💳',
    articles: [
      'Understanding your invoice',
      'Changing your payment method',
      'Upgrading or downgrading your plan',
      'Referral programme details',
    ],
  },
];

const FAQ = [
  { q: 'How does the AI know about my business?', a: 'Our AI analyses data from your connected accounting software and any information you provide in your business profile. The more context you give, the more accurate and personalised the insights become.' },
  { q: 'Is my financial data secure?', a: 'Absolutely. We use 256-bit encryption in transit and at rest, maintain SOC 2 compliance, and implement role-based access controls. Your data is never shared with third parties or used to train AI models.' },
  { q: 'Can I use the platform with multiple entities?', a: 'Yes. The Multi-Entity module allows you to manage and consolidate multiple businesses within a single dashboard. Each entity maintains its own data silo with configurable access permissions.' },
  { q: 'How do credits work?', a: 'Credits are used to access premium module features. Each module has a monthly credit cost based on your plan tier. Credits reset monthly and unused credits do not roll over.' },
  { q: 'Can I cancel at any time?', a: 'Yes. All subscriptions are month-to-month with no long-term commitments. You can cancel agent subscriptions or change your module plan at any time from the Billing page.' },
];

export default function HelpPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex-1 space-y-8 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1c1b1b' }}>
          Help & Support
        </h1>
        <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
          Find answers, explore guides, and get in touch with our team.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-lg mx-auto">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help articles..."
            className="w-full rounded-xl border bg-white pl-10 pr-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-t-4 border-t-blue-500 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6 text-center">
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="text-sm font-semibold">Live Chat</p>
            <p className="text-xs text-muted-foreground mt-1">Chat with our support team</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-emerald-500 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6 text-center">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <p className="text-sm font-semibold">Email Support</p>
            <p className="text-xs text-muted-foreground mt-1">support@governed.os</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-amber-500 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6 text-center">
            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
              <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="text-sm font-semibold">Documentation</p>
            <p className="text-xs text-muted-foreground mt-1">Guides & API reference</p>
          </CardContent>
        </Card>
      </div>

      {/* Help Categories */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#1c1b1b' }}>Browse by Topic</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HELP_CATEGORIES.filter((cat) =>
            !searchQuery || cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cat.articles.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
          ).map((cat) => (
            <Card key={cat.title} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">{cat.icon}</span>
                  {cat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {cat.articles.map((article) => (
                    <li key={article} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                      <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                      {article}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#1c1b1b' }}>Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQ.map((item, idx) => (
            <div key={idx} className="rounded-lg border bg-card">
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-medium pr-4">{item.q}</span>
                <svg
                  className={cn('h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform', expandedFaq === idx && 'rotate-180')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {expandedFaq === idx && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Platform Status */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium">All Systems Operational</p>
                <p className="text-xs text-muted-foreground">Last checked 2 minutes ago</p>
              </div>
            </div>
            <button className="text-sm font-medium text-primary hover:underline">
              View Status Page
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
