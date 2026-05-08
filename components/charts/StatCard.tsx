import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { withOpacity } from "@/utils/color";

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  /** Optional delta percentage — positive = up (green), negative = down (red). */
  trend?: number;
  /** Accent color for the icon tile. */
  color: string;
  onPress?: () => void;
}

/**
 * KPI card with a tinted icon tile, headline value, label, and optional
 * trend chip. Renders as a TouchableOpacity when onPress is provided so the
 * caller can navigate to a drill-in screen.
 */
export function StatCard({ icon, label, value, trend, color, onPress }: StatCardProps) {
  const c = useColors();

  const trendUp = (trend ?? 0) >= 0;
  const trendColor = trendUp ? c.success : c.error;
  const trendBg = trendUp ? c.successBg : c.errorBg;

  const cardStyle = [
    styles.card,
    {
      backgroundColor: c.surface,
      borderColor: c.borderLight,
      shadowColor: c.text,
    },
  ];

  const inner = (
    <>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconTile,
            { backgroundColor: withOpacity(color, 0.14) },
          ]}
        >
          <Ionicons name={icon} size={18} color={color} />
        </View>
        {typeof trend === "number" ? (
          <View
            style={[
              styles.trendChip,
              { backgroundColor: trendBg },
            ]}
          >
            <Ionicons
              name={trendUp ? "arrow-up" : "arrow-down"}
              size={10}
              color={trendColor}
            />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {Math.abs(trend).toFixed(0)}%
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.value, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.label, { color: c.textTertiary }]} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
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
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  trendChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 2,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
});
