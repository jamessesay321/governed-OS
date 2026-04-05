'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatting/currency';

interface WorkingCapitalWidgetProps {
  currentAssets?: number;
  currentLiabilities?: number;
}

export function WorkingCapitalWidget({
  currentAssets = 185000,
  currentLiabilities = 112000,
}: WorkingCapitalWidgetProps) {
  const workingCapital = currentAssets - currentLiabilities;
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  const maxVal = Math.max(currentAssets, currentLiabilities);

  const assetPct = maxVal > 0 ? (currentAssets / maxVal) * 100 : 0;
  const liabPct = maxVal > 0 ? (currentLiabilities / maxVal) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Working Capital</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Big number */}
          <div className="text-center">
            <p className={`text-2xl font-bold ${workingCapital >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(workingCapital)}
            </p>
            <p className="text-xs text-muted-foreground">
              Current Ratio: {currentRatio.toFixed(2)}x
            </p>
          </div>

          {/* Bar comparison */}
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Current Assets</span>
                <span className="font-medium">{formatCurrency(currentAssets)}</span>
              </div>
              <div className="h-4 w-full rounded bg-muted">
                <div
                  className="h-full rounded bg-emerald-500 transition-all"
                  style={{ width: `${assetPct}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Current Liabilities</span>
                <span className="font-medium">{formatCurrency(currentLiabilities)}</span>
              </div>
              <div className="h-4 w-full rounded bg-muted">
                <div
                  className="h-full rounded bg-red-400 transition-all"
                  style={{ width: `${liabPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
