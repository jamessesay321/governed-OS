import Link from 'next/link';
import { Layers, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Grove',
  description:
    'Terms of Service for Grove, the financial operating system for ambitious businesses.',
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: March 2026</p>

        <div className="mt-10 space-y-10">
          {/* 1. Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Welcome to Grove. These Terms of Service (&quot;Terms&quot;) govern your use of the
              Grove platform, website, and related services (collectively, the
              &quot;Service&quot;) operated by Grove (&quot;we&quot;, &quot;us&quot;, or
              &quot;our&quot;). By accessing or using the Service, you agree to be bound by
              these Terms. If you do not agree, please do not use the Service.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Grove is a financial operating system designed to help businesses manage their
              finances, connect integrations, and gain AI-powered insights. These Terms apply
              to all users, whether you are on a free trial or a paid plan.
            </p>
          </section>

          {/* 2. Definitions */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Definitions</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-600">
              <li>
                <strong className="text-gray-700">&quot;Account&quot;</strong> means the
                account you create to access and use the Service.
              </li>
              <li>
                <strong className="text-gray-700">&quot;Content&quot;</strong> means any data,
                text, files, or other materials you upload, submit, or make available through
                the Service.
              </li>
              <li>
                <strong className="text-gray-700">&quot;User&quot;</strong> means any
                individual or entity that accesses or uses the Service.
              </li>
              <li>
                <strong className="text-gray-700">&quot;AI Credits&quot;</strong> means the
                usage allowance for AI-powered features included in your plan.
              </li>
              <li>
                <strong className="text-gray-700">&quot;Integration&quot;</strong> means any
                third-party service you connect to Grove, such as Xero, Shopify, or other
                supported platforms.
              </li>
            </ul>
          </section>

          {/* 3. Account Terms */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Account Terms</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              To use the Service, you must create an account. When you do, you agree to:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>Provide accurate and complete information during registration.</li>
              <li>Keep your login credentials secure and confidential.</li>
              <li>
                Be responsible for all activity that occurs under your account, whether or not
                you authorised it.
              </li>
              <li>
                Notify us immediately if you suspect any unauthorised access to your account.
              </li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              You must be at least 18 years old or have the authority to enter into these Terms
              on behalf of your organisation. We reserve the right to suspend or terminate
              accounts that violate these Terms.
            </p>
          </section>

          {/* 4. Acceptable Use */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Acceptable Use</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              You agree to use the Service in a responsible and lawful manner. You must not:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>
                Use the Service for any illegal purpose or in violation of any applicable laws
                or regulations.
              </li>
              <li>
                Attempt to gain unauthorised access to the Service, other accounts, or our
                systems.
              </li>
              <li>
                Interfere with or disrupt the Service, servers, or networks connected to the
                Service.
              </li>
              <li>
                Upload malicious code, viruses, or any harmful content.
              </li>
              <li>
                Reverse engineer, decompile, or otherwise attempt to extract the source code of
                the Service.
              </li>
              <li>
                Use the Service in a way that could harm, overburden, or impair it for other
                users.
              </li>
              <li>
                Resell, redistribute, or sublicence the Service without our prior written
                consent.
              </li>
            </ul>
          </section>

          {/* 5. Data & Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Data and Privacy</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Your privacy matters to us. Our collection and use of personal data is governed
              by our{' '}
              <Link href="/privacy" className="text-emerald-600 hover:text-emerald-700 underline">
                Privacy Policy
              </Link>
              , which forms part of these Terms. By using the Service, you acknowledge that you
              have read and understood our Privacy Policy.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              You retain ownership of any data you upload to the Service. By uploading Content,
              you grant us a limited, non-exclusive licence to process, store, and display that
              Content solely for the purpose of providing the Service to you. We will not sell
              your data to third parties.
            </p>
          </section>

          {/* 6. Payment Terms */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Payment Terms</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Grove offers both free trials and paid subscription plans. If you choose a paid
              plan:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>
                Fees are billed in advance on a monthly or annual basis, depending on your
                chosen billing cycle.
              </li>
              <li>
                All prices are stated in British Pounds (GBP) unless otherwise indicated and
                are exclusive of VAT where applicable.
              </li>
              <li>
                Your subscription will automatically renew at the end of each billing period
                unless you cancel before the renewal date.
              </li>
              <li>
                We may change our pricing with at least 30 days notice. Continued use of the
                Service after a price change constitutes acceptance of the new pricing.
              </li>
              <li>
                Refunds are handled on a case-by-case basis. If you believe you are entitled to
                a refund, please contact our support team.
              </li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Free trials provide full access for 14 days. No credit card is required to start
              a trial. At the end of the trial, you will need to select a paid plan to continue
              using the Service.
            </p>
          </section>

          {/* 7. Intellectual Property */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Intellectual Property</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              The Service, including its design, code, features, documentation, and branding,
              is owned by Grove and protected by copyright, trademark, and other intellectual
              property laws.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We grant you a limited, non-exclusive, non-transferable, revocable licence to
              access and use the Service in accordance with these Terms. This licence does not
              include the right to copy, modify, distribute, sell, or lease any part of the
              Service.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Any feedback, suggestions, or ideas you provide about the Service may be used by
              us without obligation to you. You retain full ownership of your Content.
            </p>
          </section>

          {/* 8. Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Limitation of Liability</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              To the maximum extent permitted by law, Grove and its directors, employees, and
              affiliates shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, including but not limited to loss of profits,
              data, or business opportunities, arising out of or in connection with your use of
              the Service.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Our total aggregate liability to you for any claims arising from or related to the
              Service shall not exceed the amount you paid to us in the 12 months preceding the
              claim.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              The Service is provided &quot;as is&quot; and &quot;as available&quot;. While we
              strive for accuracy, we do not guarantee that AI-generated insights,
              calculations, or reports are error-free. You should always verify important
              financial decisions with a qualified professional.
            </p>
          </section>

          {/* 9. Termination */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Termination</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              You may close your account at any time by contacting us or using the account
              settings within the Service. Upon termination:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>
                Your right to access and use the Service will end immediately.
              </li>
              <li>
                We will retain your data for a reasonable period to comply with legal
                obligations, resolve disputes, and enforce our agreements. After this period,
                your data will be securely deleted.
              </li>
              <li>
                You may request a copy of your data before account closure by contacting our
                support team.
              </li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We may also suspend or terminate your access if you breach these Terms, if
              required by law, or if we discontinue the Service (with reasonable notice where
              possible).
            </p>
          </section>

          {/* 10. Changes to Terms */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Changes to These Terms</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We may update these Terms from time to time. When we make material changes, we
              will notify you by email or by posting a prominent notice within the Service at
              least 30 days before the changes take effect.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Your continued use of the Service after the changes take effect means you accept
              the revised Terms. If you do not agree with the updated Terms, you should stop
              using the Service and close your account.
            </p>
          </section>

          {/* 11. Governing Law */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Governing Law</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              These Terms are governed by and construed in accordance with the laws of England
              and Wales. Any disputes arising out of or in connection with these Terms shall be
              subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              If any provision of these Terms is found to be invalid or unenforceable, the
              remaining provisions will continue in full force and effect.
            </p>
          </section>

          {/* 12. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">12. Contact</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              If you have any questions about these Terms, please get in touch:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>
                <strong className="text-gray-700">Email:</strong>{' '}
                <a
                  href="mailto:legal@grove.app"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                >
                  legal@grove.app
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
