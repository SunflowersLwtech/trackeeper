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
import { withOpacity } from "@/utils/color";
import { formatLongDate } from "@/utils/time";

export default function MaintainerEarningsScreen() {
  const c = useColors();
  const { user } = useAuth();
  const { requests, summary, loading } = useEarnings(user?.uid);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      // Unpaid first, then most recently paid
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
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ title: "Earnings" }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Hero earnings card */}
        <View
          style={{
            borderRadius: 22,
            backgroundColor: c.primary,
            padding: 22,
            marginBottom: 16,
            position: "relative",
            overflow: "hidden",
            shadowColor: c.primary,
            shadowOpacity: 0.3,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          <View style={{ position: "absolute", right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: withOpacity(c.background, 0.08) }} />
          <View style={{ position: "absolute", left: -10, bottom: -10, width: 80, height: 80, borderRadius: 40, backgroundColor: withOpacity(c.background, 0.06) }} />

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="wallet" size={18} color={c.background} />
            <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: "700", color: c.background, letterSpacing: 0.5 }}>
              TOTAL EARNINGS
            </Text>
          </View>
          <Text style={{ color: c.background, fontSize: 38, fontWeight: "900", letterSpacing: -1 }}>
            RM {summary.totalEarnings.toFixed(2)}
          </Text>
          <Text style={{ color: c.background, opacity: 0.9, fontSize: 12, marginTop: 4 }}>
            From {summary.jobCount} {summary.jobCount === 1 ? "job" : "jobs"}
          </Text>
        </View>

        {/* Paid / pending summary */}
        <View style={{ flexDirection: "row", marginBottom: 22 }}>
          <SummaryCard
            label="Paid"
            value={`RM ${summary.paidEarnings.toFixed(2)}`}
            sub={`${summary.paidCount} jobs`}
            icon="checkmark-circle"
            tint={c.success}
            colors={c}
          />
          <View style={{ width: 12 }} />
          <SummaryCard
            label="Pending"
            value={`RM ${summary.pendingEarnings.toFixed(2)}`}
            sub={`${summary.pendingCount} jobs`}
            icon="hourglass"
            tint={c.warning}
            colors={c}
          />
        </View>

        <Text style={{ fontSize: 13, fontWeight: "800", color: c.text, marginBottom: 8, marginLeft: 2 }}>
          Job history
        </Text>

        {sortedRequests.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40, backgroundColor: c.surface, borderRadius: 14 }}>
            <Ionicons name="receipt-outline" size={48} color={c.borderLight} />
            <Text style={{ marginTop: 12, fontSize: 13, color: c.textTertiary }}>No completed jobs yet</Text>
          </View>
        ) : (
          sortedRequests.map((r) => {
            const paid = r.payment?.status === "paid";
            const tint = paid ? c.success : c.warning;
            return (
              <TouchableOpacity
                key={r.id}
                style={{
                  flexDirection: "row",
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: c.background,
                  borderWidth: 1,
                  borderColor: c.borderLight,
                  marginBottom: 10,
                }}
                onPress={() => router.push(`/(maintainer)/${r.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${r.title}`}
                testID={`earnings-row-${r.id}`}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: withOpacity(tint, 0.16),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={paid ? "checkmark-circle" : "hourglass"} size={20} color={tint} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }} numberOfLines={1}>
                    {r.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: c.textTertiary, marginTop: 2 }}>
                    {r.tenantName}{r.tenantUnit ? ` · Unit ${r.tenantUnit}` : ""}
                  </Text>
                  <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
                    {paid ? `Paid ${formatLongDate(r.payment?.paidAt)}` : `Completed ${formatLongDate(r.resolvedAt)}`}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: paid ? c.success : c.warning }}>
                    RM {(r.cost?.total ?? 0).toFixed(2)}
                  </Text>
                  {r.payment?.reference && (
                    <Text style={{ fontSize: 9, color: c.textMuted, marginTop: 2 }}>
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
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  colors: ReturnType<typeof useColors>;
}

function SummaryCard({ label, value, sub, icon, tint, colors: c }: SummaryCardProps) {
  return (
    <View style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: c.surface }}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          backgroundColor: withOpacity(tint, 0.16),
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
        }}
      >
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={{ fontSize: 11, fontWeight: "600", color: c.textTertiary }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: "900", color: c.text, marginTop: 2 }}>{value}</Text>
      <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}>{sub}</Text>
    </View>
  );
}
