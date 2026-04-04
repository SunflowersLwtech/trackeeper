import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useAllRequests } from "@/hooks/useRequests";
import { getStatusColor, getStatusLabel, STATUS_ORDER } from "@/utils/status";
import { useColors } from "@/hooks/useColors";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function ManagerProfileScreen() {
  const c = useColors();
  const { user, signOut } = useAuth();
  const { confirm, confirmProps } = useConfirm();
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
    <View style={{ flex: 1, backgroundColor: c.background, paddingHorizontal: 24, paddingTop: 32 }}>
      {/* Avatar */}
      <View className="items-center mb-6">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: c.primaryBg }}
        >
          <Text className="text-3xl font-bold" style={{ color: c.primary }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </Text>
        </View>
        <Text className="text-xl font-semibold" style={{ color: c.text }}>
          {user?.name}
        </Text>
        <Text className="text-sm" style={{ color: c.textTertiary }}>{user?.email}</Text>
        <View className="mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: c.primaryBadgeBg }}>
          <Text className="text-xs font-medium" style={{ color: c.primaryDark }}>MANAGER</Text>
        </View>
      </View>

      {/* Management Stats */}
      <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: c.surface }}>
        <Text className="text-sm font-semibold mb-3" style={{ color: c.textSecondary }}>
          Management Overview
        </Text>
        <View className="flex-row flex-wrap">
          {statsByStatus.map((s) => (
            <View key={s.status} className="w-1/2 mb-3">
              <Text className="text-lg font-bold" style={{ color: s.color }}>{s.count}</Text>
              <Text className="text-xs" style={{ color: c.textTertiary }}>{s.label}</Text>
            </View>
          ))}
          <View className="w-1/2 mb-3">
            <Text className="text-lg font-bold" style={{ color: c.text }}>{requests.length}</Text>
            <Text className="text-xs" style={{ color: c.textTertiary }}>Total Requests</Text>
          </View>
          {avgRating && (
            <View className="w-1/2 mb-3">
              <Text className="text-lg font-bold" style={{ color: c.warning }}>{avgRating}</Text>
              <Text className="text-xs" style={{ color: c.textTertiary }}>Avg Rating</Text>
            </View>
          )}
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        className="rounded-xl py-4 items-center"
        style={{ backgroundColor: c.error }}
        onPress={() => confirm("Sign Out", "Are you sure you want to sign out?", signOut, { destructive: true })}
        testID="profile-signout-button"
      >
        <Text className="text-white text-base font-semibold">Sign Out</Text>
      </TouchableOpacity>
      <ConfirmModal {...confirmProps} />
    </View>
  );
}
