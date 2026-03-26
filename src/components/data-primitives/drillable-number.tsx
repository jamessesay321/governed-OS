'use client';

import { useState, useRef } from 'react';

export interface DrillableValue {
  value: number;
  type: 'actual' | 'forecast' | 'assumption' | 'calculated' | 'linked' | 'zero';
  label?: string;
  source?: {
    module: string;
    entity_type: string;
    entity_id?: string;
    formula?: string;
    last_updated: string;
  };
  drillable?: boolean;
  prefix?: string;
  suffix?: string;
  compact?: boolean;
}

interface DrillableNumberProps {
  data: DrillableValue;
  onDrill?: (data: DrillableValue) => void;
  onEdit?: (data: DrillableValue, newValue: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const TYPE_STYLES: Record<DrillableValue['type'], { color: string; bg: string; label: string }> = {
  actual:     { color: '#1e293b', bg: 'transparent', label: 'Actual' },
  forecast:   { color: '#7c3aed', bg: '#f5f3ff',    label: 'Forecast' },
  assumption: { color: '#2563eb', bg: '#eff6ff',     label: 'Assumption' },
  calculated: { color: '#0f172a', bg: 'transparent', label: 'Calculated' },
  linked:     { color: '#059669', bg: 'transparent', label: 'Linked' },
  zero:       { color: '#94a3b8', bg: 'transparent', label: 'No Data' },
};

const SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl font-semibold',
};

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function formatNumber(n: number, compact?: boolean): string {
  if (compact) return formatCompact(n);
  return n.toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

export function DrillableNumber({
  data,
  onDrill,
  onEdit,
  size = 'md',
  showTooltip = true,
  className = '',
}: DrillableNumberProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const style = TYPE_STYLES[data.type];
  const isClickable = data.drillable || data.type === 'assumption';

  const handleClick = () => {
    if (data.type === 'assumption' && onEdit) {
      setEditValue(String(data.value));
      setEditing(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else if (data.drillable && onDrill) {
      onDrill(data);
    }
  };

  const handleEditSubmit = () => {
    const num = parseFloat(editValue);
    if (!isNaN(num) && onEdit) {
      onEdit(data, num);
    }
    setEditing(false);
  };

  const formatted = `${data.prefix || ''}${formatNumber(data.value, data.compact)}${data.suffix || ''}`;

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleEditSubmit}
        onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit()}
        className={`${SIZE_CLASSES[size]} rounded px-2 py-0.5 outline-none ring-2 ring-blue-400 w-24 ${className}`}
        style={{ color: style.color, backgroundColor: style.bg === 'transparent' ? '#fff' : style.bg }}
      />
    );
  }

  return (
    <span
      className={`relative inline-flex items-center gap-1 ${SIZE_CLASSES[size]} ${className}`}
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      <span
        onClick={handleClick}
        className={`
          rounded px-1.5 py-0.5 transition-all
          ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}
          ${data.type === 'assumption' ? 'border-b-2 border-blue-400 border-dashed' : ''}
        `}
        style={{
          color: style.color,
          backgroundColor: style.bg,
        }}
      >
        {formatted}
      </span>

      {showTooltip && tooltipVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap">
          <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: style.color }}
              />
              <span className="font-medium">{style.label}</span>
              {data.label && <span className="text-slate-400">— {data.label}</span>}
            </div>
            {data.source && (
              <div className="text-slate-400 space-y-0.5">
                <div>Source: {data.source.module}</div>
                {data.source.formula && <div>Formula: {data.source.formula}</div>}
                <div>Updated: {new Date(data.source.last_updated).toLocaleDateString('en-GB')}</div>
              </div>
            )}
            {data.type === 'assumption' && (
              <div className="text-blue-300 mt-1">Click to edit</div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
