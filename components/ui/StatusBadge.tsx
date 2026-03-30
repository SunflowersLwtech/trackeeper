import React from "react";
import { View, Text } from "react-native";
import { RequestStatus } from "@/types";
import { getStatusColor, getStatusLabel } from "@/utils/status";

interface StatusBadgeProps {
  status: RequestStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <View
      className="px-3 py-1 rounded-full"
      style={{ backgroundColor: color + "20" }}
    >
      <Text className="text-xs font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
