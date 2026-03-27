import Link from 'next/link';
import { Layers, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | Grove',
  description:
    'Cookie Policy for Grove. Learn about the cookies we use and how to manage your preferences.',
};

export default function CookiesPage() {
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
          Cookie Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: March 2026</p>

        <div className="mt-10 space-y-10">
          {/* 1. What Are Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. What Are Cookies?</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Cookies are small text files that are placed on your device when you visit a
              website. They are widely used to make websites work more efficiently, provide a
              better user experience, and give website owners useful information about how
              their site is being used.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              This policy explains what cookies Grove uses, why we use them, and how you can
              manage your preferences.
            </p>
          </section>

          {/* 2. Essential Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Essential Cookies</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              These cookies are strictly necessary for the Service to function. They cannot be
              switched off because the platform would not work without them. They do not store
              any personally identifiable information beyond what is needed for core
              functionality.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 pr-4 text-left font-semibold text-gray-900">Cookie</th>
                    <th className="pb-3 pr-4 text-left font-semibold text-gray-900">Purpose</th>
                    <th className="pb-3 text-left font-semibold text-gray-900">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-mono text-xs">sb-access-token</td>
                    <td className="py-3 pr-4">Authentication. Keeps you logged in securely.</td>
                    <td className="py-3">Session</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-mono text-xs">sb-refresh-token</td>
                    <td className="py-3 pr-4">Authentication. Refreshes your session without requiring you to log in again.</td>
                    <td className="py-3">7 days</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-mono text-xs">csrf-token</td>
                    <td className="py-3 pr-4">Security. Protects against cross-site request forgery attacks.</td>
                    <td className="py-3">Session</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-mono text-xs">cookie-consent</td>
                    <td className="py-3 pr-4">Stores your cookie preferences so we do not ask you again.</td>
                    <td className="py-3">12 months</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. Analytics Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Analytics Cookies (Optional)</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Analytics cookies help us understand how visitors interact with the Service. They
              collect information such as which pages are visited most often, how users navigate
              between pages, and whether users encounter any errors. All data collected by
              analytics cookies is aggregated and anonymous.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              These cookies are only set if you give your consent. You can opt out at any time
              through our cookie preferences settings.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 pr-4 text-left font-semibold text-gray-900">Cookie</th>
                    <th className="pb-3 pr-4 text-left font-semibold text-gray-900">Purpose</th>
                    <th className="pb-3 text-left font-semibold text-gray-900">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-mono text-xs">_grove_analytics</td>
                    <td className="py-3 pr-4">Tracks anonymous usage patterns to help us improve the platform.</td>
                    <td className="py-3">12 months</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-mono text-xs">_grove_session_id</td>
                    <td className="py-3 pr-4">Groups page views into a single session for analytics purposes.</td>
                    <td className="py-3">30 minutes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Preference Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Preference Cookies</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Preference cookies allow the Service to remember choices you have made, such as
              your preferred language, theme, dashboard layout, or display settings. These
              cookies make your experience more personalised.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 pr-4 text-left font-semibold text-gray-900">Cookie</th>
                    <th className="pb-3 pr-4 text-left font-semibold text-gray-900">Purpose</th>
                    <th className="pb-3 text-left font-semibold text-gray-900">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-mono text-xs">grove-theme</td>
                    <td className="py-3 pr-4">Remembers your preferred colour theme (light or dark).</td>
                    <td className="py-3">12 months</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-mono text-xs">grove-sidebar</td>
                    <td className="py-3 pr-4">Remembers whether you prefer the sidebar expanded or collapsed.</td>
                    <td className="py-3">12 months</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 5. How to Manage Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. How to Manage Cookies</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              You have several options for managing cookies:
            </p>
            <h3 className="mt-4 text-base font-medium text-gray-800">
              Through Grove
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              When you first visit Grove, you will see a cookie consent banner. You can choose
              to accept all cookies or customise your preferences. You can change your
              preferences at any time through the cookie settings in your account.
            </p>
            <h3 className="mt-4 text-base font-medium text-gray-800">
              Through your browser
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Most web browsers allow you to control cookies through their settings. You can
              usually find these in the &quot;Settings&quot;, &quot;Preferences&quot;, or
              &quot;Privacy&quot; section of your browser. Common options include:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>Viewing and deleting existing cookies.</li>
              <li>Blocking all cookies or only third-party cookies.</li>
              <li>Setting your browser to notify you when a cookie is being set.</li>
              <li>Clearing all cookies when you close your browser.</li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Please note that blocking essential cookies may prevent you from using the
              Service or cause certain features to stop working properly.
            </p>
            <h3 className="mt-4 text-base font-medium text-gray-800">
              Browser-specific guides
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>
                <strong className="text-gray-700">Chrome:</strong> Settings &gt; Privacy and
                Security &gt; Cookies and other site data
              </li>
              <li>
                <strong className="text-gray-700">Firefox:</strong> Settings &gt; Privacy
                &amp; Security &gt; Cookies and Site Data
              </li>
              <li>
                <strong className="text-gray-700">Safari:</strong> Preferences &gt; Privacy
                &gt; Manage Website Data
              </li>
              <li>
                <strong className="text-gray-700">Edge:</strong> Settings &gt; Cookies and
                site permissions &gt; Manage and delete cookies and site data
              </li>
            </ul>
          </section>

          {/* 6. Third-Party Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Third-Party Cookies</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We do not currently use third-party advertising cookies. If we introduce
              third-party cookies in the future, we will update this policy and request your
              consent before setting them.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Some third-party services we integrate with (such as Supabase for authentication)
              may set their own essential cookies. These are necessary for those services to
              function and are covered under the essential cookies category above.
            </p>
          </section>

          {/* 7. Changes */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Changes to This Policy</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We may update this Cookie Policy from time to time. When we make changes, we will
              update the &quot;Last updated&quot; date at the top of this page. If we make
              material changes that affect your choices, we will notify you through the cookie
              consent banner or by email.
            </p>
          </section>

          {/* 8. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Contact</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              If you have any questions about our use of cookies, please get in touch:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>
                <strong className="text-gray-700">Email:</strong>{' '}
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
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              For more information about your privacy rights, please see our{' '}
              <Link href="/privacy" className="text-emerald-600 hover:text-emerald-700 underline">
                Privacy Policy
              </Link>
              .
            </p>
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
