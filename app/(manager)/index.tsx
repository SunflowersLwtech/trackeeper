import React, { useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useAllRequests } from "@/hooks/useRequests";
import { RequestCard } from "@/components/request/RequestCard";
import { RequestStatus } from "@/types";

const FILTERS: Array<{ label: string; value: RequestStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Submitted", value: "submitted" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

export default function ManagerDashboardScreen() {
  const { requests, loading } = useAllRequests();
  const [filter, setFilter] = useState<RequestStatus | "all">("all");

  const filtered = filter === "all"
    ? requests
    : requests.filter((r) => r.status === filter);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Filter chips */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item.value}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="mr-2 px-4 py-2 rounded-full border"
            style={{
              borderColor: filter === item.value ? "#3b82f6" : "#d1d5db",
              backgroundColor: filter === item.value ? "#eff6ff" : "#fff",
            }}
            onPress={() => setFilter(item.value)}
          >
            <Text
              className="text-sm"
              style={{ color: filter === item.value ? "#3b82f6" : "#6b7280" }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Request list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, flexGrow: 1 }}
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
