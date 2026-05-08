import React from "react";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { withOpacity } from "@/utils/color";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color: string;
  /** Fill area below the line with a soft gradient. */
  fillBelow?: boolean;
}

/**
 * Tiny inline line chart with optional gradient fill below the line.
 * Designed to live in tight horizontal spaces such as a stat card row.
 */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color,
  fillBelow = true,
}: SparklineProps) {
  if (data.length === 0) {
    return <Svg width={width} height={height} />;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data.map((value, idx) => {
    const x = idx * stepX;
    const y = height - ((value - min) / range) * (height - 2) - 1;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const fillPath = fillBelow
    ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${height} L ${points[0].x.toFixed(2)} ${height} Z`
    : null;

  const gradientId = `spark-${color.replace("#", "")}`;

  return (
    <Svg width={width} height={height}>
      {fillBelow ? (
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.32} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
      ) : null}
      {fillBelow && fillPath ? (
        <Path d={fillPath} fill={`url(#${gradientId})`} stroke="none" />
      ) : null}
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* End-point dot for visual emphasis */}
      <Path
        d={`M ${points[points.length - 1].x.toFixed(2)} ${points[points.length - 1].y.toFixed(2)} m -1.6 0 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0`}
        fill={color}
        stroke={withOpacity(color, 0.4)}
        strokeWidth={1}
      />
    </Svg>
  );
}
