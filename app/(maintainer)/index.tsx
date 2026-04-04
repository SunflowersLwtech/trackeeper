import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { View, Text, FlatList, Animated, RefreshControl, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useMaintainerRequests } from "@/hooks/useMaintainerRequests";
import { RequestCard } from "@/components/request/RequestCard";
import { RequestStatus } from "@/types";
import { getStatusColor, getStatusLabel } from "@/utils/status";
import { WebContainer } from "@/components/ui/WebContainer";
import { ListFooter } from "@/components/ui/ListFooter";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { FilterToolbar, ActiveFilter } from "@/components/request/FilterToolbar";
import { FilterSheet, FilterSection } from "@/components/request/FilterSheet";
import { useColors } from "@/hooks/useColors";

// Maintainer only sees: assigned, in_progress, on_hold, completed
const maintainerStatuses: (RequestStatus | "all")[] = ["all", "assigned", "in_progress", "on_hold", "completed"];

export default function MaintainerTasksScreen() {
  const c = useColors();
  const { user } = useAuth();
  const { requests, loading, error: listError, refreshing, refresh, loadMore, loadingMore, hasMore } = useMaintainerRequests(user?.uid);
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

  const filterSections = useMemo<FilterSection[]>(() => [{
    title: "Status",
    key: "status",
    selected: statusFilter,
    onSelect: (v) => setStatusFilter(v as RequestStatus | "all"),
    options: maintainerStatuses.map((s) => ({
      label: s === "all" ? "All" : getStatusLabel(s as RequestStatus),
      value: s,
      color: s === "all" ? c.text : getStatusColor(s as RequestStatus),
      count: statusCounts[s] ?? 0,
    })),
  }], [statusFilter, statusCounts, c.text]);

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
        <Text style={{ color: c.error, fontSize: 16, fontWeight: "600" }}>Failed to load tasks</Text>
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
        searchPlaceholder="Search tasks..."
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
          contentContainerStyle={{ paddingHorizontal: 16, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<ListFooter loadingMore={loadingMore} hasMore={hasMore} itemCount={filtered.length} />}
          renderItem={({ item }) => (
            <RequestCard request={item} onPress={() => router.push(`/(maintainer)/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center">
              <Ionicons name="construct-outline" size={48} color={c.borderLight} style={{ marginBottom: 12 }} />
              <Text className="text-lg font-medium" style={{ color: c.textMuted }}>
                {search || statusFilter !== "all" ? "No matching tasks" : "No tasks assigned yet"}
              </Text>
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
