'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  REFERRAL_CONFIG,
  REFERRAL_TIERS,
  getMockReferralStats,
} from '@/lib/referrals/registry';

const stats = getMockReferralStats();

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-xs">Active</Badge>;
  if (status === 'joined') return <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 text-xs">Joined</Badge>;
  return <Badge variant="outline" className="border-gray-300 bg-gray-50 text-gray-500 text-xs">Pending</Badge>;
}

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(stats.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 space-y-8 p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/billing" className="hover:text-foreground">Billing</Link>
        <span>/</span>
        <span className="text-foreground">Advisory Network</span>
      </div>

      {/* Hero */}
      <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: '#f1edea' }}>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1c1b1b' }}>
          Build Your Advisory Network
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Introduce fellow finance leaders to Grove. When they join, you both receive credits
          to unlock more of the platform. No gimmicks, just a stronger community.
        </p>
      </div>

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1 rounded-md border bg-muted/50 px-4 py-2.5 text-sm font-mono text-muted-foreground truncate">
              {stats.referralLink}
            </div>
            <Button onClick={handleCopy} variant={copied ? 'default' : 'outline'} className="shrink-0">
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Share this link with colleagues. Your code: <span className="font-semibold">{stats.referralCode}</span>
          </p>
        </CardContent>
      </Card>

      {/* Value Exchange */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-t-4 border-t-emerald-500">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-emerald-700">{REFERRAL_CONFIG.baseRewardReferrer}</p>
            <p className="text-sm font-medium mt-1">credits for you</p>
            <p className="text-xs text-muted-foreground mt-2">
              Added to your balance when your colleague activates their account
            </p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-blue-500">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-blue-700">{REFERRAL_CONFIG.baseRewardReferee}</p>
            <p className="text-sm font-medium mt-1">credits for them</p>
            <p className="text-xs text-muted-foreground mt-2">
              Your colleague starts with bonus credits to explore modules and tools
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Invitations Sent</p>
          <p className="mt-1 text-3xl font-bold">{stats.invitationsSent}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Colleagues Joined</p>
          <p className="mt-1 text-3xl font-bold">{stats.colleaguesJoined}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Credits Earned</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">{stats.creditsEarned}</p>
          <p className="mt-1 text-xs text-muted-foreground">Current tier: {stats.currentTier}</p>
        </div>
      </div>

      {/* Milestone Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Milestone Rewards</CardTitle>
          <p className="text-xs text-muted-foreground">
            Unlock additional benefits as you grow your advisory network.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {REFERRAL_TIERS.map((tier) => {
              const achieved = stats.colleaguesJoined >= tier.minReferrals;
              return (
                <div
                  key={tier.minReferrals}
                  className={cn(
                    'flex items-center gap-4 rounded-lg border p-4 transition-colors',
                    achieved ? 'bg-emerald-50/50 border-emerald-200' : 'bg-card'
                  )}
                >
                  <span className="text-2xl">{tier.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">
                        {tier.minReferrals} {tier.minReferrals === 1 ? 'referral' : 'referrals'}
                      </p>
                      {achieved && (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px]">
                          Achieved
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{tier.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('text-sm font-semibold', achieved ? 'text-emerald-700' : 'text-foreground')}>
                      {tier.reward}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Credits</th>
                </tr>
              </thead>
              <tbody>
                {stats.referrals.map((ref) => (
                  <tr key={ref.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{ref.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ref.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ref.date}</td>
                    <td className="px-4 py-3"><StatusBadge status={ref.status} /></td>
                    <td className={cn(
                      'px-4 py-3 text-right font-medium',
                      ref.creditAwarded > 0 ? 'text-emerald-600' : 'text-muted-foreground'
                    )}>
                      {ref.creditAwarded > 0 ? `+${ref.creditAwarded}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
