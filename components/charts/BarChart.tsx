import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Easing } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

export interface BarDatum {
  label: string;
  value: number;
  /** Optional bar color override. */
  color?: string;
  /** Optional secondary value (e.g. "completed" overlay). */
  secondary?: number;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  /** If the dataset is longer than this, only the most recent N are kept. */
  maxBars?: number;
  /** Render numeric labels above each bar. */
  showValues?: boolean;
}

const PADDING_LEFT = 32;
const PADDING_RIGHT = 8;
const PADDING_TOP = 18;
const PADDING_BOTTOM = 28;
const GRID_LINES = 4;

/**
 * Vertical bar chart drawn with react-native-svg. Bars animate from height 0
 * to their final height on mount. Includes a 4-line horizontal grid, axis
 * labels, optional value labels above each bar, and optional secondary
 * overlay bars (e.g. "completed" series).
 */
export function BarChart({
  data,
  height = 220,
  maxBars,
  showValues = false,
}: BarChartProps) {
  const c = useColors();
  const progress = useRef(new Animated.Value(0)).current;
  const [animValue, setAnimValue] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const id = progress.addListener(({ value }) => setAnimValue(value));
    return () => progress.removeListener(id);
  }, [progress, data]);

  const trimmed = maxBars && data.length > maxBars ? data.slice(-maxBars) : data;
  const maxValue = Math.max(1, ...trimmed.map((d) => Math.max(d.value, d.secondary ?? 0)));
  const niceMax = roundNiceMax(maxValue);

  const chartWidth = Math.max(0, width - PADDING_LEFT - PADDING_RIGHT);
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const slotWidth = trimmed.length > 0 ? chartWidth / trimmed.length : 0;
  const barWidth = Math.max(8, Math.min(40, slotWidth * 0.55));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ width: "100%" }}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          {/* Y-axis grid lines and labels */}
          {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
            const y = PADDING_TOP + (chartHeight * i) / GRID_LINES;
            const labelValue = niceMax * (1 - i / GRID_LINES);
            return (
              <React.Fragment key={`grid-${i}`}>
                <Line
                  x1={PADDING_LEFT}
                  x2={width - PADDING_RIGHT}
                  y1={y}
                  y2={y}
                  stroke={c.borderLight}
                  strokeWidth={1}
                  strokeDasharray={i === GRID_LINES ? undefined : "3,3"}
                />
                <SvgText
                  x={PADDING_LEFT - 6}
                  y={y + 3}
                  fontSize={9}
                  fill={c.textMuted}
                  textAnchor="end"
                >
                  {Math.round(labelValue)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Bars */}
          {trimmed.map((d, idx) => {
            const x = PADDING_LEFT + slotWidth * idx + (slotWidth - barWidth) / 2;
            const barHeight = (d.value / niceMax) * chartHeight * animValue;
            const y = PADDING_TOP + chartHeight - barHeight;
            const fill = d.color ?? c.primary;
            const secondaryHeight = d.secondary
              ? (d.secondary / niceMax) * chartHeight * animValue
              : 0;
            const secondaryY = PADDING_TOP + chartHeight - secondaryHeight;

            const longLabel = d.label.length > 4;
            const labelX = x + barWidth / 2;
            const labelY = height - 8;

            return (
              <React.Fragment key={`bar-${idx}-${d.label}`}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(0, barHeight)}
                  rx={4}
                  ry={4}
                  fill={fill}
                  opacity={0.9}
                />
                {d.secondary != null && d.secondary > 0 ? (
                  <Rect
                    x={x + barWidth * 0.18}
                    y={secondaryY}
                    width={barWidth * 0.64}
                    height={Math.max(0, secondaryHeight)}
                    rx={3}
                    ry={3}
                    fill={c.success}
                    opacity={0.95}
                  />
                ) : null}
                {showValues ? (
                  <SvgText
                    x={x + barWidth / 2}
                    y={y - 4}
                    fontSize={9}
                    fill={c.textSecondary}
                    textAnchor="middle"
                  >
                    {d.value}
                  </SvgText>
                ) : null}
                <SvgText
                  x={labelX}
                  y={labelY}
                  fontSize={10}
                  fill={c.textTertiary}
                  textAnchor={longLabel ? "end" : "middle"}
                  transform={longLabel ? `rotate(-30 ${labelX} ${labelY})` : undefined}
                >
                  {d.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}

/** Round a positive number up to a "nice" axis maximum (1, 2, 5 × 10^k). */
function roundNiceMax(n: number): number {
  if (n <= 0) return 1;
  const exp = Math.floor(Math.log10(n));
  const base = Math.pow(10, exp);
  const fraction = n / base;
  let nice = 1;
  if (fraction <= 1) nice = 1;
  else if (fraction <= 2) nice = 2;
  else if (fraction <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}
