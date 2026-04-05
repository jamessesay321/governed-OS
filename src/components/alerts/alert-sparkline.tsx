'use client';

/**
 * Inline SVG sparkline — no Recharts dependency.
 *
 * Used alongside alert rule cards to show recent metric history.
 */

interface AlertSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Show a dot on the last data point */
  showEndDot?: boolean;
}

export function AlertSparkline({
  data,
  width = 80,
  height = 24,
  color = '#6366f1',
  showEndDot = true,
}: AlertSparklineProps) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height}>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={0.3}
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * chartW;
    const y = pad + chartH - ((v - min) / range) * chartH;
    return { x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const lastPoint = points[points.length - 1];

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showEndDot && lastPoint && (
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
