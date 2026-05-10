import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  trend?: number;
  color: string;
  onPress?: () => void;
}

const DARK_ON: ReadonlySet<string> = new Set<string>([
  palette.cobalt500,
  palette.tomato500,
  palette.plum500,
  palette.sky500,
  palette.ink,
]);

export function StatCard({ icon, label, value, trend, color, onPress }: StatCardProps) {
  const c = useColors();
  const useLightOnIcon = DARK_ON.has(color);
  const trendUp = (trend ?? 0) >= 0;

  const cardStyle = [
    styles.card,
    {
      backgroundColor: c.surface,
    },
  ];

  const inner = (
    <>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconTile,
            { backgroundColor: color },
          ]}
        >
          <Ionicons name={icon} size={20} color={useLightOnIcon ? palette.paper : palette.ink} />
        </View>
        {typeof trend === "number" ? (
          <View
            style={[
              styles.trendChip,
              { backgroundColor: trendUp ? palette.lime500 : palette.tomato500 },
            ]}
          >
            <Ionicons
              name={trendUp ? "arrow-up" : "arrow-down"}
              size={11}
              color={trendUp ? palette.ink : palette.paper}
            />
            <Text
              style={[
                styles.trendText,
                { color: trendUp ? palette.ink : palette.paper },
              ]}
            >
              {Math.abs(trend).toFixed(0)}%
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[styles.value, { color: c.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <View style={styles.labelDivider} />
      <Text style={[styles.label, { color: c.textBody }]} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={cardStyle}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={cardStyle}
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}`}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    minHeight: 132,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    borderRadius: RADIUS.sm,
    padding: 14,
    overflow: "hidden",
    ...SHADOW_MD,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW_SM,
  },
  trendChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    gap: 2,
  },
  trendText: {
    fontFamily: FONT.display,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    marginLeft: 3,
  },
  value: {
    fontFamily: FONT.display,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -1,
  },
  labelDivider: {
    height: BORDER.base,
    backgroundColor: palette.ink,
    width: 24,
    marginVertical: 6,
  },
  label: {
    fontFamily: FONT.display,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
