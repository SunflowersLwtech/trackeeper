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
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_MD } from "@/constants/Brutalism";
import { useDebounce } from "@/hooks/useDebounce";
import { SEARCH_DEBOUNCE_MS } from "@/utils/search";

// Maintainer only sees: assigned, in_progress, on_hold, completed
const maintainerStatuses: (RequestStatus | "all")[] = ["all", "assigned", "in_progress", "on_hold", "completed"];

export default function MaintainerTasksScreen() {
  const c = useColors();
  const { user } = useAuth();
  const { requests, loading, error: listError, refreshing, refresh, loadMore, loadingMore, hasMore } = useMaintainerRequests(user?.uid);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);
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
    if (debouncedSearch.trim()) {
      const tokens = debouncedSearch.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
      result = result.filter((r) => {
        const haystack = `${r.title} ${r.description}`.toLowerCase();
        return tokens.every((t) => haystack.includes(t));
      });
    }
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    return result;
  }, [requests, debouncedSearch, statusFilter]);

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
            ◼ Failed to load tasks
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
            <RequestCard
              request={item}
              onPress={() => router.push(`/(maintainer)/${item.id}`)}
              searchQuery={debouncedSearch}
            />
          )}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 24 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: palette.tomato500,
                  borderWidth: BORDER.heavy,
                  borderColor: palette.ink,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                  ...SHADOW_MD,
                }}
              >
                <Ionicons name="construct" size={36} color={palette.paper} />
              </View>
              <Text style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: "900", letterSpacing: 0.4, textTransform: "uppercase", color: c.text, textAlign: "center" }}>
                {search || statusFilter !== "all" ? "No matching tasks" : "No tasks assigned"}
              </Text>
              {(search || statusFilter !== "all") && (
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
