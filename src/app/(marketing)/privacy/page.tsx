import Link from 'next/link';
import { Layers, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Grove',
  description:
    'Privacy Policy for Grove. Learn how we collect, use, and protect your personal data in compliance with GDPR.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/landing" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <Layers className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Grove</span>
          </Link>
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

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/landing"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: March 2026</p>

        <div className="mt-10 space-y-10">
          {/* 1. Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Grove (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to
              protecting your personal data and respecting your privacy. This Privacy Policy
              explains how we collect, use, store, and share your information when you use the
              Grove platform and related services.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We operate in accordance with the UK General Data Protection Regulation (UK GDPR)
              and the Data Protection Act 2018. Grove acts as a data controller for personal
              data collected through the Service.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              <strong className="text-gray-700">ICO Registration:</strong> Grove is registered
              with the Information Commissioner&apos;s Office (ICO). Registration number:
              [ICO registration number pending].
            </p>
          </section>

          {/* 2. What We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. What We Collect</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We collect the following types of information:
            </p>
            <h3 className="mt-4 text-base font-medium text-gray-800">
              Information you provide directly
            </h3>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>Account details: name, email address, company name, and role.</li>
              <li>Billing information: payment card details (processed securely by our payment provider; we do not store full card numbers).</li>
              <li>Onboarding responses: information about your business provided during the AI-guided interview.</li>
              <li>Support communications: messages you send to our support team.</li>
            </ul>
            <h3 className="mt-4 text-base font-medium text-gray-800">
              Information from integrations
            </h3>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>Financial data from Xero (invoices, transactions, chart of accounts, contacts).</li>
              <li>Sales and order data from Shopify (orders, products, customers).</li>
              <li>Data from other integrations you choose to connect.</li>
            </ul>
            <h3 className="mt-4 text-base font-medium text-gray-800">
              Information collected automatically
            </h3>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>Usage data: pages visited, features used, actions taken within the Service.</li>
              <li>Device and browser information: IP address, browser type, operating system, and screen resolution.</li>
              <li>Cookies and similar technologies (see our{' '}
                <Link href="/cookies" className="text-emerald-600 hover:text-emerald-700 underline">
                  Cookie Policy
                </Link>
                ).
              </li>
            </ul>
          </section>

          {/* 3. How We Use It */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. How We Use Your Information</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We use your information to:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>Provide, maintain, and improve the Service.</li>
              <li>Generate AI-powered insights, management accounts, and reports based on your data.</li>
              <li>Process payments and manage your subscription.</li>
              <li>Send you important updates about the Service, including security alerts and billing notifications.</li>
              <li>Provide customer support and respond to your enquiries.</li>
              <li>Analyse usage patterns to improve the platform and develop new features.</li>
              <li>Comply with legal obligations and protect our rights.</li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We will never sell your personal data to third parties. We do not use your
              financial data for advertising purposes.
            </p>
          </section>

          {/* 4. Legal Basis (GDPR) */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Legal Basis for Processing (GDPR)</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Under the UK GDPR, we rely on the following legal bases for processing your
              personal data:
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-gray-600">
              <li>
                <strong className="text-gray-700">Contract performance:</strong> Processing
                necessary to provide the Service to you, including account management, data
                processing, and generating reports.
              </li>
              <li>
                <strong className="text-gray-700">Legitimate interests:</strong> Processing
                for purposes such as improving the Service, ensuring security, preventing
                fraud, and conducting analytics. We balance our interests against your rights
                and freedoms.
              </li>
              <li>
                <strong className="text-gray-700">Consent:</strong> Where we send you
                marketing communications or use non-essential cookies, we do so based on your
                consent. You can withdraw consent at any time.
              </li>
              <li>
                <strong className="text-gray-700">Legal obligation:</strong> Processing
                necessary to comply with applicable laws, such as tax and accounting
                requirements.
              </li>
            </ul>
          </section>

          {/* 5. Data Sharing */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Data Sharing</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We share your data only in the following circumstances:
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-gray-600">
              <li>
                <strong className="text-gray-700">Service providers:</strong> We use trusted
                third-party providers to help deliver the Service. Our primary data processor
                is <strong>Supabase</strong> (database hosting and authentication), which
                stores data on secure, encrypted infrastructure. We also work with payment
                processors and email service providers.
              </li>
              <li>
                <strong className="text-gray-700">Integration partners:</strong> When you
                connect integrations such as <strong>Xero</strong> or{' '}
                <strong>Shopify</strong>, data flows between Grove and these platforms as
                necessary to provide the connected features. These partners have their own
                privacy policies.
              </li>
              <li>
                <strong className="text-gray-700">Legal requirements:</strong> We may disclose
                your data if required by law, regulation, or legal process, or if we believe
                disclosure is necessary to protect our rights, your safety, or the safety of
                others.
              </li>
              <li>
                <strong className="text-gray-700">Business transfers:</strong> In the event of
                a merger, acquisition, or sale of assets, your data may be transferred as part
                of that transaction. We will notify you of any such change.
              </li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              All third-party processors are bound by data processing agreements that require
              them to protect your data in accordance with GDPR standards.
            </p>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Data Retention</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We retain your personal data only for as long as necessary to fulfil the
              purposes outlined in this policy:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>
                <strong className="text-gray-700">Active accounts:</strong> We retain your
                data for as long as your account is active and you continue to use the Service.
              </li>
              <li>
                <strong className="text-gray-700">Closed accounts:</strong> After you close
                your account, we retain certain data for up to 12 months to comply with legal
                obligations, resolve disputes, and enforce our agreements.
              </li>
              <li>
                <strong className="text-gray-700">Financial records:</strong> We may retain
                billing and transaction records for up to 7 years as required by UK tax and
                accounting regulations.
              </li>
              <li>
                <strong className="text-gray-700">Analytics data:</strong> Aggregated,
                anonymised usage data may be retained indefinitely for product improvement
                purposes.
              </li>
            </ul>
          </section>

          {/* 7. Your Rights (GDPR) */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Your Rights</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Under the UK GDPR, you have the following rights regarding your personal data:
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-gray-600">
              <li>
                <strong className="text-gray-700">Right of access:</strong> You can request a
                copy of the personal data we hold about you.
              </li>
              <li>
                <strong className="text-gray-700">Right to rectification:</strong> You can ask
                us to correct inaccurate or incomplete data.
              </li>
              <li>
                <strong className="text-gray-700">Right to erasure:</strong> You can ask us to
                delete your personal data in certain circumstances (also known as the
                &quot;right to be forgotten&quot;).
              </li>
              <li>
                <strong className="text-gray-700">Right to restrict processing:</strong> You
                can ask us to limit how we use your data.
              </li>
              <li>
                <strong className="text-gray-700">Right to data portability:</strong> You can
                request your data in a structured, commonly used, machine-readable format.
              </li>
              <li>
                <strong className="text-gray-700">Right to object:</strong> You can object to
                processing based on legitimate interests or for direct marketing purposes.
              </li>
              <li>
                <strong className="text-gray-700">Rights related to automated decision-making:</strong>{' '}
                You have the right not to be subject to decisions based solely on automated
                processing that produce legal or similarly significant effects.
              </li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              To exercise any of these rights, please contact our Data Protection Officer at{' '}
              <a
                href="mailto:dpo@grove.app"
                className="text-emerald-600 hover:text-emerald-700 underline"
              >
                dpo@grove.app
              </a>
              . We will respond to your request within 30 days. If you are not satisfied with
              our response, you have the right to lodge a complaint with the Information
              Commissioner&apos;s Office (ICO) at{' '}
              <a
                href="https://ico.org.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:text-emerald-700 underline"
              >
                ico.org.uk
              </a>
              .
            </p>
          </section>

          {/* 8. Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Cookies</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We use cookies and similar technologies to provide and improve the Service. For
              detailed information about the cookies we use and how to manage your preferences,
              please see our{' '}
              <Link href="/cookies" className="text-emerald-600 hover:text-emerald-700 underline">
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          {/* 9. International Transfers */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. International Data Transfers</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Your data is primarily stored and processed within the United Kingdom and the
              European Economic Area (EEA). In some cases, our service providers may process
              data outside the UK/EEA.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Where international transfers occur, we ensure appropriate safeguards are in
              place, including:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>Standard Contractual Clauses (SCCs) approved by the UK Government.</li>
              <li>Transfers to countries with an adequacy decision from the UK Secretary of State.</li>
              <li>Other lawful transfer mechanisms recognised under UK GDPR.</li>
            </ul>
          </section>

          {/* 10. Children's Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Children&apos;s Privacy</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              The Service is designed for business use and is not intended for individuals
              under the age of 18. We do not knowingly collect personal data from children. If
              you believe we have inadvertently collected data from a child, please contact us
              and we will take steps to delete it promptly.
            </p>
          </section>

          {/* 11. Changes */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Changes to This Policy</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We may update this Privacy Policy from time to time to reflect changes in our
              practices or applicable law. When we make material changes, we will notify you by
              email or through a prominent notice within the Service at least 30 days before the
              changes take effect.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We encourage you to review this page periodically for the latest information
              about our privacy practices.
            </p>
          </section>

          {/* 12. Contact (DPO) */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">12. Contact</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              If you have any questions about this Privacy Policy or how we handle your data,
              please contact our Data Protection Officer:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>
                <strong className="text-gray-700">Data Protection Officer:</strong>{' '}
                <a
                  href="mailto:dpo@grove.app"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                >
                  dpo@grove.app
                </a>
              </li>
              <li>
                <strong className="text-gray-700">General enquiries:</strong>{' '}
                <a
                  href="mailto:privacy@grove.app"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                >
                  privacy@grove.app
                </a>
              </li>
              <li>
                <strong className="text-gray-700">Address:</strong> Grove, [Registered Address],
                England
              </li>
            </ul>
          </section>
        </div>
      </main>

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
                <li><Link href="/landing#features" className="text-sm text-gray-500 hover:text-gray-700">Features</Link></li>
                <li><Link href="/landing#pricing" className="text-sm text-gray-500 hover:text-gray-700">Pricing</Link></li>
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
