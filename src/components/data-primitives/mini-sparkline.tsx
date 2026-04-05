'use client';

/**
 * Mini Sparkline — pure SVG, zero dependencies
 *
 * A tiny inline line chart for embedding in tables, cards, and KPI rows.
 *
 * Usage:
 *   <MiniSparkline data={[10, 25, 18, 32, 28, 45]} />
 *   <MiniSparkline data={monthlyRevenue} color="#10b981" showDot />
 */

interface MiniSparklineProps {
  /** Array of numeric data points */
  data: number[];
  /** SVG width in px (default 60) */
  width?: number;
  /** SVG height in px (default 20) */
  height?: number;
  /** Stroke colour (default currentColor) */
  color?: string;
  /** Show a dot on the last data point (default false) */
  showDot?: boolean;
  /** Show a subtle fill gradient below the line (default false) */
  showFill?: boolean;
  /** Stroke width (default 1.5) */
  strokeWidth?: number;
  /** Optional className */
  className?: string;
}

export function MiniSparkline({
  data,
  width = 60,
  height = 20,
  color = 'currentColor',
  showDot = false,
  showFill = false,
  strokeWidth = 1.5,
  className,
}: MiniSparklineProps) {
  if (!data || data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        role="img"
        aria-label="Sparkline: insufficient data"
      />
    );
  }

  const padding = 2;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  // Map data points to SVG coordinates
  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * chartW;
    const y = padding + chartH - ((v - minVal) / range) * chartH;
    return { x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const lastPoint = points[points.length - 1];

  // Fill path: close the polyline along the bottom
  const fillPath = showFill
    ? `M ${points[0].x},${points[0].y} ${points.map((p) => `L ${p.x},${p.y}`).join(' ')} L ${lastPoint.x},${height - padding} L ${points[0].x},${height - padding} Z`
    : undefined;

  // Unique ID for gradient
  const gradientId = `sparkline-gradient-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`Sparkline: ${data.length} points, latest ${data[data.length - 1]}`}
    >
      {showFill && fillPath && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <path d={fillPath} fill={`url(#${gradientId})`} />
        </>
      )}

      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {showDot && lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2}
          fill={color}
        />
      )}
    </svg>
  );
}
