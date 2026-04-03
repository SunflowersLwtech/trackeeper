import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useMaintainerRequests } from "@/hooks/useMaintainerRequests";

export default function MaintainerProfileScreen() {
  const { user, signOut } = useAuth();
  const { requests } = useMaintainerRequests(user?.uid);

  const assignedCount = requests.filter((r) => r.status === "assigned").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const onHoldCount = requests.filter((r) => r.status === "on_hold").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;

  const ratedRequests = requests.filter((r) => r.rating);
  const avgRating =
    ratedRequests.length > 0
      ? (
          ratedRequests.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
          ratedRequests.length
        ).toFixed(1)
      : null;

  const stats = [
    { label: "Assigned", count: assignedCount, color: "#3b82f6" },
    { label: "In Progress", count: inProgressCount, color: "#f59e0b" },
    { label: "On Hold", count: onHoldCount, color: "#8b5cf6" },
    { label: "Completed", count: completedCount, color: "#22c55e" },
    { label: "Total Tasks", count: requests.length, color: "#111827" },
  ];

  return (
    <View className="flex-1 bg-white px-6 pt-8">
      {/* Avatar */}
      <View className="items-center mb-6">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: "#f3e8ff" }}
        >
          <Text className="text-3xl font-bold" style={{ color: "#7c3aed" }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </Text>
        </View>
        <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
          {user?.name}
        </Text>
        <Text className="text-sm" style={{ color: "#6b7280" }}>{user?.email}</Text>
        <View className="mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: "#f3e8ff" }}>
          <Text className="text-xs font-medium" style={{ color: "#7c3aed" }}>MAINTAINER</Text>
        </View>
      </View>

      {/* Work Overview */}
      <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: "#f9fafb" }}>
        <Text className="text-sm font-semibold mb-3" style={{ color: "#374151" }}>
          Work Overview
        </Text>
        <View className="flex-row flex-wrap">
          {stats.map((s) => (
            <View key={s.label} className="w-1/2 mb-3">
              <Text className="text-lg font-bold" style={{ color: s.color }}>{s.count}</Text>
              <Text className="text-xs" style={{ color: "#6b7280" }}>{s.label}</Text>
            </View>
          ))}
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
