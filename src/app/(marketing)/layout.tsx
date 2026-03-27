import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Grove - The Financial Operating System for Ambitious Businesses',
  description:
    'Grove brings together your accounting, sales, and operations data into one intelligent platform. AI-powered insights, real-time dashboards, and management accounts that write themselves.',
  openGraph: {
    title: 'Grove - The Financial Operating System for Ambitious Businesses',
    description:
      'AI-powered financial intelligence. Connect Xero, Shopify, and more. Get management accounts, KPIs, and investor-ready reports in minutes.',
    type: 'website',
    locale: 'en_GB',
    siteName: 'Grove',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grove - Financial OS for Ambitious Businesses',
    description:
      'AI-powered financial intelligence. Connect your tools, get clarity.',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
