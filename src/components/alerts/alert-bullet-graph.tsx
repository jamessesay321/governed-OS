'use client';

/**
 * SVG Bullet Graph following Stephen Few's specification.
 *
 * - Qualitative ranges as graduated grey bands (poor, ok, good)
 * - Actual value as shorter dark bar
 * - Target as thin vertical line marker
 */

interface AlertBulletGraphProps {
  /** Current metric value */
  value: number;
  /** Target or threshold value */
  target: number;
  /** Qualitative ranges: [poor, ok, good] — upper bounds */
  ranges: [number, number, number];
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Whether higher values are better (affects bar colour) */
  higherIsBetter?: boolean;
}

export function AlertBulletGraph({
  value,
  target,
  ranges,
  width = 200,
  height = 28,
  higherIsBetter = true,
}: AlertBulletGraphProps) {
  const maxRange = ranges[2];
  const clampedMax = Math.max(maxRange, value, target) * 1.05; // 5% padding

  const barH = height * 0.6;
  const barY = (height - barH) / 2;
  const actualH = height * 0.3;
  const actualY = (height - actualH) / 2;

  function toX(v: number): number {
    return Math.max(0, Math.min((v / clampedMax) * width, width));
  }

  // Qualitative range colours (graduated grey, darkest = worst)
  const rangeColors = ['#c6c6c6', '#dcdcdc', '#efefef'];

  // Determine bar colour based on performance vs target
  function getBarColor(): string {
    if (higherIsBetter) {
      if (value >= target) return '#10b981'; // green
      if (value >= target * 0.8) return '#f59e0b'; // amber
      return '#ef4444'; // red
    }
    // Lower is better (e.g., expenses)
    if (value <= target) return '#10b981';
    if (value <= target * 1.2) return '#f59e0b';
    return '#ef4444';
  }

  return (
    <svg width={width} height={height} className="shrink-0">
      {/* Qualitative ranges */}
      <rect
        x={0}
        y={barY}
        width={toX(ranges[0])}
        height={barH}
        fill={rangeColors[0]}
        rx={1}
      />
      <rect
        x={toX(ranges[0])}
        y={barY}
        width={toX(ranges[1]) - toX(ranges[0])}
        height={barH}
        fill={rangeColors[1]}
      />
      <rect
        x={toX(ranges[1])}
        y={barY}
        width={toX(ranges[2]) - toX(ranges[1])}
        height={barH}
        fill={rangeColors[2]}
        rx={1}
      />

      {/* Actual value bar */}
      <rect
        x={0}
        y={actualY}
        width={toX(value)}
        height={actualH}
        fill={getBarColor()}
        rx={2}
      />

      {/* Target marker — thin vertical line */}
      <line
        x1={toX(target)}
        y1={barY - 2}
        x2={toX(target)}
        y2={barY + barH + 2}
        stroke="#1f2937"
        strokeWidth={2}
      />
    </svg>
  );
}
