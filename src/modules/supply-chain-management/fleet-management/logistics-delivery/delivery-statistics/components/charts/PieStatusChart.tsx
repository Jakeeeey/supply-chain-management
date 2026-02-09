"use client";

import * as React from "react";
import type { DeliveryStatusCount } from "../../types";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function PieStatusChart(props: {
  data: DeliveryStatusCount[];
  size?: number;
  strokeWidth?: number;
}) {
  const size = props.size ?? 240;
  const strokeWidth = props.strokeWidth ?? 26;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const total = props.data.reduce((a, b) => a + (b?.value ?? 0), 0);
  if (!total) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No Data
      </div>
    );
  }

  // Build arcs
  let cursor = 0;
  const arcs = props.data.map((d) => {
    const value = d.value ?? 0;
    const pct = value / total;
    const sweep = pct * 360;

    const start = cursor;
    const end = cursor + sweep;
    cursor = end;

    // Avoid full 360 arc weirdness; clamp end slightly
    const safeEnd = clamp(end, start + 0.001, start + 359.999);

    return {
      name: d.name,
      value,
      color: d.color,
      start,
      end: safeEnd,
    };
  });

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Status distribution pie chart">
        {/* background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          opacity={0.35}
        />
        {/* arcs */}
        {arcs.map((a) => (
          <path
            key={a.name}
            d={describeArc(cx, cy, r, a.start, a.end)}
            fill="none"
            stroke={a.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          >
            <title>
              {a.name}: {a.value}
            </title>
          </path>
        ))}

        {/* center label */}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground" style={{ fontSize: 16, fontWeight: 700 }}>
          {total}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12 }}>
          deliveries
        </text>
      </svg>
    </div>
  );
}
