import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useAllRequests } from "@/hooks/useRequests";
import { getStatusColor, getStatusLabel, STATUS_ORDER } from "@/utils/status";

export default function ManagerProfileScreen() {
  const { user, signOut } = useAuth();
  const { requests } = useAllRequests();

  const statsByStatus = STATUS_ORDER.map((status) => ({
    status,
    count: requests.filter((r) => r.status === status).length,
    color: getStatusColor(status),
    label: getStatusLabel(status),
  }));

  const avgRating =
    requests.filter((r) => r.rating).length > 0
      ? (
          requests.filter((r) => r.rating).reduce((sum, r) => sum + (r.rating ?? 0), 0) /
          requests.filter((r) => r.rating).length
        ).toFixed(1)
      : null;

  return (
    <View className="flex-1 bg-white px-6 pt-8">
      {/* Avatar */}
      <View className="items-center mb-6">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: "#eff6ff" }}
        >
          <Text className="text-3xl font-bold" style={{ color: "#3b82f6" }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </Text>
        </View>
        <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
          {user?.name}
        </Text>
        <Text className="text-sm" style={{ color: "#6b7280" }}>{user?.email}</Text>
        <View className="mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: "#dbeafe" }}>
          <Text className="text-xs font-medium" style={{ color: "#1d4ed8" }}>MANAGER</Text>
        </View>
      </View>

      {/* Management Stats */}
      <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: "#f9fafb" }}>
        <Text className="text-sm font-semibold mb-3" style={{ color: "#374151" }}>
          Management Overview
        </Text>
        <View className="flex-row flex-wrap">
          {statsByStatus.map((s) => (
            <View key={s.status} className="w-1/2 mb-3">
              <Text className="text-lg font-bold" style={{ color: s.color }}>{s.count}</Text>
              <Text className="text-xs" style={{ color: "#6b7280" }}>{s.label}</Text>
            </View>
          ))}
          <View className="w-1/2 mb-3">
            <Text className="text-lg font-bold" style={{ color: "#111827" }}>{requests.length}</Text>
            <Text className="text-xs" style={{ color: "#6b7280" }}>Total Requests</Text>
          </View>
          {avgRating && (
            <View className="w-1/2 mb-3">
              <Text className="text-lg font-bold" style={{ color: "#f59e0b" }}>{avgRating}</Text>
              <Text className="text-xs" style={{ color: "#6b7280" }}>Avg Rating</Text>
            </View>
          )}
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        className="rounded-xl py-4 items-center"
        style={{ backgroundColor: "#ef4444" }}
        onPress={signOut}
        testID="profile-signout-button"
      >
        <Text className="text-white text-base font-semibold">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
