'use client';

import { useState, useEffect } from 'react';

const LEGEND_ITEMS = [
  { type: 'actual',     color: '#1e293b', label: 'Actual',     desc: 'Verified data' },
  { type: 'forecast',   color: '#7c3aed', label: 'Forecast',   desc: 'AI projection' },
  { type: 'assumption', color: '#2563eb', label: 'Assumption', desc: 'Editable input' },
  { type: 'calculated', color: '#0f172a', label: 'Calculated', desc: 'Formula-derived' },
  { type: 'linked',     color: '#059669', label: 'Linked',     desc: 'Cross-module ref' },
  { type: 'zero',       color: '#94a3b8', label: 'No Data',    desc: 'Missing or zero' },
];

const STORAGE_KEY = 'grove-legend-collapsed';

export function NumberLegend({ className = '' }: { className?: string }) {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      setCollapsed(false);
      localStorage.setItem(STORAGE_KEY, 'false');
    } else {
      setCollapsed(stored === 'true');
    }
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  return (
    <div className={`border border-slate-200 rounded-lg bg-white ${className}`}>
      <button
        onClick={toggle}
        className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs text-slate-500 hover:text-slate-700 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-90'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium">Data type legend</span>
        {collapsed && (
          <div className="flex items-center gap-2 ml-2">
            {LEGEND_ITEMS.map((item) => (
              <span
                key={item.type}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            ))}
          </div>
        )}
      </button>

      {!collapsed && (
        <div className="flex flex-wrap items-center gap-4 px-3 pb-2">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.type} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-medium text-slate-700">{item.label}</span>
              <span className="text-xs text-slate-400">{item.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
