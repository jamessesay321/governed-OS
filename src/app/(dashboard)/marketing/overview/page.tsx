import type { Metadata } from 'next';
import { MarketingOverviewClient } from './marketing-overview-client';

export const metadata: Metadata = {
  title: 'Marketing Overview | Grove',
  description: 'High-level marketing intelligence across all channels.',
};

export default function MarketingOverviewPage() {
  const klaviyoConfigured = !!process.env.KLAVIYO_API_KEY;

  return <MarketingOverviewClient klaviyoConfigured={klaviyoConfigured} />;
}
