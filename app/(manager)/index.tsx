import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { View, Text, FlatList, Animated, RefreshControl, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAllRequests } from "@/hooks/useRequests";
import { usePendingTenants } from "@/hooks/usePendingTenants";
import { RequestCard } from "@/components/request/RequestCard";
import { FilterToolbar, ActiveFilter } from "@/components/request/FilterToolbar";
import { FilterSheet, FilterSection } from "@/components/request/FilterSheet";
import { RequestStatus, RequestCategory } from "@/types";
import { getPriorityWeight } from "@/utils/priority";
import { getStatusColor, getStatusLabel, STATUS_ORDER } from "@/utils/status";
import { WebContainer } from "@/components/ui/WebContainer";
import { ListFooter } from "@/components/ui/ListFooter";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_MD } from "@/constants/Brutalism";
import { slaSeverity, slaRemainingMs } from "@/utils/sla";
import { useDebounce } from "@/hooks/useDebounce";
import { SEARCH_DEBOUNCE_MS } from "@/utils/search";

type SortOption = "newest" | "oldest" | "priority";
type PaymentState = "needs_cost" | "unpaid" | "pending" | "paid" | "refunded";

type PaymentSummary = {
  needsCost: number;
  unpaid: number;
  pending: number;
  paid: number;
  refunded: number;
  actionRequired: number;
};

const allStatuses: (RequestStatus | "all")[] = ["all", ...STATUS_ORDER, "on_hold", "cancelled"];

function resolvePaymentState(
  request: { status: RequestStatus | "on_hold" | "cancelled"; cost: unknown; payment?: { status?: string } | null },
): PaymentState | null {
  if (!request.cost) {
    return request.status === "completed" || request.status === "verified" ? "needs_cost" : null;
  }
  if (request.payment?.status === "pending") return "pending";
  if (request.payment?.status === "paid") return "paid";
  if (request.payment?.status === "refunded") return "refunded";
  return "unpaid";
}

export default function ManagerDashboardScreen() {
  const c = useColors();
  const { requests, loading, error: listError, refreshing, refresh, loadMore, loadingMore, hasMore } = useAllRequests();
  const { tenants: pendingTenants } = usePendingTenants();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<RequestCategory | "all">("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [sheetOpen, setSheetOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevFiltersRef = useRef(`${statusFilter}-${categoryFilter}-${sort}`);

  useEffect(() => {
    const key = `${statusFilter}-${categoryFilter}-${sort}`;
    if (prevFiltersRef.current !== key) {
      prevFiltersRef.current = key;
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [statusFilter, categoryFilter, sort, fadeAnim]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: requests.length };
    for (const r of requests) { counts[r.status] = (counts[r.status] ?? 0) + 1; }
    return counts;
  }, [requests]);

  const paymentSummary = useMemo<PaymentSummary>(() => {
    const summary: PaymentSummary = {
      needsCost: 0,
      unpaid: 0,
      pending: 0,
      paid: 0,
      refunded: 0,
      actionRequired: 0,
    };
    for (const request of requests) {
      const visibleInPayments = request.status === "completed" || request.status === "verified" || !!request.cost || !!request.payment;
      if (!visibleInPayments) continue;
      const state = resolvePaymentState(request);
      if (!state) continue;
      if (state === "needs_cost") summary.needsCost += 1;
      if (state === "unpaid") summary.unpaid += 1;
      if (state === "pending") summary.pending += 1;
      if (state === "paid") summary.paid += 1;
      if (state === "refunded") summary.refunded += 1;
      if (state === "needs_cost" || state === "unpaid" || state === "pending") {
        summary.actionRequired += 1;
      }
    }
    return summary;
  }, [requests]);

  const filtered = useMemo(() => {
    let result = requests;
    if (debouncedSearch.trim()) {
      const tokens = debouncedSearch.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
      result = result.filter((r) => {
        const haystack = `${r.title} ${r.description} ${r.tenantName}`.toLowerCase();
        return tokens.every((t) => haystack.includes(t));
      });
    }
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (categoryFilter !== "all") result = result.filter((r) => r.category === categoryFilter);
    // SLA severity sort key: breached (0) → danger (1) → warning (2) → ok/none (3)
    const severityRank = (r: typeof result[number]): number => {
      if (!r.sla) return 3;
      const s = slaSeverity(r.sla);
      return s === "breached" ? 0 : s === "danger" ? 1 : s === "warning" ? 2 : 3;
    };
    result = [...result].sort((a, b) => {
      // Always float overdue / at-risk to the top regardless of sort choice.
      const sevDiff = severityRank(a) - severityRank(b);
      if (sevDiff !== 0) return sevDiff;
      // Within the same SLA severity bucket, fall back to the user's sort.
      if (sort === "oldest") return (a.clientTimestamp ?? 0) - (b.clientTimestamp ?? 0);
      if (sort === "priority") return getPriorityWeight(a.priority ?? "medium") - getPriorityWeight(b.priority ?? "medium");
      // Newest tiebreaker: most-recently-overdue first
      if (a.sla && b.sla) {
        const ar = slaRemainingMs(a.sla);
        const br = slaRemainingMs(b.sla);
        if (ar < 0 || br < 0) return ar - br; // most overdue first
      }
      return (b.clientTimestamp ?? 0) - (a.clientTimestamp ?? 0);
    });
    return result;
  }, [requests, debouncedSearch, statusFilter, categoryFilter, sort]);

  // Build active filter pills
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const pills: ActiveFilter[] = [];
    if (statusFilter !== "all") {
      pills.push({
        key: "status",
        label: getStatusLabel(statusFilter),
        color: getStatusColor(statusFilter),
        onClear: () => setStatusFilter("all"),
      });
    }
    if (categoryFilter !== "all") {
      pills.push({ key: "category", label: categoryFilter, color: c.violet, onClear: () => setCategoryFilter("all") });
    }
    if (sort !== "newest") {
      pills.push({ key: "sort", label: `Sort: ${sort}`, onClear: () => setSort("newest") });
    }
    return pills;
  }, [statusFilter, categoryFilter, sort, c.violet]);

  const filterCount = activeFilters.length;

  const filterSections = useMemo<FilterSection[]>(() => [
    {
      title: "Status",
      key: "status",
      selected: statusFilter,
      onSelect: (v) => setStatusFilter(v as RequestStatus | "all"),
      options: allStatuses.map((s) => ({
        label: s === "all" ? "All" : getStatusLabel(s as RequestStatus),
        value: s,
        color: s === "all" ? c.text : getStatusColor(s as RequestStatus),
        count: statusCounts[s] ?? 0,
      })),
    },
    {
      title: "Category",
      key: "category",
      selected: categoryFilter,
      onSelect: (v) => setCategoryFilter(v as RequestCategory | "all"),
      options: [
        { label: "All", value: "all", icon: "apps-outline" as const },
        { label: "Plumbing", value: "Plumbing", icon: "water-outline" as const },
        { label: "Electrical", value: "Electrical", icon: "flash-outline" as const },
        { label: "General", value: "General", icon: "build-outline" as const },
      ],
    },
    {
      title: "Sort By",
      key: "sort",
      selected: sort,
      onSelect: (v) => setSort(v as SortOption),
      options: [
        { label: "Newest", value: "newest", icon: "arrow-down-outline" as const },
        { label: "Oldest", value: "oldest", icon: "arrow-up-outline" as const },
        { label: "Priority", value: "priority", icon: "flag-outline" as const },
      ],
    },
  ], [statusFilter, categoryFilter, sort, statusCounts, c.text]);

  const handleReset = useCallback(() => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setSort("newest");
  }, []);

  if (loading) {
    return (
      <WebContainer>
        <View className="flex-1" style={{ backgroundColor: c.background }}>
          <SkeletonList count={5} />
        </View>
      </WebContainer>
    );
  }

  if (listError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background, padding: 24 }}>
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: palette.tomato500,
            borderWidth: BORDER.base,
            borderColor: palette.ink,
            ...SHADOW_MD,
          }}
        >
          <Text style={{ color: palette.paper, fontFamily: FONT.display, fontWeight: "900", fontSize: 14, letterSpacing: 0.6, textTransform: "uppercase" }}>
            ◼ Failed to load
          </Text>
        </View>
        <Text style={{ marginTop: 12, fontFamily: FONT.mono, fontSize: 12, color: c.textMuted, textAlign: "center" }}>{listError.message}</Text>
        <TouchableOpacity
          style={{
            marginTop: 18,
            paddingHorizontal: 24,
            paddingVertical: 12,
            backgroundColor: palette.cobalt500,
            borderWidth: BORDER.base,
            borderColor: palette.ink,
            ...SHADOW_MD,
          }}
          onPress={refresh}
        >
          <Text style={{ color: palette.paper, fontFamily: FONT.display, fontWeight: "900", fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase" }}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <WebContainer>
    <View className="flex-1" style={{ backgroundColor: c.background }}>
      {pendingTenants.length > 0 && (
        <TouchableOpacity
          onPress={() => router.push("/(manager)/approvals")}
          activeOpacity={0.85}
          style={{
            marginHorizontal: 16,
            marginTop: 14,
            paddingVertical: 14,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: palette.mustard500,
            borderWidth: BORDER.base,
            borderColor: palette.ink,
            ...SHADOW_MD,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              backgroundColor: palette.tomato500,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
            }}
          >
            <Text style={{ color: palette.paper, fontFamily: FONT.display, fontSize: 18, fontWeight: "900" }}>
              {pendingTenants.length}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: palette.ink,
                fontFamily: FONT.display,
                fontWeight: "900",
                fontSize: 14,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              Tenant{pendingTenants.length === 1 ? "" : "s"} waiting
            </Text>
            <Text style={{ color: palette.ink, fontFamily: FONT.body, fontSize: 12, marginTop: 2 }}>
              Tap to review applications
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={palette.ink} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => router.push("/(manager)/payments")}
        activeOpacity={0.9}
        style={{
          marginHorizontal: 16,
          marginTop: paymentSummary.actionRequired > 0 ? 12 : 8,
          marginBottom: 12,
          paddingVertical: 14,
          paddingHorizontal: 14,
          backgroundColor: c.surface,
          borderWidth: BORDER.base,
          borderColor: palette.ink,
          ...SHADOW_MD,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 42,
              height: 42,
              backgroundColor: palette.cobalt500,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="wallet-outline" size={22} color={palette.paper} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{
              color: paymentSummary.actionRequired > 0 ? c.text : c.textSecondary,
              fontFamily: FONT.display,
              fontSize: 15,
              fontWeight: "900",
              letterSpacing: 0.2,
              textTransform: "uppercase",
            }}>
              Payment desk
            </Text>
            <Text style={{ marginTop: 3, color: c.textBody, fontFamily: FONT.body, fontSize: 12 }}>
              {paymentSummary.actionRequired > 0
                ? `${paymentSummary.actionRequired} requests need payment action`
                : "No payment actions currently"}
            </Text>
          </View>
          <Text style={{ color: c.textTertiary, fontFamily: FONT.mono, fontSize: 11 }}>
            {paymentSummary.actionRequired > 0 ? "Open" : ""}
          </Text>
        </View>
      </TouchableOpacity>

      {paymentSummary.actionRequired > 0 ? (
        <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {paymentSummary.needsCost > 0 ? (
              <View style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: palette.mustard500, borderWidth: BORDER.base, borderColor: palette.ink }}>
                <Text style={{ fontFamily: FONT.display, fontSize: 9, color: palette.ink, fontWeight: "900", textTransform: "uppercase" }}>
                  {paymentSummary.needsCost} Needs cost
                </Text>
              </View>
            ) : null}
            {paymentSummary.unpaid > 0 ? (
              <View style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: palette.sky50, borderWidth: BORDER.base, borderColor: palette.ink }}>
                <Text style={{ fontFamily: FONT.display, fontSize: 9, color: palette.ink, fontWeight: "900", textTransform: "uppercase" }}>
                  {paymentSummary.unpaid} Unpaid
                </Text>
              </View>
            ) : null}
            {paymentSummary.pending > 0 ? (
              <View style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: palette.mustard50, borderWidth: BORDER.base, borderColor: palette.ink }}>
                <Text style={{ fontFamily: FONT.display, fontSize: 9, color: palette.ink, fontWeight: "900", textTransform: "uppercase" }}>
                  {paymentSummary.pending} Pending
                </Text>
              </View>
            ) : null}
            {paymentSummary.paid > 0 ? (
              <View style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: palette.lime50, borderWidth: BORDER.base, borderColor: palette.ink }}>
                <Text style={{ fontFamily: FONT.display, fontSize: 9, color: palette.ink, fontWeight: "900", textTransform: "uppercase" }}>
                  {paymentSummary.paid} Paid
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search requests..."
        onFilterPress={() => setSheetOpen(true)}
        activeFilters={activeFilters}
        filterCount={filterCount}
      />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          ref={listRef}
          data={filtered}
          keyExtractor={(item) => item.id}
          initialNumToRender={15}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews
          contentContainerStyle={{ paddingHorizontal: 16, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<ListFooter loadingMore={loadingMore} hasMore={hasMore} itemCount={filtered.length} />}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              onPress={() => router.push(`/(manager)/${item.id}`)}
              searchQuery={debouncedSearch}
            />
          )}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 24 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: palette.cream200,
                  borderWidth: BORDER.heavy,
                  borderColor: palette.ink,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                  ...SHADOW_MD,
                }}
              >
                <Ionicons name="document-text" size={36} color={palette.ink} />
              </View>
              <Text style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: "900", letterSpacing: 0.4, textTransform: "uppercase", color: c.text, textAlign: "center" }}>
                {search || filterCount > 0 ? "No matches" : "No requests yet"}
              </Text>
              {(search || filterCount > 0) && (
                <Text style={{ fontFamily: FONT.body, fontSize: 13, marginTop: 8, color: c.textBody, textAlign: "center" }}>
                  Try adjusting your search or filters
                </Text>
              )}
            </View>
          }
        />
      </Animated.View>

      <FilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        sections={filterSections}
        onReset={handleReset}
      />
    </View>
    </WebContainer>
  );
}
