'use client';

import type { ScenarioComparisonResult } from '@/lib/scenarios/scenarios';

type Props = {
  result: ScenarioComparisonResult;
};

export function ScenarioComparisonTable({ result }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Revenue Delta</p>
          <p className={`text-2xl font-bold ${result.summaryRevenueDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {result.summaryRevenueDelta >= 0 ? '+' : ''}${result.summaryRevenueDelta.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Net Profit Delta</p>
          <p className={`text-2xl font-bold ${result.summaryNetProfitDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {result.summaryNetProfitDelta >= 0 ? '+' : ''}${result.summaryNetProfitDelta.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Cash Position Delta</p>
          <p className={`text-2xl font-bold ${result.summaryClosingCashDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {result.summaryClosingCashDelta >= 0 ? '+' : ''}${result.summaryClosingCashDelta.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium">Period</th>
              <th className="pb-2 font-medium text-right">Revenue Delta</th>
              <th className="pb-2 font-medium text-right">Revenue %</th>
              <th className="pb-2 font-medium text-right">Profit Delta</th>
              <th className="pb-2 font-medium text-right">Margin Delta</th>
              <th className="pb-2 font-medium text-right">Cash Delta</th>
            </tr>
          </thead>
          <tbody>
            {result.periodDeltas.map((d) => (
              <tr key={d.period} className="border-b">
                <td className="py-2">{d.period.slice(0, 7)}</td>
                <td className={`py-2 text-right ${d.revenueDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {d.revenueDelta >= 0 ? '+' : ''}${d.revenueDelta.toLocaleString()}
                </td>
                <td className="py-2 text-right">
                  {(d.revenueDeltaPct * 100).toFixed(1)}%
                </td>
                <td className={`py-2 text-right ${d.netProfitDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {d.netProfitDelta >= 0 ? '+' : ''}${d.netProfitDelta.toLocaleString()}
                </td>
                <td className="py-2 text-right">
                  {(d.netMarginDelta * 100).toFixed(1)}pp
                </td>
                <td className={`py-2 text-right ${d.closingCashDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {d.closingCashDelta >= 0 ? '+' : ''}${d.closingCashDelta.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
