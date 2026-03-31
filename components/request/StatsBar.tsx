import React from "react";
import { View, Text } from "react-native";
import { MaintenanceRequest } from "@/types";
import { getStatusColor, getStatusLabel, STATUS_ORDER } from "@/utils/status";

interface StatsBarProps {
  requests: MaintenanceRequest[];
}

export function StatsBar({ requests }: StatsBarProps) {
  const allStatuses = [...STATUS_ORDER, "on_hold" as const];
  const counts = allStatuses.reduce(
    (acc, status) => {
      acc[status] = requests.filter((r) => r.status === status).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <View className="flex-row px-4 py-3" style={{ backgroundColor: "#f9fafb" }}>
      {allStatuses.map((status) => (
        <View key={status} className="flex-1 items-center">
          <Text className="text-lg font-bold" style={{ color: getStatusColor(status) }}>
            {counts[status]}
          </Text>
          <Text className="text-xs" style={{ color: "#6b7280" }} numberOfLines={1}>
            {getStatusLabel(status)}
          </Text>
        </View>
      ))}
      <View className="flex-1 items-center">
        <Text className="text-lg font-bold" style={{ color: "#111827" }}>
          {requests.length}
        </Text>
        <Text className="text-xs" style={{ color: "#6b7280" }}>Total</Text>
      </View>
    </View>
  );
}
