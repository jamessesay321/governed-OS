'use client';

const SOURCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  xero:       { bg: '#dbeafe', text: '#1e40af', label: 'Xero' },
  manual:     { bg: '#fef3c7', text: '#92400e', label: 'Manual' },
  ai:         { bg: '#f3e8ff', text: '#6b21a8', label: 'AI' },
  calculated: { bg: '#f1f5f9', text: '#334155', label: 'Calculated' },
  demo:       { bg: '#dcfce7', text: '#166534', label: 'Demo' },
  linked:     { bg: '#d1fae5', text: '#065f46', label: 'Linked' },
};

interface SourceBadgeProps {
  source: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SourceBadge({ source, size = 'sm', className = '' }: SourceBadgeProps) {
  const key = source.toLowerCase();
  const style = SOURCE_STYLES[key] || { bg: '#f1f5f9', text: '#475569', label: source };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'}
        ${className}
      `}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}
