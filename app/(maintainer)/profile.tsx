import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useMaintainerRequests } from "@/hooks/useMaintainerRequests";
import { useColors } from "@/hooks/useColors";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function MaintainerProfileScreen() {
  const c = useColors();
  const { user, signOut } = useAuth();
  const { confirm, confirmProps } = useConfirm();
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
    { label: "Assigned", count: assignedCount, color: c.primary },
    { label: "In Progress", count: inProgressCount, color: c.warning },
    { label: "On Hold", count: onHoldCount, color: c.violet },
    { label: "Completed", count: completedCount, color: c.success },
    { label: "Total Tasks", count: requests.length, color: c.text },
  ];

  return (
    <View className="flex-1 px-6 pt-8" style={{ backgroundColor: c.background }}>
      {/* Avatar */}
      <View className="items-center mb-6">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: c.violetBadgeBg }}
        >
          <Text className="text-3xl font-bold" style={{ color: c.violetDark }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </Text>
        </View>
        <Text className="text-xl font-semibold" style={{ color: c.text }}>
          {user?.name}
        </Text>
        <Text className="text-sm" style={{ color: c.textTertiary }}>{user?.email}</Text>
        <View className="mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: c.violetBadgeBg }}>
          <Text className="text-xs font-medium" style={{ color: c.violetDark }}>MAINTAINER</Text>
        </View>
      </View>

      {/* Work Overview */}
      <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: c.surface }}>
        <Text className="text-sm font-semibold mb-3" style={{ color: c.textSecondary }}>
          Work Overview
        </Text>
        <View className="flex-row flex-wrap">
          {stats.map((s) => (
            <View key={s.label} className="w-1/2 mb-3">
              <Text className="text-lg font-bold" style={{ color: s.color }}>{s.count}</Text>
              <Text className="text-xs" style={{ color: c.textTertiary }}>{s.label}</Text>
            </View>
          ))}
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
