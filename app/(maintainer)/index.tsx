import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useMaintainerRequests } from "@/hooks/useMaintainerRequests";
import { RequestCard } from "@/components/request/RequestCard";
import { RequestStatus } from "@/types";
import { WebContainer } from "@/components/ui/WebContainer";
import { ListFooter } from "@/components/ui/ListFooter";

const STATUS_CHIPS: { label: string; value: RequestStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in_progress" },
  { label: "On Hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
];

export default function MaintainerTasksScreen() {
  const { user } = useAuth();
  const { requests, loading, error: listError, refreshing, refresh, loadMore, loadingMore, hasMore } = useMaintainerRequests(user?.uid);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");

  const filtered = useMemo(() => {
    let result = requests;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    return result;
  }, [requests, search, statusFilter]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (listError) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text style={{ color: "#ef4444", fontSize: 16, fontWeight: "600" }}>Failed to load tasks</Text>
        <Text className="text-xs mt-1" style={{ color: "#9ca3af" }}>{listError.message}</Text>
        <TouchableOpacity
          className="mt-4 px-6 py-3 rounded-xl"
          style={{ backgroundColor: "#3b82f6" }}
          onPress={refresh}
          accessibilityRole="button"
          accessibilityLabel="Retry loading tasks"
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <WebContainer>
    <View className="flex-1 bg-white">
      {/* Search */}
      <View className="px-4 pt-3 pb-2">
        <View
          className="flex-row items-center rounded-xl px-3 py-2"
          style={{ backgroundColor: "#f3f4f6" }}
        >
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-sm"
            style={{ color: "#111827" }}
            placeholder="Search tasks..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search tasks"
            accessibilityRole="search"
            testID="maintainer-search-input"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              testID="maintainer-search-clear"
            >
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      >
        {STATUS_CHIPS.map((chip) => {
          const isActive = statusFilter === chip.value;
          return (
            <TouchableOpacity
              key={chip.value}
              className="mr-2 px-4 py-1.5 rounded-full"
              style={{
                backgroundColor: isActive ? "#3b82f6" : "#f3f4f6",
              }}
              onPress={() => setStatusFilter(chip.value)}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${chip.label}`}
              accessibilityState={{ selected: isActive }}
              testID={`maintainer-filter-${chip.value}`}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: isActive ? "#fff" : "#6b7280" }}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        initialNumToRender={15}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        contentContainerStyle={{ paddingHorizontal: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#3b82f6" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={<ListFooter loadingMore={loadingMore} hasMore={hasMore} itemCount={filtered.length} />}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onPress={() => router.push(`/(maintainer)/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-lg font-medium" style={{ color: "#9ca3af" }}>
              No tasks assigned yet
            </Text>
          </View>
        }
      />
    </View>
    </WebContainer>
  );
}
