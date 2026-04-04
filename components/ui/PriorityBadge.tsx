import React from "react";
import { View, Text } from "react-native";
import { RequestPriority } from "@/types";
import { getPriorityColor, getPriorityLabel, getPriorityTextColor } from "@/utils/priority";
import { withOpacity } from "@/utils/color";

interface PriorityBadgeProps {
  priority: RequestPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const color = getPriorityColor(priority);
  const textColor = getPriorityTextColor(priority);
  const label = getPriorityLabel(priority);

  return (
    <View className="flex-row items-center px-2 py-1 rounded-md" style={{ backgroundColor: withOpacity(color, 0.12) }}>
      <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: color }} />
      <Text className="text-xs font-medium" style={{ color: textColor }}>{label}</Text>
    </View>
  );
}
