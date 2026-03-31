import React, { useState, useMemo } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useAllRequests } from "@/hooks/useRequests";
import { RequestCard } from "@/components/request/RequestCard";
import { StatsBar } from "@/components/request/StatsBar";
import { FilterBar, SortOption } from "@/components/request/FilterBar";
import { RequestStatus, RequestCategory } from "@/types";
import { getPriorityWeight } from "@/utils/priority";

export default function ManagerDashboardScreen() {
  const { requests, loading, refreshing, refresh } = useAllRequests();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<RequestCategory | "all">("all");
  const [sort, setSort] = useState<SortOption>("newest");

  const filtered = useMemo(() => {
    let result = requests;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tenantName.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((r) => r.category === categoryFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sort === "oldest") {
        return (a.clientTimestamp ?? 0) - (b.clientTimestamp ?? 0);
      }
      if (sort === "priority") {
        return getPriorityWeight(a.priority ?? "medium") - getPriorityWeight(b.priority ?? "medium");
      }
      // newest (default)
      return (b.clientTimestamp ?? 0) - (a.clientTimestamp ?? 0);
    });

    return result;
  }, [requests, search, statusFilter, categoryFilter, sort]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatsBar requests={requests} />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        sort={sort}
        onSortChange={setSort}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#3b82f6" />
        }
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onPress={() => router.push(`/(manager)/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-lg font-medium" style={{ color: "#9ca3af" }}>
              No requests found
            </Text>
          </View>
        }
      />
    </View>
  );
}
