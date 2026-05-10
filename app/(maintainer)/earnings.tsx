import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useEarnings } from "@/hooks/useEarnings";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";
import { WebContainer } from "@/components/ui/WebContainer";
import { formatLongDate } from "@/utils/time";

export default function MaintainerEarningsScreen() {
  const c = useColors();
  const { user } = useAuth();
  const { requests, summary, loading } = useEarnings(user?.uid);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const aPaid = a.payment?.status === "paid";
      const bPaid = b.payment?.status === "paid";
      if (aPaid !== bPaid) return aPaid ? 1 : -1;
      const aTs = a.payment?.paidAt?.toMillis?.() ?? a.resolvedAt?.toMillis?.() ?? 0;
      const bTs = b.payment?.paidAt?.toMillis?.() ?? b.resolvedAt?.toMillis?.() ?? 0;
      return bTs - aTs;
    });
  }, [requests]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={palette.cobalt500} />
      </View>
    );
  }

  return (
    <WebContainer>
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Stack.Screen options={{ title: "Earnings" }} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {/* Brutalist receipt-style hero card */}
          <View
            style={{
              backgroundColor: palette.lime500,
              padding: 24,
              marginBottom: 18,
              borderWidth: BORDER.heavy,
              borderColor: palette.ink,
              ...SHADOW_MD,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative corner block */}
            <View
              style={{
                position: "absolute",
                right: -30,
                top: -30,
                width: 120,
                height: 120,
                backgroundColor: palette.mustard500,
                borderWidth: BORDER.base,
                borderColor: palette.ink,
                transform: [{ rotate: "10deg" }],
              }}
            />

            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                backgroundColor: palette.ink,
                alignSelf: "flex-start",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: FONT.display,
                  fontSize: 11,
                  fontWeight: "900",
                  color: palette.paper,
                  letterSpacing: 1.4,
                }}
              >
                ◼ TOTAL EARNINGS
              </Text>
            </View>
            <Text
              style={{
                color: palette.ink,
                fontFamily: FONT.display,
                fontSize: 48,
                fontWeight: "900",
                letterSpacing: -2,
              }}
            >
              RM {summary.totalEarnings.toFixed(2)}
            </Text>
            <Text
              style={{
                color: palette.ink,
                fontFamily: FONT.mono,
                fontSize: 12,
                marginTop: 6,
                letterSpacing: 0.4,
              }}
            >
              From {summary.jobCount} {summary.jobCount === 1 ? "job" : "jobs"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", marginBottom: 16, gap: 12 }}>
            <SummaryCard
              label="Paid"
              value={`RM ${summary.paidEarnings.toFixed(2)}`}
              sub={`${summary.paidCount} JOBS`}
              icon="checkmark-circle"
              tint={palette.lime500}
            />
            <SummaryCard
              label="Pending"
              value={`RM ${summary.pendingEarnings.toFixed(2)}`}
              sub={`${summary.pendingCount} JOBS`}
              icon="hourglass"
              tint={palette.mustard500}
            />
          </View>

          {summary.refundedCount > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginBottom: 18,
                borderWidth: BORDER.base,
                borderColor: palette.ink400,
                backgroundColor: c.surfaceAlt,
              }}
              testID="earnings-refunded-line"
            >
              <Ionicons name="arrow-undo" size={16} color={palette.ink500} />
              <Text
                style={{
                  marginLeft: 10,
                  flex: 1,
                  fontFamily: FONT.display,
                  fontSize: 11,
                  fontWeight: "900",
                  color: palette.ink500,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                Refunded
              </Text>
              <Text
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 13,
                  fontWeight: "700",
                  color: palette.ink500,
                  letterSpacing: 0.3,
                }}
              >
                -RM {summary.refundedEarnings.toFixed(2)} · {summary.refundedCount} {summary.refundedCount === 1 ? "job" : "jobs"}
              </Text>
            </View>
          )}

          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: palette.ink,
              alignSelf: "flex-start",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontFamily: FONT.display,
                fontSize: 12,
                fontWeight: "900",
                color: palette.paper,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              ◼ Job history
            </Text>
          </View>

          {sortedRequests.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 40,
                backgroundColor: c.surface,
                borderWidth: BORDER.base,
                borderColor: palette.ink,
                ...SHADOW_SM,
              }}
            >
              <Ionicons name="receipt-outline" size={48} color={palette.ink400} />
              <Text style={{ marginTop: 12, fontFamily: FONT.body, fontSize: 13, color: c.textBody }}>
                No completed jobs yet
              </Text>
            </View>
          ) : (
            sortedRequests.map((r) => {
              const status = r.payment?.status;
              const paid = status === "paid";
              const refunded = status === "refunded";
              const tint = refunded
                ? palette.ink400
                : paid
                  ? palette.lime500
                  : palette.mustard500;
              const iconName = refunded ? "arrow-undo" : paid ? "checkmark" : "hourglass";
              const amountColor = refunded
                ? palette.ink400
                : paid
                  ? palette.lime700
                  : palette.mustard700;
              const dateLabel = refunded
                ? `REFUNDED ${formatLongDate(r.payment?.refundedAt)}`
                : paid
                  ? `PAID ${formatLongDate(r.payment?.paidAt)}`
                  : `DONE ${formatLongDate(r.resolvedAt)}`;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={{
                    flexDirection: "row",
                    padding: 14,
                    backgroundColor: refunded ? c.surfaceAlt : c.surface,
                    borderWidth: BORDER.base,
                    borderColor: refunded ? palette.ink400 : palette.ink,
                    marginBottom: 12,
                    ...SHADOW_SM,
                    opacity: refunded ? 0.85 : 1,
                  }}
                  onPress={() => router.push(`/(maintainer)/${r.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${r.title}${refunded ? ", refunded" : ""}`}
                  testID={`earnings-row-${r.id}`}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: tint,
                      borderWidth: BORDER.base,
                      borderColor: palette.ink,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={iconName} size={22} color={refunded ? palette.paper : palette.ink} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                    <Text
                      style={{
                        fontFamily: FONT.display,
                        fontSize: 14,
                        fontWeight: "900",
                        color: refunded ? palette.ink500 : c.text,
                        letterSpacing: -0.1,
                        textDecorationLine: refunded ? "line-through" : "none",
                      }}
                      numberOfLines={1}
                    >
                      {r.title}
                    </Text>
                    <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: c.textBody, marginTop: 3, letterSpacing: 0.2 }}>
                      {r.tenantName}{r.tenantUnit ? ` · UNIT ${r.tenantUnit.toUpperCase()}` : ""}
                    </Text>
                    <Text style={{ fontFamily: FONT.mono, fontSize: 10, color: c.textMuted, marginTop: 2, letterSpacing: 0.2 }}>
                      {dateLabel}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontFamily: FONT.display,
                        fontSize: 18,
                        fontWeight: "900",
                        color: amountColor,
                        letterSpacing: -0.4,
                        textDecorationLine: refunded ? "line-through" : "none",
                      }}
                    >
                      {refunded ? "-" : ""}RM {(r.cost?.total ?? 0).toFixed(2)}
                    </Text>
                    {r.payment?.reference && (
                      <Text style={{ fontFamily: FONT.mono, fontSize: 9, color: c.textMuted, marginTop: 2 }}>
                        {r.payment.reference}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </WebContainer>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}

function SummaryCard({ label, value, sub, icon, tint }: SummaryCardProps) {
  return (
    <View
      style={{
        flex: 1,
        padding: 14,
        backgroundColor: palette.paper,
        borderWidth: BORDER.base,
        borderColor: palette.ink,
        ...SHADOW_SM,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          backgroundColor: tint,
          borderWidth: BORDER.base,
          borderColor: palette.ink,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons name={icon} size={18} color={palette.ink} />
      </View>
      <Text style={{ fontFamily: FONT.display, fontSize: 10, fontWeight: "900", color: palette.ink, letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: "900", color: palette.ink, marginTop: 4, letterSpacing: -0.6 }}>
        {value}
      </Text>
      <Text style={{ fontFamily: FONT.mono, fontSize: 10, color: palette.ink400, marginTop: 4, letterSpacing: 0.4 }}>
        {sub}
      </Text>
    </View>
  );
}
