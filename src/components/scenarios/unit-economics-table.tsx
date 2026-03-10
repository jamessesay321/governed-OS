'use client';

import type { UnitEconomicsSnapshot } from '@/types';

type Props = {
  data: UnitEconomicsSnapshot[];
};

export function UnitEconomicsTable({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No unit economics data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 font-medium">Segment</th>
            <th className="pb-2 font-medium text-right">Units</th>
            <th className="pb-2 font-medium text-right">Rev/Unit</th>
            <th className="pb-2 font-medium text-right">Cost/Unit</th>
            <th className="pb-2 font-medium text-right">Margin</th>
            <th className="pb-2 font-medium text-right">CAC</th>
            <th className="pb-2 font-medium text-right">LTV</th>
            <th className="pb-2 font-medium text-right">LTV:CAC</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="py-2">{row.segment_label}</td>
              <td className="py-2 text-right">{row.units_sold.toLocaleString()}</td>
              <td className="py-2 text-right">${row.revenue_per_unit.toLocaleString()}</td>
              <td className="py-2 text-right">${row.variable_cost_per_unit.toLocaleString()}</td>
              <td className="py-2 text-right">{(row.contribution_margin_pct * 100).toFixed(1)}%</td>
              <td className="py-2 text-right">${row.cac.toLocaleString()}</td>
              <td className="py-2 text-right">${row.ltv.toLocaleString()}</td>
              <td className="py-2 text-right font-medium">
                <span className={row.ltv_cac_ratio >= 3 ? 'text-green-600' : 'text-red-600'}>
                  {row.ltv_cac_ratio.toFixed(1)}x
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
