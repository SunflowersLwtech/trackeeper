import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { withOpacity } from "@/utils/color";

interface HeatmapProps {
  /** 7 rows (Sun..Sat) × 24 cols (00..23) of counts. */
  data: number[][];
  /** Override max value (defaults to grid max). */
  maxValue?: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = ["0", "6", "12", "18"];

const LEFT_GUTTER = 30;
const BOTTOM_GUTTER = 18;
const TOP_PADDING = 4;
const CELL_GAP = 1;

/**
 * 7×24 day-of-week × hour heatmap. Rows are days, columns are hours. Each
 * cell is a Rect tinted by intensity (white / surface → primary). Drawn with
 * react-native-svg so it scales to any container width.
 */
export function Heatmap({ data, maxValue }: HeatmapProps) {
  const c = useColors();
  const [width, setWidth] = useState(0);

  // Compute the local max once so the gradient is comparable across cells.
  const computedMax = Math.max(
    1,
    maxValue ?? data.reduce((m, row) => Math.max(m, ...row), 0),
  );

  const gridWidth = Math.max(0, width - LEFT_GUTTER);
  const cellWidth = gridWidth > 0 ? (gridWidth - CELL_GAP * 23) / 24 : 0;
  const cellHeight = cellWidth; // square cells
  const gridHeight = (cellHeight + CELL_GAP) * 7 - CELL_GAP;
  const svgHeight = gridHeight + TOP_PADDING + BOTTOM_GUTTER;

  return (
    <View style={styles.container} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={svgHeight}>
          {/* Day labels (left gutter) */}
          {DAY_LABELS.map((day, idx) => (
            <SvgText
              key={`day-${day}`}
              x={LEFT_GUTTER - 6}
              y={TOP_PADDING + idx * (cellHeight + CELL_GAP) + cellHeight / 2 + 3}
              fontSize={9}
              fill={c.textTertiary}
              textAnchor="end"
            >
              {day}
            </SvgText>
          ))}

          {/* Cells */}
          {data.map((row, rowIdx) =>
            row.map((value, colIdx) => {
              const intensity = value / computedMax;
              const fill = intensity === 0
                ? c.surfaceAlt
                : withOpacity(c.primary, 0.15 + intensity * 0.75);
              const x = LEFT_GUTTER + colIdx * (cellWidth + CELL_GAP);
              const y = TOP_PADDING + rowIdx * (cellHeight + CELL_GAP);
              return (
                <Rect
                  key={`cell-${rowIdx}-${colIdx}`}
                  x={x}
                  y={y}
                  width={cellWidth}
                  height={cellHeight}
                  rx={2}
                  ry={2}
                  fill={fill}
                />
              );
            }),
          )}

          {/* Hour labels (bottom) — show at 0, 6, 12, 18 */}
          {HOUR_LABELS.map((label) => {
            const hour = parseInt(label, 10);
            const x = LEFT_GUTTER + hour * (cellWidth + CELL_GAP) + cellWidth / 2;
            return (
              <SvgText
                key={`hour-${label}`}
                x={x}
                y={TOP_PADDING + gridHeight + BOTTOM_GUTTER - 4}
                fontSize={9}
                fill={c.textTertiary}
                textAnchor="middle"
              >
                {label.padStart(2, "0")}:00
              </SvgText>
            );
          })}
        </Svg>
      ) : (
        <View style={{ height: 140 }} />
      )}

      {/* Inline scale legend */}
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: c.textTertiary }]}>Less</Text>
        {[0.15, 0.4, 0.65, 0.9].map((alpha) => (
          <View
            key={alpha}
            style={[
              styles.legendCell,
              { backgroundColor: withOpacity(c.primary, alpha) },
            ]}
          />
        ))}
        <Text style={[styles.legendText, { color: c.textTertiary }]}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 4,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "500",
  },
});
