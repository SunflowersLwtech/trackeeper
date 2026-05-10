import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_SM } from "@/constants/Brutalism";
import { formatCurrency } from "@/utils/format";

interface LeaderboardRowProps {
  rank: number;
  name: string;
  completedJobs: number;
  avgRating: number;
  totalEarnings: number;
  color: string;
}

const MEDAL_BY_RANK: Record<number, { icon: keyof typeof Ionicons.glyphMap; tint: string }> = {
  1: { icon: "trophy", tint: palette.mustard500 },
  2: { icon: "medal", tint: palette.ink300 },
  3: { icon: "medal", tint: palette.tomato500 },
};

export function LeaderboardRow({
  rank,
  name,
  completedJobs,
  avgRating,
  totalEarnings,
  color,
}: LeaderboardRowProps) {
  const c = useColors();
  const medal = MEDAL_BY_RANK[rank];

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: c.surface },
      ]}
    >
      <View
        style={[
          styles.rankTile,
          { backgroundColor: medal ? medal.tint : color },
        ]}
      >
        {medal ? (
          <Ionicons name={medal.icon} size={20} color={palette.ink} />
        ) : (
          <Text style={styles.rankText}>{rank}</Text>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statGroup}>
            <Ionicons name="checkmark-done" size={11} color={palette.ink} />
            <Text style={styles.statText}>{completedJobs} JOBS</Text>
          </View>
          <View style={styles.statGroup}>
            <Ionicons name="star" size={11} color={palette.mustard500} />
            <Text style={styles.statText}>
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.earningsBlock}>
        <Text style={[styles.earnings, { color: c.text }]} numberOfLines={1}>
          {formatCurrency(totalEarnings)}
        </Text>
        <Text style={styles.earningsLabel}>EARNED</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    marginBottom: 10,
    gap: 12,
    ...SHADOW_SM,
  },
  rankTile: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.xs,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontFamily: FONT.display,
    fontSize: 16,
    fontWeight: "900",
    color: palette.ink,
    letterSpacing: -0.5,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: FONT.display,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 4,
  },
  statGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontFamily: FONT.mono,
    fontSize: 10,
    fontWeight: "700",
    color: palette.ink,
    letterSpacing: 0.4,
  },
  earningsBlock: {
    alignItems: "flex-end",
  },
  earnings: {
    fontFamily: FONT.display,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  earningsLabel: {
    fontFamily: FONT.display,
    fontSize: 9,
    fontWeight: "900",
    color: palette.ink,
    letterSpacing: 0.8,
    marginTop: 2,
  },
});
