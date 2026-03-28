'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation structure: grouped with collapsible sub-items         */
/* ------------------------------------------------------------------ */

interface NavChild {
  href: string;
  label: string;
  free?: boolean;
}

interface NavGroup {
  group: string;
  icon: string;
  children: NavChild[];
  /** If set, the group label itself is a link (e.g. Dashboard) */
  href?: string;
  free?: boolean;
}

const navigation: NavGroup[] = [
  // ── GET STARTED ──
  {
    group: 'Home',
    icon: 'Home',
    href: '/home',
    children: [
      { href: '/home', label: 'Overview' },
      { href: '/home/getting-started', label: 'Getting Started' },
      { href: '/home/activity', label: 'Recent Activity' },
    ],
  },
  {
    group: 'Business Profile',
    icon: 'Building',
    href: '/interview',
    children: [
      { href: '/interview', label: 'Company Info' },
      { href: '/interview/team', label: 'Team' },
      { href: '/interview/documents', label: 'Documents' },
    ],
  },

  // ── OVERVIEW ──
  {
    group: 'Dashboard',
    icon: 'BarChart3',
    href: '/dashboard',
    children: [
      { href: '/dashboard', label: 'CEO Overview' },
      { href: '/dashboard/revenue', label: 'Revenue' },
      { href: '/dashboard/profitability', label: 'Profitability' },
      { href: '/dashboard/widgets', label: 'Widgets' },
      { href: '/dashboard/alerts', label: 'Alerts' },
    ],
  },
  {
    group: 'Financials',
    icon: 'Table',
    href: '/financials',
    children: [
      { href: '/financials', label: 'Summary' },
      { href: '/financials/income-statement', label: 'Income Statement' },
      { href: '/financials/balance-sheet', label: 'Balance Sheet' },
      { href: '/financials/cash-flow', label: 'Cash Flow' },
      { href: '/financials/budget', label: 'Budget vs Actual' },
    ],
  },
  {
    group: 'KPIs',
    icon: 'Activity',
    href: '/kpi',
    children: [
      { href: '/kpi', label: 'Dashboard' },
      { href: '/kpi/targets', label: 'Targets' },
      { href: '/kpi/custom', label: 'Custom KPIs' },
    ],
  },
  {
    group: 'Variance',
    icon: 'GitCompare',
    href: '/variance',
    children: [
      { href: '/variance', label: 'Period Comparison' },
      { href: '/variance/budget', label: 'Budget vs Actual' },
      { href: '/variance/drill-down', label: 'Drill-Down' },
    ],
  },

  // ── ANALYTICS ──
  {
    group: 'Graph Studio',
    icon: 'TrendingUp',
    href: '/graphs',
    children: [
      { href: '/graphs', label: 'Gallery' },
      { href: '/graphs/builder', label: 'Graph Builder' },
      { href: '/graphs/saved', label: 'Saved Charts' },
    ],
  },
  {
    group: 'Spreadsheets',
    icon: 'Sheet',
    href: '/spreadsheets',
    children: [
      { href: '/spreadsheets/workspace', label: 'Workspace' },
      { href: '/spreadsheets/templates', label: 'Templates' },
    ],
  },
  {
    group: 'Forecast',
    icon: 'TrendingUp',
    href: '/forecast',
    children: [],
  },
  {
    group: 'Scenarios',
    icon: 'Layers',
    href: '/scenarios',
    children: [
      { href: '/scenarios', label: 'Scenario Builder' },
      { href: '/scenarios/goalseek', label: 'Goalseek' },
      { href: '/scenarios/compare', label: 'Compare' },
    ],
  },
  {
    group: 'Assumptions',
    icon: 'Sliders',
    href: '/assumptions',
    children: [],
  },

  // ── STRATEGY ──
  {
    group: 'Intelligence',
    icon: 'Lightbulb',
    href: '/intelligence',
    children: [
      { href: '/intelligence', label: 'AI Insights' },
      { href: '/intelligence/anomalies', label: 'Anomalies' },
      { href: '/intelligence/trends', label: 'Trends' },
    ],
  },
  {
    group: 'Playbook',
    icon: 'Compass',
    href: '/playbook',
    children: [
      { href: '/playbook', label: 'Actions' },
      { href: '/playbook/assessment', label: 'Assessment' },
      { href: '/playbook/history', label: 'History' },
    ],
  },

  // ── OPERATIONS ──
  {
    group: 'Marketing',
    icon: 'Megaphone',
    href: '/marketing',
    children: [
      { href: '/marketing/overview', label: 'Overview' },
      { href: '/marketing/organic', label: 'Organic Social' },
      { href: '/marketing/paid', label: 'Paid Ads' },
      { href: '/marketing/seo', label: 'SEO' },
      { href: '/marketing/content', label: 'Content Calendar' },
    ],
  },

  // ── REPORTING ──
  {
    group: 'Reports',
    icon: 'FileText',
    href: '/reports',
    children: [
      { href: '/reports', label: 'Board Packs' },
      { href: '/reports/builder', label: 'Report Builder' },
      { href: '/reports/new', label: 'Custom Reports' },
      { href: '/reports/templates', label: 'Templates' },
    ],
  },
  {
    group: 'Knowledge Vault',
    icon: 'Archive',
    href: '/vault',
    children: [
      { href: '/vault', label: 'Documents' },
      { href: '/vault/guides', label: 'Guides' },
      { href: '/vault/ai-outputs', label: 'AI Outputs' },
    ],
  },

  // ── INVESTOR PORTAL ──
  {
    group: 'Investor Portal',
    icon: 'Briefcase',
    href: '/investors',
    children: [
      { href: '/investors', label: 'Dashboard' },
      { href: '/investors/updates', label: 'Updates' },
      { href: '/investors/documents', label: 'Document Vault' },
    ],
  },

  // ── AI & AGENTS ──
  {
    group: 'AI Agents',
    icon: 'Bot',
    href: '/agents',
    children: [
      { href: '/agents', label: 'Overview' },
      { href: '/agents/hub', label: 'Agent Hub' },
      { href: '/agents/activity', label: 'Agent Activity' },
    ],
  },
  {
    group: 'AI Strategy',
    icon: 'Sparkles',
    href: '/ai-solutions',
    children: [
      { href: '/ai-solutions', label: 'Overview' },
      { href: '/ai-solutions/audit', label: 'AI Stack Audit', free: true },
      { href: '/proposal', label: 'Your Proposal' },
      { href: '/ai-solutions/packages', label: 'Packages' },
    ],
  },

  // ── MARKETPLACE ──
  {
    group: 'Modules',
    icon: 'Blocks',
    href: '/modules',
    children: [
      { href: '/modules', label: 'Marketplace' },
      { href: '/modules/active', label: 'Active Modules' },
      { href: '/modules/credits', label: 'Credits' },
    ],
  },
  {
    group: 'Consultants',
    icon: 'MessageSquare',
    href: '/consultants',
    children: [
      { href: '/consultants', label: 'Browse Consultants' },
      { href: '/consultants/requests', label: 'My Requests' },
    ],
  },
  {
    group: 'Custom AI Builds',
    icon: 'Wrench',
    href: '/custom-builds',
    children: [
      { href: '/custom-builds', label: 'Submit Project' },
      { href: '/custom-builds/projects', label: 'My Projects' },
    ],
  },

  // ── DATA & GOVERNANCE ──
  {
    group: 'Data Pipeline',
    icon: 'ShieldCheck',
    href: '/staging',
    children: [
      { href: '/staging', label: 'Staging & Waiting Room' },
      { href: '/staging?tab=account-mapping', label: 'Account Mapping' },
      { href: '/staging?tab=checkpoints', label: 'Checkpoints' },
      { href: '/integrations/health', label: 'Data Health' },
    ],
  },
  {
    group: 'Integrations',
    icon: 'Plug',
    href: '/integrations',
    children: [
      { href: '/integrations', label: 'Connected' },
      { href: '/integrations/catalogue', label: 'Catalogue' },
    ],
  },
  {
    group: 'Trust Centre',
    icon: 'Lock',
    href: '/governance',
    children: [
      { href: '/governance?tab=privacy', label: 'Data & Privacy' },
      { href: '/governance?tab=compliance', label: 'Compliance' },
      { href: '/audit', label: 'Audit Log' },
    ],
  },

  // ── PROCUREMENT (lower priority) ──
  {
    group: 'Procurement',
    icon: 'ShoppingCart',
    href: '/procurement',
    children: [
      { href: '/procurement/overview', label: 'Overview' },
      { href: '/procurement/suppliers', label: 'Suppliers' },
      { href: '/procurement/rfq', label: 'RFQ' },
      { href: '/procurement/spend', label: 'Spend Analytics' },
      { href: '/procurement/approvals', label: 'Approvals' },
    ],
  },
  {
    group: 'Data Commerce',
    icon: 'Database',
    href: '/data-commerce',
    children: [
      { href: '/data-commerce/overview', label: 'Overview' },
      { href: '/data-commerce/products', label: 'Data Products' },
      { href: '/data-commerce/compliance', label: 'GDPR Compliance' },
      { href: '/data-commerce/pricing', label: 'Pricing' },
    ],
  },

  // ── SETTINGS ──
  {
    group: 'Billing & Plans',
    icon: 'CreditCard',
    href: '/billing',
    children: [
      { href: '/billing', label: 'Overview' },
      { href: '/billing/pricing', label: 'Pricing & Bundles' },
      { href: '/billing/referrals', label: 'Referrals' },
    ],
  },
  {
    group: 'Settings',
    icon: 'Settings',
    href: '/settings',
    children: [
      { href: '/settings', label: 'Account' },
      { href: '/settings/team', label: 'Team & Roles' },
      { href: '/settings/preferences', label: 'Preferences' },
      { href: '/settings/blueprints', label: 'Industry Blueprints' },
      { href: '/settings/exports', label: 'Data Exports' },
    ],
  },
  {
    group: 'Roadmap',
    icon: 'Rocket',
    href: '/roadmap',
    free: true,
    children: [],
  },
  {
    group: 'Help & Support',
    icon: 'Help',
    href: '/help',
    children: [],
  },
];

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                         */
/* ------------------------------------------------------------------ */

const icons: Record<string, React.ReactNode> = {
  Home: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  BarChart3: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  Table: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M3 6h18M3 18h18M8 6v12M16 6v12" />
    </svg>
  ),
  Layers: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  Plug: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Settings: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Shield: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  ShieldCheck: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  ),
  FileText: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 16h6M9 12h6" />
    </svg>
  ),
  Sheet: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  ),
  Lightbulb: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a7 7 0 00-4 12.73V17a1 1 0 001 1h6a1 1 0 001-1v-2.27A7 7 0 0012 2zM9 21h6" />
    </svg>
  ),
  Activity: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  Megaphone: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l18-5v12L3 13v-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.6 16.8a3 3 0 11-5.8-1.6" />
    </svg>
  ),
  GitCompare: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 6h3a2 2 0 012 2v7M6 9v12" />
    </svg>
  ),
  Compass: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  ),
  MessageSquare: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  Archive: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Building: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  TrendingUp: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  HeartPulse: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2-4 3 8 2-4h7" />
    </svg>
  ),
  Blocks: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <rect x="2" y="2" width="8" height="8" rx="1" />
      <rect x="14" y="2" width="8" height="8" rx="1" />
      <rect x="2" y="14" width="8" height="8" rx="1" />
      <rect x="14" y="14" width="8" height="8" rx="1" />
    </svg>
  ),
  Bot: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v4M8 16h.01M16 16h.01" />
    </svg>
  ),
  CreditCard: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 10h22" />
    </svg>
  ),
  Help: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
    </svg>
  ),
  Rocket: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-6.233 0c-1.174 1.174-2.272 6.233 0 6.233 1.174-1.174 6.233-2.272 6.233 0z" />
    </svg>
  ),
  Brain: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Sparkles: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  ),
  Lock: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Search: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Wrench: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z" />
    </svg>
  ),
  ShoppingCart: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  ),
  Database: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Briefcase: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  ),
  Globe: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  ChevronDown: (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/*  Section labels for visual grouping                                */
/* ------------------------------------------------------------------ */

const sectionBreaks: Record<number, string> = {
  0: 'GET STARTED',        // Home, Business Profile
  2: 'OVERVIEW',           // Dashboard, Financials, KPIs, Variance
  6: 'ANALYTICS',          // Graph Studio, Spreadsheets, Forecast, Scenarios, Assumptions
  11: 'STRATEGY',          // Intelligence, Playbook
  13: 'OPERATIONS',        // Marketing
  14: 'REPORTING',         // Reports, Knowledge Vault
  16: 'INVESTORS',         // Investor Portal
  17: 'AI & AGENTS',       // AI Agents, AI Strategy
  19: 'MARKETPLACE',       // Modules, Consultants, Custom AI Builds
  22: 'DATA & GOVERNANCE', // Data Pipeline, Integrations, Trust Centre
  25: 'PROCUREMENT',       // Procurement, Data Commerce
  27: 'ADMIN',             // Billing & Plans, Settings, Roadmap, Help
};

/* ------------------------------------------------------------------ */
/*  Sidebar Component                                                 */
/* ------------------------------------------------------------------ */

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

export function Sidebar({ className, onClose }: SidebarProps = {}) {
  const pathname = usePathname();

  // Track which groups are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // Auto-expand the group that contains the current path
    const initial: Record<string, boolean> = {};
    for (const nav of navigation) {
      const isActive =
        (nav.href && (pathname === nav.href || pathname.startsWith(nav.href + '/'))) ||
        nav.children.some(
          (c) => pathname === c.href || pathname.startsWith(c.href + '/')
        );
      if (isActive) initial[nav.group] = true;
    }
    return initial;
  });

  const toggleGroup = (group: string) => {
    setExpanded((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <aside className={cn("flex h-full w-64 flex-col border-r bg-muted/30 overflow-y-auto", className)}>
      {/* Logo / Brand */}
      <Link href="/home" className="flex h-14 items-center border-b px-6 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">G</span>
          </div>
          <h1 className="text-lg font-semibold">Grove</h1>
        </div>
      </Link>

      <nav className="flex-1 py-2 px-3">
        {/* Pinned quick-access items */}
        <div className="mb-2 space-y-0.5">
          {[
            { href: '/dashboard', label: 'Dashboard', icon: 'BarChart3' },
            { href: '/kpi', label: 'KPIs', icon: 'Activity' },
            { href: '/intelligence', label: 'Intelligence', icon: 'Sparkles' },
          ].map((pin) => {
            const isPinActive = pathname === pin.href || pathname.startsWith(pin.href + '/');
            return (
              <Link
                key={pin.href}
                href={pin.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isPinActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {icons[pin.icon]}
                {pin.label}
                <span className="ml-auto">
                  <svg className="h-3 w-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>
        <div className="border-t border-border/40 mb-2" />

        {navigation.map((nav, idx) => {
          const isGroupActive =
            (nav.href && (pathname === nav.href || pathname.startsWith(nav.href + '/'))) ||
            nav.children.some(
              (c) => pathname === c.href || pathname.startsWith(c.href + '/')
            );
          const isOpen = expanded[nav.group] || false;
          const hasChildren = nav.children.length > 0;

          // Section label
          const sectionLabel = sectionBreaks[idx];

          return (
            <div key={nav.group}>
              {/* Section divider */}
              {sectionLabel && (
                <div className={cn('px-3 pt-4 pb-1', idx === 0 && 'pt-2')}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {sectionLabel}
                  </span>
                </div>
              )}

              {/* Group header */}
              <div className="flex items-center">
                <Link
                  href={nav.href || nav.children[0]?.href || '#'}
                  className={cn(
                    'flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isGroupActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {icons[nav.icon]}
                  {nav.group}
                  {nav.free && (
                    <span className="ml-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Free
                    </span>
                  )}
                </Link>
                {hasChildren && (
                  <button
                    onClick={() => toggleGroup(nav.group)}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mr-1"
                    aria-label={`Toggle ${nav.group}`}
                  >
                    <div
                      className={cn(
                        'transition-transform duration-200',
                        isOpen ? 'rotate-0' : '-rotate-90'
                      )}
                    >
                      {icons.ChevronDown}
                    </div>
                  </button>
                )}
              </div>

              {/* Sub-items */}
              {hasChildren && isOpen && (
                <div className="ml-5 border-l border-muted pl-3 mt-0.5 mb-1 space-y-0.5">
                  {nav.children.map((child) => {
                    const isChildActive =
                      pathname === child.href ||
                      pathname.startsWith(child.href + '/');
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                          isChildActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {child.label}
                        {child.free && (
                          <span className={cn(
                            'ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
                            isChildActive
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          )}>
                            Free
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Data completeness indicator */}
      <div className="border-t p-4">
        <div className="text-xs font-medium text-muted-foreground mb-2">Data Completeness</div>
        <div className="w-full bg-muted rounded-full h-2 mb-1">
          <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: '0%' }} />
        </div>
        <div className="text-[10px] text-muted-foreground">Connect integrations to get started</div>
      </div>
    </aside>
  );
}
