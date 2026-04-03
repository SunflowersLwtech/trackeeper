import React, { useState, useMemo } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useTenantRequests } from "@/hooks/useRequests";
import { RequestCard } from "@/components/request/RequestCard";
import { TouchableOpacity } from "react-native";

export default function TenantHomeScreen() {
  const { user } = useAuth();
  const { requests, loading, error: listError, refreshing, refresh } = useTenantRequests(user?.uid);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return requests;
    const q = search.toLowerCase();
    return requests.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }, [requests, search]);

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
        <Text style={{ color: "#ef4444", fontSize: 16, fontWeight: "600" }}>Failed to load requests</Text>
        <Text className="text-xs mt-1" style={{ color: "#9ca3af" }}>{listError.message}</Text>
        <TouchableOpacity
          className="mt-4 px-6 py-3 rounded-xl"
          style={{ backgroundColor: "#3b82f6" }}
          onPress={refresh}
          accessibilityRole="button"
          accessibilityLabel="Retry loading requests"
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Search */}
      {requests.length > 0 && (
        <View className="px-4 pt-3 pb-1">
          <View
            className="flex-row items-center border rounded-xl px-3 py-2"
            style={{ borderColor: "#d1d5db", backgroundColor: "#f9fafb" }}
          >
            <Ionicons name="search-outline" size={18} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-sm"
              style={{ color: "#111827" }}
              placeholder="Search my requests..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Search my requests"
              accessibilityRole="search"
              testID="tenant-search-input"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                testID="tenant-search-clear"
              >
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        initialNumToRender={15}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        getItemLayout={(_, index) => ({ length: 140, offset: 140 * index, index })}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#3b82f6" />
        }
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onPress={() => router.push(`/(tenant)/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-lg font-medium" style={{ color: "#9ca3af" }}>
              {search ? "No matching requests" : "No requests yet"}
            </Text>
            {!search && (
              <Text className="text-sm mt-1" style={{ color: "#d1d5db" }}>
                Tap &quot;New Request&quot; to get started
              </Text>
            )}
          </View>
        }
      />
    </View>
  );
}
