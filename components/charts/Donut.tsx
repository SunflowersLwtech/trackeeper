import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER } from "@/constants/Brutalism";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

/**
 * SVG donut chart driven by stroke-dasharray. Each slice is a Circle with the
 * full circumference dashed; we offset its dash start to position it. The
 * mount animation interpolates a single Animated.Value 0→1 and we multiply
 * each slice fraction by it so all slices grow together.
 */
export function Donut({
  data,
  size = 160,
  strokeWidth = 18,
  centerLabel,
  centerValue,
}: DonutProps) {
  const c = useColors();
  const progress = useRef(new Animated.Value(0)).current;
  const [animValue, setAnimValue] = useState(0);

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const id = progress.addListener(({ value }) => setAnimValue(value));
    return () => progress.removeListener(id);
  }, [progress, data]);

  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Build cumulative offsets so each slice starts where the previous one ended.
  const slices = data.map((slice) => ({ ...slice, value: Math.max(0, slice.value) }));
  let cumulative = 0;
  const arcs = slices.map((slice) => {
    const fraction = total > 0 ? slice.value / total : 0;
    const dashLength = fraction * circumference * animValue;
    const offset = -cumulative * circumference;
    cumulative += fraction;
    return { slice, dashLength, offset };
  });

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            {/* Background ring */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={c.borderLight}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {total > 0 && arcs.map((arc, idx) => (
              <Circle
                key={`${arc.slice.label}-${idx}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={arc.slice.color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                fill="none"
                strokeDasharray={`${arc.dashLength}, ${circumference}`}
                strokeDashoffset={arc.offset}
              />
            ))}
          </G>
        </Svg>
        {/* Center labels overlaid */}
        <View style={styles.center} pointerEvents="none">
          {centerValue ? (
            <Text style={[styles.centerValue, { color: c.text }]}>{centerValue}</Text>
          ) : null}
          {centerLabel ? (
            <Text style={[styles.centerLabel, { color: c.textTertiary }]}>{centerLabel}</Text>
          ) : null}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {data.map((slice) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          return (
            <View key={slice.label} style={styles.legendRow}>
              <View style={[styles.legendSwatch, { backgroundColor: slice.color }]} />
              <Text style={[styles.legendLabel, { color: c.textSecondary }]} numberOfLines={1}>
                {slice.label}
              </Text>
              <Text style={[styles.legendValue, { color: c.textTertiary }]}>
                {slice.value} ({pct}%)
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerValue: {
    fontFamily: FONT.display,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
  },
  centerLabel: {
    fontFamily: FONT.display,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 4,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  legend: {
    marginTop: 14,
    width: "100%",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    marginRight: 10,
  },
  legendLabel: {
    flex: 1,
    fontFamily: FONT.display,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  legendValue: {
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
