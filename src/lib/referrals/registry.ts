/* ------------------------------------------------------------------ */
/*  Referral Programme — "Advisory Network"                            */
/* ------------------------------------------------------------------ */

export interface ReferralTier {
  minReferrals: number;
  reward: string;
  description: string;
  icon: string;
}

export interface ReferralEntry {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'joined' | 'active';
  creditAwarded: number;
  date: string;
}

export interface ReferralStats {
  referralCode: string;
  referralLink: string;
  invitationsSent: number;
  colleaguesJoined: number;
  creditsEarned: number;
  currentTier: string;
  referrals: ReferralEntry[];
}

// === Programme Config ===

export const REFERRAL_CONFIG = {
  programmeName: 'Advisory Network',
  baseRewardReferrer: 50,
  baseRewardReferee: 50,
  currencyLabel: 'credits',
};

export const REFERRAL_TIERS: ReferralTier[] = [
  { minReferrals: 1, reward: '50 credits', description: 'Your first referral earns you both 50 credits', icon: '🤝' },
  { minReferrals: 3, reward: '200 bonus credits', description: 'Unlock a bonus 200 credits on your third referral', icon: '⭐' },
  { minReferrals: 5, reward: 'Advisory Circle + priority support', description: 'Join the Advisory Circle with a profile badge and priority support access', icon: '🏅' },
  { minReferrals: 10, reward: '1 month free agent subscription', description: 'Earn a full month of any agent subscription, on us', icon: '🎁' },
];

// === Mock Data ===

export function getMockReferralStats(): ReferralStats {
  return {
    referralCode: 'GROVE-ADV-2026',
    referralLink: 'https://governed.os/refer/GROVE-ADV-2026',
    invitationsSent: 5,
    colleaguesJoined: 3,
    creditsEarned: 200,
    currentTier: 'Trusted Advisor',
    referrals: [
      { id: 'ref-1', name: 'Sarah Mitchell', email: 's***@luxebrides.co.uk', status: 'active', creditAwarded: 50, date: '2026-01-15' },
      { id: 'ref-2', name: 'David Okonkwo', email: 'd***@tailoredfinance.com', status: 'active', creditAwarded: 50, date: '2026-02-03' },
      { id: 'ref-3', name: 'Emma Chen', email: 'e***@silkandstone.co.uk', status: 'joined', creditAwarded: 50, date: '2026-02-28' },
      { id: 'ref-4', name: 'James Hartley', email: 'j***@hartleypartners.com', status: 'pending', creditAwarded: 0, date: '2026-03-10' },
      { id: 'ref-5', name: 'Priya Sharma', email: 'p***@couturecollective.com', status: 'pending', creditAwarded: 0, date: '2026-03-18' },
    ],
  };
}
