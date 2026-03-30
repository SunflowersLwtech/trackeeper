import React from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useTenantRequests } from "@/hooks/useRequests";
import { RequestCard } from "@/components/request/RequestCard";

export default function TenantHomeScreen() {
  const { user } = useAuth();
  const { requests, loading } = useTenantRequests(user?.uid);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onPress={() => router.push(`/(tenant)/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-lg font-medium" style={{ color: "#9ca3af" }}>
              No requests yet
            </Text>
            <Text className="text-sm mt-1" style={{ color: "#d1d5db" }}>
              Tap &quot;New Request&quot; to get started
            </Text>
          </View>
        }
      />
    </View>
  );
}
