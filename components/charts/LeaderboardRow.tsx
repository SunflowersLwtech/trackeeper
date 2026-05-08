import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { withOpacity } from "@/utils/color";
import { formatCurrency } from "@/utils/format";

interface LeaderboardRowProps {
  rank: number;
  name: string;
  completedJobs: number;
  avgRating: number;
  totalEarnings: number;
  /** Accent color (typically derived from rank). */
  color: string;
}

const MEDAL_BY_RANK: Record<number, { icon: keyof typeof Ionicons.glyphMap; tint: string }> = {
  1: { icon: "trophy", tint: "#fbbf24" },
  2: { icon: "medal", tint: "#9ca3af" },
  3: { icon: "medal", tint: "#b45309" },
};

/**
 * One row of the maintainer ranking. Renders a medal for ranks 1–3 and a
 * neutral numeric badge otherwise. Shows completed jobs, avg rating, and
 * total earnings in three compact stat groups.
 */
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
        {
          backgroundColor: c.surface,
          borderColor: c.borderLight,
        },
      ]}
    >
      <View
        style={[
          styles.rankTile,
          {
            backgroundColor: medal ? withOpacity(medal.tint, 0.16) : withOpacity(color, 0.14),
          },
        ]}
      >
        {medal ? (
          <Ionicons name={medal.icon} size={18} color={medal.tint} />
        ) : (
          <Text style={[styles.rankText, { color }]}>#{rank}</Text>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statGroup}>
            <Ionicons name="checkmark-done-outline" size={11} color={c.textTertiary} />
            <Text style={[styles.statText, { color: c.textTertiary }]}>
              {completedJobs} jobs
            </Text>
          </View>
          <View style={styles.statGroup}>
            <Ionicons name="star" size={11} color={c.warning} />
            <Text style={[styles.statText, { color: c.textTertiary }]}>
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.earningsBlock}>
        <Text style={[styles.earnings, { color: c.text }]} numberOfLines={1}>
          {formatCurrency(totalEarnings)}
        </Text>
        <Text style={[styles.earningsLabel, { color: c.textMuted }]}>earned</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  rankTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 13,
    fontWeight: "700",
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  statGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: "500",
  },
  earningsBlock: {
    alignItems: "flex-end",
  },
  earnings: {
    fontSize: 14,
    fontWeight: "700",
  },
  earningsLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
});
