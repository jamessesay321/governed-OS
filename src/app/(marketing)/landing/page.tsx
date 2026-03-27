'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  BarChart3, Brain, Shield, Zap, ArrowRight, Check,
  TrendingUp, FileText, Users, Plug, ChevronDown, ChevronUp,
  Layers, Target, PieChart, Globe,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    desc: 'Your dashboard narrates your financials in plain English. Anomalies flagged, opportunities surfaced, risks explained before you ask.',
  },
  {
    icon: Plug,
    title: 'Connect Everything',
    desc: 'Xero, Shopify, Google Drive, Monday.com, Klaviyo and more. Data flows in, gets reconciled, and turns into actionable intelligence.',
  },
  {
    icon: FileText,
    title: 'Management Accounts That Write Themselves',
    desc: 'Upload your Excel or sync from Xero. Grove structures, groups, and presents your data the way your accountant would, automatically.',
  },
  {
    icon: TrendingUp,
    title: 'Scenario Modelling',
    desc: 'Ask "what if we hire 3 more people?" or "what happens if revenue drops 20%?" and see the impact across your entire financial model instantly.',
  },
  {
    icon: Users,
    title: 'Investor Portal',
    desc: 'Create branded data rooms, track investor engagement in real-time, and get an AI readiness score before you pitch.',
  },
  {
    icon: Shield,
    title: 'Governance Built In',
    desc: 'Every data point is tracked, every change audited, every AI decision explainable. GDPR-compliant from day one.',
  },
];

const PRICING = [
  {
    name: 'Starter',
    price: '49',
    period: '/month',
    desc: 'For businesses getting their finances organised.',
    features: [
      'Connect 1 integration (Xero or Shopify)',
      'Dashboard with AI narrative',
      'Monthly management accounts',
      'Up to 2 team members',
      '2,000 AI credits/month',
      'Email support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Growth',
    price: '149',
    period: '/month',
    desc: 'For businesses scaling with confidence.',
    features: [
      'Connect unlimited integrations',
      'Full scenario modelling',
      'Investor Portal with data rooms',
      'Up to 10 team members',
      '10,000 AI credits/month',
      'Procurement and marketing modules',
      'Spreadsheet engine (upload, edit, download)',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For complex businesses with bespoke needs.',
    features: [
      'Everything in Growth',
      'Unlimited team members',
      'Unlimited AI credits',
      'Data commercialisation tools',
      'Custom industry blueprints',
      'Dedicated account manager',
      'Custom integrations',
      'SLA and uptime guarantees',
    ],
    cta: 'Talk to Us',
    popular: false,
  },
];

const FAQS = [
  {
    q: 'How is Grove different from Xero or QuickBooks?',
    a: 'Xero and QuickBooks are accounting tools. They record transactions. Grove sits on top of your accounting software and turns that raw data into management accounts, KPIs, scenarios, and AI-powered insights. Think of Xero as the engine and Grove as the cockpit.',
  },
  {
    q: 'Do I need an accountant to use Grove?',
    a: 'No. Grove is designed for business owners and operators who want to understand their numbers without needing a finance degree. That said, Grove also works brilliantly for fractional CFOs and advisors managing multiple clients.',
  },
  {
    q: 'How long does setup take?',
    a: 'About 10 minutes. Connect your Xero or Shopify account, answer a few questions about your business in our onboarding interview, and Grove builds your personalised dashboard. If you have Excel files, you can upload those too.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All data is encrypted at rest and in transit. We use Supabase (built on PostgreSQL) with row-level security, meaning each business can only access their own data. We are GDPR-compliant and working toward SOC 2 certification.',
  },
  {
    q: 'Can I try it before committing?',
    a: 'Absolutely. Every plan includes a 14-day free trial with full access. You can also explore with demo data to see how the platform works before connecting your real accounts.',
  },
  {
    q: 'What integrations do you support?',
    a: 'Currently live: Xero. Coming soon: Shopify, QuickBooks, Google Drive, OneDrive, Monday.com, Klaviyo, Stripe, and more. We add new integrations based on customer demand.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-base font-medium text-gray-900 pr-4">{q}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-gray-500" />
        )}
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-gray-600">{a}</p>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/landing" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <Layers className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Grove</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-blue-50" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700">
              <Zap className="h-3.5 w-3.5" />
              Now in early access
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Your finances,{' '}
              <span className="text-emerald-600">finally clear</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
              Grove connects your accounting, sales, and operations into one intelligent
              platform. Get AI-powered management accounts, real-time KPIs, and
              investor-ready reports without the spreadsheet chaos.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-medium text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all hover:shadow-xl"
              >
                Start Your Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
              >
                Try With Demo Data
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              14-day free trial. No credit card required. Cancel anytime.
            </p>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { label: 'KPIs Tracked', value: '35+' },
              { label: 'Integrations', value: '25+' },
              { label: 'Setup Time', value: '10 min' },
              { label: 'AI Credits Free', value: '2,000' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-gray-900 sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-gray-100 bg-gray-50 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-wider">
            Trusted by forward-thinking businesses
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {['Xero', 'Shopify', 'Stripe', 'Google', 'Monday.com'].map((name) => (
              <span key={name} className="text-lg font-semibold text-gray-300">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to run your finances with confidence
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Stop jumping between spreadsheets, accounting tools, and email. Grove brings it all together.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <feature.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-gray-100 bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              From chaos to clarity in three steps
            </h2>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '01',
                icon: Plug,
                title: 'Connect your tools',
                desc: 'Link Xero, Shopify, or upload your Excel files. Grove ingests, maps, and reconciles your data automatically.',
              },
              {
                step: '02',
                icon: Target,
                title: 'Tell us about your business',
                desc: 'A short AI-guided interview personalises your dashboard, KPIs, and insights to your industry and goals.',
              },
              {
                step: '03',
                icon: PieChart,
                title: 'Get clarity instantly',
                desc: 'Your personalised dashboard is live. AI narratives explain your numbers. Scenarios let you plan ahead. Reports generate themselves.',
              },
            ].map((step) => (
              <div key={step.step} className="relative rounded-xl bg-white p-6 shadow-sm">
                <span className="text-4xl font-bold text-emerald-100">{step.step}</span>
                <div className="mt-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <step.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Start free for 14 days. Scale as you grow.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 ${
                  plan.popular
                    ? 'border-emerald-300 bg-white shadow-lg ring-1 ring-emerald-300'
                    : 'border-gray-200 bg-white shadow-sm'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-medium text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{plan.desc}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  {plan.price !== 'Custom' && (
                    <span className="text-sm font-medium text-gray-500">&pound;</span>
                  )}
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-gray-500">{plan.period}</span>
                  )}
                </div>
                <Link
                  href="/signup"
                  className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-colors ${
                    plan.popular
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {plan.cta}
                </Link>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-gray-100 bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-12">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 px-8 py-16 text-center shadow-xl sm:px-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to see your finances clearly?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-emerald-100">
              Join businesses that have replaced spreadsheet chaos with AI-powered financial clarity.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-medium text-emerald-700 shadow-sm hover:bg-emerald-50 transition-colors"
              >
                Start Your Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-4 text-sm text-emerald-200">
              14-day free trial. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600">
                  <Layers className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">Grove</span>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                The financial operating system for ambitious businesses.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Product</h4>
              <ul className="mt-3 space-y-2">
                <li><a href="#features" className="text-sm text-gray-500 hover:text-gray-700">Features</a></li>
                <li><a href="#pricing" className="text-sm text-gray-500 hover:text-gray-700">Pricing</a></li>
                <li><Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">Log in</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Company</h4>
              <ul className="mt-3 space-y-2">
                <li><Link href="/about" className="text-sm text-gray-500 hover:text-gray-700">About</Link></li>
                <li><Link href="/contact" className="text-sm text-gray-500 hover:text-gray-700">Contact</Link></li>
                <li><Link href="/roadmap" className="text-sm text-gray-500 hover:text-gray-700">Roadmap</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Legal</h4>
              <ul className="mt-3 space-y-2">
                <li><Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">Privacy Policy</Link></li>
                <li><Link href="/cookies" className="text-sm text-gray-500 hover:text-gray-700">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-100 pt-8 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Grove. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
