'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ConnectedAccount {
  id: string;
  name: string;
  institution: string;
  type: 'current' | 'savings' | 'credit';
  balance: number; // pence (negative for credit cards)
  lastUpdated: string;
  currency: string;
}

const MOCK_ACCOUNTS: ConnectedAccount[] = [
  {
    id: 'acc-001',
    name: 'Business Current Account',
    institution: 'Barclays',
    type: 'current',
    balance: 2435000,
    lastUpdated: '2 hours ago',
    currency: '£',
  },
  {
    id: 'acc-002',
    name: 'Business Savings',
    institution: 'Barclays',
    type: 'savings',
    balance: 8500000,
    lastUpdated: '2 hours ago',
    currency: '£',
  },
  {
    id: 'acc-003',
    name: 'Business Platinum',
    institution: 'American Express',
    type: 'credit',
    balance: -324000,
    lastUpdated: '4 hours ago',
    currency: '£',
  },
];

const typeIcons: Record<string, React.ReactNode> = {
  current: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  ),
  savings: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  ),
  credit: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
};

function formatBalance(balance: number, currency: string): string {
  const abs = Math.abs(balance);
  const formatted = `${currency}${(abs / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  return balance < 0 ? `-${formatted}` : formatted;
}

export function ConnectedAccountsWidget() {
  const totalBalance = MOCK_ACCOUNTS.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Connected Accounts</CardTitle>
          <span className="text-xs text-muted-foreground">via Xero</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {MOCK_ACCOUNTS.map((account) => (
          <button
            key={account.id}
            className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              account.type === 'current' && 'bg-blue-50 text-blue-600',
              account.type === 'savings' && 'bg-emerald-50 text-emerald-600',
              account.type === 'credit' && 'bg-amber-50 text-amber-600',
            )}>
              {typeIcons[account.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{account.name}</p>
              <p className="text-xs text-muted-foreground">{account.institution} · {account.lastUpdated}</p>
            </div>
            <div className="text-right">
              <p className={cn(
                'text-sm font-semibold tabular-nums',
                account.balance < 0 ? 'text-red-600' : 'text-foreground',
              )}>
                {formatBalance(account.balance, account.currency)}
              </p>
            </div>
          </button>
        ))}

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm font-medium text-muted-foreground">Net Position</span>
          <span className={cn(
            'text-sm font-bold tabular-nums',
            totalBalance < 0 ? 'text-red-600' : 'text-foreground',
          )}>
            {formatBalance(totalBalance, '£')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
