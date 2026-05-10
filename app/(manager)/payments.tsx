import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Timestamp } from "firebase/firestore";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useAllRequests } from "@/hooks/useRequests";
import { useColors } from "@/hooks/useColors";
import { MaintenanceRequest, PaymentMethod, RequestPayment } from "@/types";
import { PaymentDialog } from "@/components/payment/PaymentDialog";
import { WebContainer } from "@/components/ui/WebContainer";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { payMaintainer, markPaymentPending } from "@/services/payments";
import { showError, showSuccess } from "@/utils/toast";
import { formatCurrency } from "@/utils/format";
import { formatLongDate, formatTimeAgo } from "@/utils/time";
import { friendlyErrorMessage } from "@/utils/errorMessages";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";

type SettlementState = "all" | "needs_cost" | "unpaid" | "pending" | "paid" | "refunded";

interface SettlementRow {
  request: MaintenanceRequest;
  payment: RequestPayment | null;
  state: Exclude<SettlementState, "all">;
}

const FILTERS: { key: SettlementState; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "All", icon: "albums" },
  { key: "needs_cost", label: "Cost", icon: "calculator" },
  { key: "unpaid", label: "Unpaid", icon: "wallet" },
  { key: "pending", label: "Pending", icon: "hourglass" },
  { key: "paid", label: "Paid", icon: "checkmark-circle" },
  { key: "refunded", label: "Refunded", icon: "arrow-undo" },
];

function settlementState(request: MaintenanceRequest, payment: RequestPayment | null): Exclude<SettlementState, "all"> {
  if (!request.cost) return "needs_cost";
  if (payment?.status === "pending") return "pending";
  if (payment?.status === "paid") return "paid";
  if (payment?.status === "refunded") return "refunded";
  return "unpaid";
}

function stateLabel(state: Exclude<SettlementState, "all">): string {
  switch (state) {
    case "needs_cost":
      return "Needs cost";
    case "unpaid":
      return "Unpaid";
    case "pending":
      return "Pending";
    case "paid":
      return "Paid";
    case "refunded":
      return "Refunded";
  }
}

function stateColor(state: Exclude<SettlementState, "all">): string {
  switch (state) {
    case "needs_cost":
      return palette.sky500;
    case "unpaid":
      return palette.mustard500;
    case "pending":
      return palette.mustard700;
    case "paid":
      return palette.lime500;
    case "refunded":
      return palette.ink400;
  }
}

export default function ManagerPaymentsScreen() {
  const c = useColors();
  const { user } = useAuth();
  const { requests, loading, error, refreshing, refresh } = useAllRequests();
  const [filter, setFilter] = useState<SettlementState>("all");
  const [selected, setSelected] = useState<SettlementRow | null>(null);
  const [optimisticPayments, setOptimisticPayments] = useState<Record<string, RequestPayment>>({});

  useEffect(() => {
    setOptimisticPayments((current) => {
      const next = { ...current };
      let changed = false;
      for (const request of requests) {
        const optimistic = next[request.id];
        if (optimistic && request.payment?.status === optimistic.status) {
          delete next[request.id];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [requests]);

  const rows = useMemo<SettlementRow[]>(() => {
    return requests
      .filter((request) => {
        if (!request.assignedTo || !request.assignedToName) return false;
        return request.status === "completed" || request.status === "verified" || !!request.cost || !!request.payment;
      })
      .map((request) => {
        const payment = optimisticPayments[request.id] ?? request.payment ?? null;
        return { request, payment, state: settlementState(request, payment) };
      })
      .sort((a, b) => {
        const rank: Record<Exclude<SettlementState, "all">, number> = {
          needs_cost: 0,
          unpaid: 1,
          pending: 2,
          paid: 3,
          refunded: 4,
        };
        const diff = rank[a.state] - rank[b.state];
        if (diff !== 0) return diff;
        return (b.request.clientTimestamp ?? 0) - (a.request.clientTimestamp ?? 0);
      });
  }, [requests, optimisticPayments]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((row) => row.state === filter);
  }, [rows, filter]);

  const summary = useMemo(() => {
    const totals = {
      needs_cost: 0,
      unpaid: 0,
      pending: 0,
      paid: 0,
      refunded: 0,
      payableAmount: 0,
      pendingAmount: 0,
      paidAmount: 0,
    };
    for (const row of rows) {
      totals[row.state] += 1;
      const amount = row.request.cost?.total ?? row.payment?.amount ?? 0;
      if (row.state === "unpaid") totals.payableAmount += amount;
      if (row.state === "pending") totals.pendingAmount += amount;
      if (row.state === "paid") totals.paidAmount += amount;
    }
    return totals;
  }, [rows]);

  const handleSubmitPayment = async (action: "pay" | "mark_pending", method: PaymentMethod) => {
    if (!selected || !user) return;
    const { request } = selected;
    if (!request.cost || !request.assignedTo || !request.assignedToName) {
      showError("Cannot pay", "Cost or assignee missing.");
      throw new Error("missing payment inputs");
    }

    try {
      if (action === "pay") {
        const paid = await payMaintainer(
          request.id,
          request.cost.total,
          method,
          user.uid,
          user.name,
          request.assignedTo,
          request.assignedToName,
        );
        setOptimisticPayments((current) => ({ ...current, [request.id]: paid }));
        showSuccess("Payment sent", `Reference ${paid.reference ?? "-"}`);
      } else {
        const pending: RequestPayment = {
          status: "pending",
          method,
          amount: Math.round(request.cost.total * 100) / 100,
          paidAt: Timestamp.now(),
          paidBy: user.uid,
          paidByName: user.name,
        };
        await markPaymentPending(
          request.id,
          request.cost.total,
          method,
          user.uid,
          user.name,
        );
        setOptimisticPayments((current) => ({ ...current, [request.id]: pending }));
        showSuccess("Marked as pending", "Confirm in your bank app");
      }
    } catch (err) {
      const message = friendlyErrorMessage(err, "Payment failed. Try again.");
      showError("Payment failed", message);
      throw err;
    }
  };

  if (loading) {
    return (
      <WebContainer>
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <SkeletonList count={4} />
        </View>
      </WebContainer>
    );
  }

  if (error) {
    return (
      <WebContainer>
        <View style={{ flex: 1, backgroundColor: c.background, padding: 20, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: "900", color: palette.tomato500, textTransform: "uppercase" }}>
            Payment queue failed
          </Text>
          <Text style={{ marginTop: 8, fontFamily: FONT.mono, fontSize: 12, color: c.textMuted, textAlign: "center" }}>
            {friendlyErrorMessage(error, "Payment queue is unavailable. Pull to refresh or retry.")}
          </Text>
          <TouchableOpacity
            onPress={refresh}
            style={{ marginTop: 18, paddingHorizontal: 22, paddingVertical: 12, backgroundColor: palette.cobalt500, borderWidth: BORDER.base, borderColor: palette.ink, ...SHADOW_MD }}
          >
            <Text style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: "900", color: palette.paper, textTransform: "uppercase" }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </WebContainer>
    );
  }

  return (
    <WebContainer>
      <View style={{ flex: 1, backgroundColor: c.background }} testID="manager-payments-screen">
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.cobalt500} />}
          contentContainerStyle={{ padding: 18, paddingBottom: 90 }}
        >
          <View
            style={{
              padding: 18,
              backgroundColor: palette.ink,
              borderWidth: BORDER.heavy,
              borderColor: palette.ink,
              ...SHADOW_MD,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", letterSpacing: 1, color: palette.mustard500, textTransform: "uppercase" }}>
                  Simulated payouts
                </Text>
                <Text style={{ marginTop: 6, fontFamily: FONT.display, fontSize: 28, fontWeight: "900", color: palette.paper, letterSpacing: 0, textTransform: "uppercase" }}>
                  Payment desk
                </Text>
              </View>
              <View style={{ width: 56, height: 56, backgroundColor: palette.lime500, borderWidth: BORDER.base, borderColor: palette.paper, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="wallet" size={28} color={palette.ink} />
              </View>
            </View>
            <View style={{ marginTop: 18, flexDirection: "row", gap: 10 }}>
              <HeroMetric label="To pay" value={formatCurrency(summary.payableAmount)} tint={palette.mustard500} />
              <HeroMetric label="Pending" value={formatCurrency(summary.pendingAmount)} tint={palette.sky500} />
              <HeroMetric label="Paid" value={formatCurrency(summary.paidAmount)} tint={palette.lime500} />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 16 }}
          >
            {FILTERS.map((item) => {
              const active = filter === item.key;
              const count = item.key === "all" ? rows.length : summary[item.key as Exclude<SettlementState, "all">];
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setFilter(item.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Payment filter ${item.label}`}
                  testID={`payments-filter-${item.key}`}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: active ? palette.cobalt500 : c.surface,
                    borderWidth: BORDER.base,
                    borderColor: palette.ink,
                    ...SHADOW_SM,
                  }}
                >
                  <Ionicons name={item.icon} size={15} color={active ? palette.paper : palette.ink} />
                  <Text style={{ marginLeft: 6, fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: active ? palette.paper : palette.ink, textTransform: "uppercase" }}>
                    {item.label}
                  </Text>
                  <View style={{ marginLeft: 7, minWidth: 20, height: 20, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", backgroundColor: active ? palette.paper : palette.ink }}>
                    <Text style={{ fontFamily: FONT.mono, fontSize: 10, fontWeight: "900", color: active ? palette.ink : palette.paper }}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {filteredRows.length === 0 ? (
            <View style={{ padding: 28, alignItems: "center", backgroundColor: c.surface, borderWidth: BORDER.base, borderColor: palette.ink, ...SHADOW_SM }} testID="payments-empty">
              <Ionicons name="receipt-outline" size={44} color={palette.ink400} />
              <Text style={{ marginTop: 10, fontFamily: FONT.display, fontSize: 14, fontWeight: "900", color: c.text, textTransform: "uppercase" }}>
                No settlement rows
              </Text>
            </View>
          ) : (
            filteredRows.map((row) => (
              <PaymentRow
                key={row.request.id}
                row={row}
                onOpen={() => router.push(`/(manager)/${row.request.id}`)}
                onPay={() => setSelected(row)}
              />
            ))
          )}
        </ScrollView>

        {selected?.request.cost && selected.request.assignedToName && (
          <PaymentDialog
            visible={!!selected}
            amount={selected.request.cost.total}
            payeeName={selected.request.assignedToName}
            jobTitle={selected.request.title}
            payment={optimisticPayments[selected.request.id] ?? selected.payment}
            onClose={() => setSelected(null)}
            onSubmit={handleSubmitPayment}
          />
        )}
      </View>
    </WebContainer>
  );
}

function HeroMetric({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, padding: 10, backgroundColor: palette.paper, borderWidth: BORDER.base, borderColor: tint }}>
      <Text style={{ fontFamily: FONT.display, fontSize: 9, fontWeight: "900", color: palette.ink500, letterSpacing: 0.6, textTransform: "uppercase" }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ marginTop: 4, fontFamily: FONT.display, fontSize: 14, fontWeight: "900", color: palette.ink, letterSpacing: 0 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function PaymentRow({
  row,
  onOpen,
  onPay,
}: {
  row: SettlementRow;
  onOpen: () => void;
  onPay: () => void;
}) {
  const c = useColors();
  const { request, payment, state } = row;
  const tint = stateColor(state);
  const amount = request.cost?.total ?? payment?.amount ?? 0;
  const canPay = !!request.cost && state !== "paid" && state !== "refunded";

  return (
    <View
      style={{
        marginBottom: 12,
        backgroundColor: c.surface,
        borderWidth: BORDER.base,
        borderColor: palette.ink,
        borderRadius: RADIUS.sm,
        overflow: "hidden",
        ...SHADOW_SM,
      }}
      testID={`payments-row-${request.id}`}
    >
      <View style={{ height: 8, backgroundColor: tint, borderBottomWidth: BORDER.base, borderBottomColor: palette.ink }} />
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ width: 42, height: 42, backgroundColor: tint, borderWidth: BORDER.base, borderColor: palette.ink, alignItems: "center", justifyContent: "center" }}>
            <Ionicons
              name={state === "paid" ? "checkmark" : state === "refunded" ? "arrow-undo" : state === "needs_cost" ? "calculator" : "cash"}
              size={22}
              color={state === "unpaid" || state === "needs_cost" || state === "paid" ? palette.ink : palette.paper}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: "900", color: c.text, letterSpacing: 0, flexShrink: 1 }} numberOfLines={2}>
                {request.title}
              </Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: tint, borderWidth: 1.5, borderColor: palette.ink }}>
                <Text style={{ fontFamily: FONT.display, fontSize: 9, fontWeight: "900", color: state === "pending" || state === "refunded" ? palette.paper : palette.ink, textTransform: "uppercase" }}>
                  {stateLabel(state)}
                </Text>
              </View>
            </View>
            <Text style={{ marginTop: 5, fontFamily: FONT.mono, fontSize: 11, color: c.textBody, letterSpacing: 0.2 }} numberOfLines={1}>
              {request.assignedToName} · {request.tenantName}{request.tenantUnit ? ` · ${request.tenantUnit}` : ""}
            </Text>
            <Text style={{ marginTop: 3, fontFamily: FONT.mono, fontSize: 10, color: c.textMuted, letterSpacing: 0.2 }}>
              {payment?.reference ? `Ref ${payment.reference}` : formatTimeAgo(request.resolvedAt ?? request.createdAt)}
              {payment?.paidAt ? ` · ${formatLongDate(payment.paidAt)}` : ""}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12, padding: 12, backgroundColor: palette.cream100, borderWidth: BORDER.base, borderColor: palette.ink }}>
          {request.cost ? (
            <>
              <CostLine label={`Labor ${request.cost.laborHours}h x RM${request.cost.hourlyRate.toFixed(0)}`} value={formatCurrency(request.cost.laborHours * request.cost.hourlyRate)} />
              <CostLine label="Materials" value={formatCurrency(request.cost.materialCost)} />
            </>
          ) : (
            <Text style={{ fontFamily: FONT.body, fontSize: 12, color: palette.ink600 }}>
              Cost breakdown required before payout.
            </Text>
          )}
          <View style={{ height: BORDER.base, backgroundColor: palette.ink, marginVertical: 8 }} />
          <CostLine label="Settlement total" value={formatCurrency(amount)} bold />
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          {canPay ? (
            <TouchableOpacity
              onPress={onPay}
              accessibilityRole="button"
              accessibilityLabel={state === "pending" ? "Confirm payment received" : "Pay maintainer"}
              testID={`payments-pay-button-${request.id}`}
              style={{ flex: 1, minHeight: 46, backgroundColor: state === "pending" ? palette.lime500 : palette.cobalt500, borderWidth: BORDER.base, borderColor: palette.ink, alignItems: "center", justifyContent: "center", flexDirection: "row", ...SHADOW_SM }}
            >
              <Ionicons name={state === "pending" ? "checkmark-circle" : "card"} size={15} color={state === "pending" ? palette.ink : palette.paper} />
              <Text style={{ marginLeft: 8, fontFamily: FONT.display, fontSize: 12, fontWeight: "900", color: state === "pending" ? palette.ink : palette.paper, textTransform: "uppercase" }} numberOfLines={1}>
                {state === "pending" ? "Confirm payment" : "Pay maintainer"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onOpen}
              accessibilityRole="button"
              accessibilityLabel={state === "needs_cost" ? "Set cost" : "Open request"}
              testID={state === "needs_cost" ? `payments-set-cost-button-${request.id}` : `payments-open-button-${request.id}`}
              style={{ flex: 1, minHeight: 46, backgroundColor: state === "needs_cost" ? palette.mustard500 : c.surfaceAlt, borderWidth: BORDER.base, borderColor: palette.ink, alignItems: "center", justifyContent: "center", flexDirection: "row", ...SHADOW_SM }}
            >
              <Ionicons name={state === "needs_cost" ? "calculator" : "open-outline"} size={15} color={palette.ink} />
              <Text style={{ marginLeft: 8, fontFamily: FONT.display, fontSize: 12, fontWeight: "900", color: palette.ink, textTransform: "uppercase" }}>
                {state === "needs_cost" ? "Set cost" : "Open request"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function CostLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingVertical: 2 }}>
      <Text style={{ flex: 1, fontFamily: bold ? FONT.display : FONT.body, fontSize: bold ? 13 : 12, fontWeight: bold ? "900" : "500", color: palette.ink }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ fontFamily: FONT.mono, fontSize: bold ? 16 : 12, fontWeight: "900", color: bold ? palette.cobalt500 : palette.ink }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
