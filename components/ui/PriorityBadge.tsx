import React from "react";
import { View, Text } from "react-native";
import { RequestPriority } from "@/types";
import { getPriorityColor, getPriorityLabel } from "@/utils/priority";

interface PriorityBadgeProps {
  priority: RequestPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const color = getPriorityColor(priority);
  const label = getPriorityLabel(priority);

  return (
    <View className="flex-row items-center px-2 py-1 rounded-md" style={{ backgroundColor: color + "15" }}>
      <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: color }} />
      <Text className="text-xs font-medium" style={{ color }}>{label}</Text>
    </View>
  );
}
