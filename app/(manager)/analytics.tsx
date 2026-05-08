import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Animated,
  Easing,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebContainer } from "@/components/ui/WebContainer";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { useColors } from "@/hooks/useColors";
import { useAnalytics } from "@/hooks/useAnalytics";
import { StatCard } from "@/components/charts/StatCard";
import { Donut } from "@/components/charts/Donut";
import { BarChart } from "@/components/charts/BarChart";
import { Heatmap } from "@/components/charts/Heatmap";
import { LeaderboardRow } from "@/components/charts/LeaderboardRow";
import { getStatusColor, getStatusLabel } from "@/utils/status";
import { getPriorityColor, getPriorityLabel } from "@/utils/priority";
import { withOpacity } from "@/utils/color";
import {
  formatCurrency,
  formatHours,
  formatPercent,
} from "@/utils/format";

const SECTION_DELAY = 80;

interface SectionProps {
  anim: Animated.Value;
  children: React.ReactNode;
}

/**
 * Wrap a chunk of the dashboard so it fades + lifts in when its driving
 * Animated.Value reaches 1. Defined outside the screen component so React
 * does not remount its children on every parent re-render.
 */
function Section({ anim, children }: SectionProps) {
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Manager analytics dashboard. Subscribes to all requests + maintainers via
 * the useAnalytics hook and renders KPIs, donut breakdowns, a 6-month trend
 * bar chart, category breakdown, a 7×24 submission heatmap, the maintainer
 * leaderboard, and a revenue split. Sections fade in sequentially on mount.
 */
export default function ManagerAnalyticsScreen() {
  const c = useColors();
  const {
    loading,
    error,
    kpis,
    statusBreakdown,
    priorityBreakdown,
    categoryBreakdown,
    monthlyTrend,
    leaderboard,
    heatmap,
    revenue,
    refresh,
  } = useAnalytics();

  // Stagger fade for each section.
  const sectionAnims = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (loading) return;
    const animations = sectionAnims.map((anim, idx) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 360,
        delay: idx * SECTION_DELAY,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    sectionAnims.forEach((a) => a.setValue(0));
    Animated.stagger(SECTION_DELAY, animations).start();
  }, [loading, sectionAnims]);

  // Donut data: status & priority
  const statusDonut = useMemo(
    () =>
      (Object.keys(statusBreakdown) as (keyof typeof statusBreakdown)[]) // typed keys
        .map((s) => ({
          label: getStatusLabel(s),
          value: statusBreakdown[s],
          color: getStatusColor(s),
        }))
        .filter((d) => d.value > 0),
    [statusBreakdown],
  );

  const priorityDonut = useMemo(
    () =>
      (Object.keys(priorityBreakdown) as (keyof typeof priorityBreakdown)[])
        .map((p) => ({
          label: getPriorityLabel(p),
          value: priorityBreakdown[p],
          color: getPriorityColor(p),
        }))
        .filter((d) => d.value > 0),
    [priorityBreakdown],
  );

  const categoryBars = useMemo(() => {
    const palette = [c.primary, c.violet, c.warning];
    return (Object.keys(categoryBreakdown) as (keyof typeof categoryBreakdown)[]).map(
      (cat, idx) => ({
        label: cat,
        value: categoryBreakdown[cat],
        color: palette[idx % palette.length],
      }),
    );
  }, [categoryBreakdown, c.primary, c.violet, c.warning]);

  const trendBars = useMemo(
    () =>
      monthlyTrend.map((m) => ({
        label: m.label,
        value: m.count,
        secondary: m.completed,
        color: c.primary,
      })),
    [monthlyTrend, c.primary],
  );

  const topLeaderboard = leaderboard.slice(0, 5);

  // Revenue split percentages for the bar
  const paidPct = revenue.total > 0 ? (revenue.paid / revenue.total) * 100 : 0;
  const unpaidPct = 100 - paidPct;

  if (loading) {
    return (
      <WebContainer>
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <SkeletonList count={5} />
        </View>
      </WebContainer>
    );
  }

  if (error) {
    return (
      <WebContainer>
        <View style={[styles.errorContainer, { backgroundColor: c.background }]}>
          <Ionicons name="alert-circle-outline" size={42} color={c.error} />
          <Text style={[styles.errorTitle, { color: c.error }]}>Failed to load analytics</Text>
          <Text style={[styles.errorMessage, { color: c.textTertiary }]}>{error.message}</Text>
        </View>
      </WebContainer>
    );
  }

  return (
    <WebContainer>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.background }}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={c.primary} />}
      >
        {/* Header */}
        <Section anim={sectionAnims[0]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.text }]}>Analytics</Text>
            <Text style={[styles.subtitle, { color: c.textTertiary }]}>
              Real-time operations dashboard
            </Text>
          </View>
        </Section>

        {/* KPI Grid */}
        <Section anim={sectionAnims[1]}>
          <View style={styles.kpiGrid}>
            <StatCard
              icon="document-text-outline"
              label="Total Requests"
              value={kpis.totalRequests.toString()}
              color={c.primary}
            />
            <StatCard
              icon="time-outline"
              label="Open Now"
              value={kpis.openNow.toString()}
              color={c.warning}
            />
            <StatCard
              icon="checkmark-done-outline"
              label="Completed this month"
              value={kpis.completedThisMonth.toString()}
              color={c.success}
            />
            <StatCard
              icon="star-outline"
              label={kpis.ratingCount > 0 ? `Avg Rating (${kpis.ratingCount})` : "Avg Rating"}
              value={kpis.avgRating > 0 ? kpis.avgRating.toFixed(1) : "—"}
              color={c.violet}
            />
          </View>
          {kpis.avgResolutionHours > 0 ? (
            <View
              style={[
                styles.resolutionPill,
                { backgroundColor: withOpacity(c.primary, 0.08), borderColor: withOpacity(c.primary, 0.2) },
              ]}
            >
              <Ionicons name="hourglass-outline" size={14} color={c.primary} />
              <Text style={[styles.resolutionText, { color: c.text }]}>
                Avg resolution time:{" "}
                <Text style={{ fontWeight: "700" }}>{formatHours(kpis.avgResolutionHours)}</Text>
              </Text>
            </View>
          ) : null}
        </Section>

        {/* Donut row */}
        <Section anim={sectionAnims[2]}>
          <View style={styles.donutRow}>
            <View
              style={[
                styles.donutCard,
                { backgroundColor: c.surface, borderColor: c.borderLight },
              ]}
            >
              <Text style={[styles.cardTitle, { color: c.text }]}>Status</Text>
              {statusDonut.length > 0 ? (
                <Donut
                  data={statusDonut}
                  size={140}
                  strokeWidth={16}
                  centerValue={kpis.totalRequests.toString()}
                  centerLabel="total"
                />
              ) : (
                <Text style={[styles.empty, { color: c.textMuted }]}>No data yet</Text>
              )}
            </View>
            <View
              style={[
                styles.donutCard,
                { backgroundColor: c.surface, borderColor: c.borderLight },
              ]}
            >
              <Text style={[styles.cardTitle, { color: c.text }]}>Priority</Text>
              {priorityDonut.length > 0 ? (
                <Donut
                  data={priorityDonut}
                  size={140}
                  strokeWidth={16}
                  centerValue={kpis.openNow.toString()}
                  centerLabel="open"
                />
              ) : (
                <Text style={[styles.empty, { color: c.textMuted }]}>No data yet</Text>
              )}
            </View>
          </View>
        </Section>

        {/* 6-Month Trend */}
        <Section anim={sectionAnims[3]}>
          <View
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.borderLight },
            ]}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: c.text }]}>6-Month Trend</Text>
                <Text style={[styles.cardSubtitle, { color: c.textTertiary }]}>
                  Created vs. completed
                </Text>
              </View>
              <View style={styles.legendInline}>
                <View style={[styles.legendDot, { backgroundColor: c.primary }]} />
                <Text style={[styles.legendInlineText, { color: c.textTertiary }]}>Created</Text>
                <View style={[styles.legendDot, { backgroundColor: c.success, marginLeft: 10 }]} />
                <Text style={[styles.legendInlineText, { color: c.textTertiary }]}>Done</Text>
              </View>
            </View>
            <BarChart data={trendBars} height={200} showValues />
          </View>
        </Section>

        {/* Category Breakdown */}
        <Section anim={sectionAnims[4]}>
          <View
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.borderLight },
            ]}
          >
            <Text style={[styles.cardTitle, { color: c.text }]}>By Category</Text>
            <Text style={[styles.cardSubtitle, { color: c.textTertiary }]}>
              Where work is concentrated
            </Text>
            <View style={{ marginTop: 8 }}>
              <BarChart data={categoryBars} height={180} showValues />
            </View>
          </View>
        </Section>

        {/* Heatmap */}
        <Section anim={sectionAnims[5]}>
          <View
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.borderLight },
            ]}
          >
            <Text style={[styles.cardTitle, { color: c.text }]}>Submission Heatmap</Text>
            <Text style={[styles.cardSubtitle, { color: c.textTertiary }]}>
              When requests typically come in
            </Text>
            <View style={{ marginTop: 12 }}>
              <Heatmap data={heatmap} />
            </View>
          </View>
        </Section>

        {/* Leaderboard + Revenue */}
        <Section anim={sectionAnims[6]}>
          <View
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.borderLight },
            ]}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: c.text }]}>Top Maintainers</Text>
                <Text style={[styles.cardSubtitle, { color: c.textTertiary }]}>
                  Ranked by completed jobs
                </Text>
              </View>
              <Ionicons name="trophy-outline" size={18} color={c.warning} />
            </View>

            <View style={{ marginTop: 12 }}>
              {topLeaderboard.length === 0 ? (
                <Text style={[styles.empty, { color: c.textMuted }]}>No maintainers yet</Text>
              ) : (
                topLeaderboard.map((entry, idx) => (
                  <LeaderboardRow
                    key={entry.uid}
                    rank={idx + 1}
                    name={entry.name}
                    completedJobs={entry.completedJobs}
                    avgRating={entry.avgRating}
                    totalEarnings={entry.totalEarnings}
                    color={c.primary}
                  />
                ))
              )}
            </View>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.borderLight },
            ]}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: c.text }]}>Revenue</Text>
                <Text style={[styles.cardSubtitle, { color: c.textTertiary }]}>
                  Across {revenue.jobCount} costed jobs
                </Text>
              </View>
              <Text style={[styles.revenueTotal, { color: c.text }]}>
                {formatCurrency(revenue.total)}
              </Text>
            </View>

            {/* Split bar */}
            <View
              style={[
                styles.splitBar,
                { backgroundColor: c.borderLight },
              ]}
            >
              {paidPct > 0 ? (
                <View
                  style={[
                    styles.splitSegment,
                    {
                      backgroundColor: c.success,
                      width: `${paidPct}%`,
                      borderTopRightRadius: unpaidPct === 0 ? 999 : 0,
                      borderBottomRightRadius: unpaidPct === 0 ? 999 : 0,
                    },
                  ]}
                />
              ) : null}
              {unpaidPct > 0 ? (
                <View
                  style={[
                    styles.splitSegment,
                    {
                      backgroundColor: c.warning,
                      width: `${unpaidPct}%`,
                      borderTopLeftRadius: paidPct === 0 ? 999 : 0,
                      borderBottomLeftRadius: paidPct === 0 ? 999 : 0,
                    },
                  ]}
                />
              ) : null}
            </View>

            <View style={styles.revenueLegend}>
              <View style={styles.revenueLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: c.success }]} />
                <View>
                  <Text style={[styles.revenueLegendLabel, { color: c.textTertiary }]}>
                    Paid · {formatPercent(paidPct, paidPct > 0 && paidPct < 1 ? 1 : 0)}
                  </Text>
                  <Text style={[styles.revenueLegendValue, { color: c.text }]}>
                    {formatCurrency(revenue.paid)}
                  </Text>
                </View>
              </View>
              <View style={styles.revenueLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: c.warning }]} />
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.revenueLegendLabel, { color: c.textTertiary }]}>
                    Unpaid · {formatPercent(unpaidPct, unpaidPct > 0 && unpaidPct < 1 ? 1 : 0)}
                  </Text>
                  <Text style={[styles.revenueLegendValue, { color: c.text }]}>
                    {formatCurrency(revenue.unpaid)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Section>
      </ScrollView>
    </WebContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  resolutionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    gap: 8,
  },
  resolutionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  donutRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: Platform.OS === "web" ? "nowrap" : "wrap",
  },
  donutCard: {
    flex: 1,
    minWidth: 240,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    alignSelf: "flex-start",
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  empty: {
    fontSize: 13,
    fontWeight: "500",
    paddingVertical: 24,
    textAlign: "center",
  },
  legendInline: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendInlineText: {
    fontSize: 11,
    fontWeight: "600",
  },
  splitBar: {
    flexDirection: "row",
    height: 14,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 14,
  },
  splitSegment: {
    height: "100%",
  },
  revenueLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  revenueLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  revenueLegendLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  revenueLegendValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 1,
  },
  revenueTotal: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  errorMessage: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});
