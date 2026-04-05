'use client';

/**
 * Bullet Graph — Stephen Few specification
 *
 * Pure SVG implementation. Shows:
 * - Graduated grey bands for qualitative ranges (poor / satisfactory / good)
 * - Dark bar for actual value
 * - Thin vertical marker for target/comparison value
 *
 * Usage:
 *   <BulletGraph
 *     value={72000}
 *     target={80000}
 *     ranges={{ poor: 40000, satisfactory: 70000, good: 100000 }}
 *     label="Revenue"
 *   />
 */

interface BulletGraphProps {
  /** Actual measured value */
  value: number;
  /** Target / comparison value (shown as thin marker) */
  target: number;
  /** Qualitative range thresholds — the max of 'good' defines the full scale */
  ranges: { poor: number; satisfactory: number; good: number };
  /** Width in px (default 240) */
  width?: number;
  /** Height in px (default 32) */
  height?: number;
  /** Label text shown to the left */
  label?: string;
  /** Optional className */
  className?: string;
}

export function BulletGraph({
  value,
  target,
  ranges,
  width = 240,
  height = 32,
  label,
  className,
}: BulletGraphProps) {
  const maxVal = ranges.good;
  const barHeight = height;
  const barY = 0;

  // Scale helper: value -> x position
  const scale = (v: number) => Math.min((v / maxVal) * width, width);

  const poorWidth = scale(ranges.poor);
  const satWidth = scale(ranges.satisfactory);
  const goodWidth = scale(ranges.good);
  const valueWidth = scale(value);
  const targetX = scale(target);

  // Bar dimensions
  const actualBarHeight = barHeight * 0.4;
  const actualBarY = barY + (barHeight - actualBarHeight) / 2;

  // Target marker
  const markerHeight = barHeight * 0.7;
  const markerY = barY + (barHeight - markerHeight) / 2;

  return (
    <div className={`inline-flex items-center gap-3 ${className ?? ''}`}>
      {label && (
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap min-w-[60px] text-right">
          {label}
        </span>
      )}
      <svg
        width={width}
        height={barHeight}
        viewBox={`0 0 ${width} ${barHeight}`}
        role="img"
        aria-label={`Bullet graph: ${label ?? 'metric'}, value ${value}, target ${target}`}
      >
        {/* Qualitative range bands (lightest to darkest) */}
        <rect x={0} y={barY} width={goodWidth} height={barHeight} rx={2} fill="#e5e7eb" />
        <rect x={0} y={barY} width={satWidth} height={barHeight} rx={2} fill="#d1d5db" />
        <rect x={0} y={barY} width={poorWidth} height={barHeight} rx={2} fill="#9ca3af" />

        {/* Actual value bar */}
        <rect
          x={0}
          y={actualBarY}
          width={valueWidth}
          height={actualBarHeight}
          rx={1}
          fill="#1f2937"
        />

        {/* Target marker line */}
        <line
          x1={targetX}
          y1={markerY}
          x2={targetX}
          y2={markerY + markerHeight}
          stroke="#ef4444"
          strokeWidth={2.5}
        />
      </svg>
    </div>
  );
}
