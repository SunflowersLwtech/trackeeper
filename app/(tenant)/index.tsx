import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { View, Text, FlatList, Animated, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useTenantRequests } from "@/hooks/useRequests";
import { RequestCard } from "@/components/request/RequestCard";
import { TouchableOpacity } from "react-native";
import { WebContainer } from "@/components/ui/WebContainer";
import { ListFooter } from "@/components/ui/ListFooter";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { FilterToolbar, ActiveFilter } from "@/components/request/FilterToolbar";
import { FilterSheet, FilterSection } from "@/components/request/FilterSheet";
import { RequestStatus } from "@/types";
import { getStatusColor, getStatusLabel, STATUS_ORDER } from "@/utils/status";
import { useColors } from "@/hooks/useColors";

export default function TenantHomeScreen() {
  const { user } = useAuth();
  const c = useColors();
  const { requests, loading, error: listError, refreshing, refresh, loadMore, loadingMore, hasMore } = useTenantRequests(user?.uid);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevStatusRef = useRef(statusFilter);

  useEffect(() => {
    if (prevStatusRef.current !== statusFilter) {
      prevStatusRef.current = statusFilter;
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [statusFilter, fadeAnim]);

  const filtered = useMemo(() => {
    let result = requests;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    return result;
  }, [requests, search, statusFilter]);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    if (statusFilter === "all") return [];
    return [{
      key: "status",
      label: getStatusLabel(statusFilter),
      color: getStatusColor(statusFilter),
      onClear: () => setStatusFilter("all"),
    }];
  }, [statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: requests.length };
    for (const r of requests) { counts[r.status] = (counts[r.status] ?? 0) + 1; }
    return counts;
  }, [requests]);

  const allStatuses: (RequestStatus | "all")[] = ["all", ...STATUS_ORDER, "cancelled"];

  const filterSections = useMemo<FilterSection[]>(() => [{
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
  }], [statusFilter, statusCounts, c.text, allStatuses]);

  const handleReset = useCallback(() => setStatusFilter("all"), []);

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
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: c.background }}>
        <Text style={{ color: c.error, fontSize: 16, fontWeight: "600" }}>Failed to load requests</Text>
        <Text className="text-xs mt-1" style={{ color: c.textMuted }}>{listError.message}</Text>
        <TouchableOpacity className="mt-4 px-6 py-3 rounded-xl" style={{ backgroundColor: c.primary }} onPress={refresh}>
          <Text style={{ color: c.background, fontWeight: "600" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <WebContainer>
    <View className="flex-1" style={{ backgroundColor: c.background }}>
      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search my requests..."
        onFilterPress={() => setSheetOpen(true)}
        activeFilters={activeFilters}
        filterCount={activeFilters.length}
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
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<ListFooter loadingMore={loadingMore} hasMore={hasMore} itemCount={filtered.length} />}
          renderItem={({ item }) => (
            <RequestCard request={item} onPress={() => router.push(`/(tenant)/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center">
              <Ionicons name="document-text-outline" size={48} color={c.borderLight} style={{ marginBottom: 12 }} />
              <Text className="text-lg font-medium" style={{ color: c.textMuted }}>
                {search || statusFilter !== "all" ? "No matching requests" : "No requests yet"}
              </Text>
              {!search && statusFilter === "all" && (
                <Text className="text-sm mt-1" style={{ color: c.textMuted }}>
                  Tap &quot;New Request&quot; to get started
                </Text>
              )}
              {(search || statusFilter !== "all") && (
                <Text className="text-sm mt-1" style={{ color: c.textMuted }}>Try adjusting your search or filters</Text>
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
