import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { View, Text, FlatList, Animated, RefreshControl, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAllRequests } from "@/hooks/useRequests";
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

type SortOption = "newest" | "oldest" | "priority";

const allStatuses: (RequestStatus | "all")[] = ["all", ...STATUS_ORDER, "on_hold", "cancelled"];

export default function ManagerDashboardScreen() {
  const c = useColors();
  const { requests, loading, error: listError, refreshing, refresh, loadMore, loadingMore, hasMore } = useAllRequests();
  const [search, setSearch] = useState("");
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

  const filtered = useMemo(() => {
    let result = requests;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.tenantName.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (categoryFilter !== "all") result = result.filter((r) => r.category === categoryFilter);
    result = [...result].sort((a, b) => {
      if (sort === "oldest") return (a.clientTimestamp ?? 0) - (b.clientTimestamp ?? 0);
      if (sort === "priority") return getPriorityWeight(a.priority ?? "medium") - getPriorityWeight(b.priority ?? "medium");
      return (b.clientTimestamp ?? 0) - (a.clientTimestamp ?? 0);
    });
    return result;
  }, [requests, search, statusFilter, categoryFilter, sort]);

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
            <RequestCard request={item} onPress={() => router.push(`/(manager)/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center">
              <Ionicons name="document-text-outline" size={48} color={c.borderLight} style={{ marginBottom: 12 }} />
              <Text className="text-lg font-medium" style={{ color: c.textMuted }}>
                {search || filterCount > 0 ? "No requests match your filters" : "No requests yet"}
              </Text>
              {(search || filterCount > 0) && (
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
