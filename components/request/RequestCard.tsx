import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaintenanceRequest } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { useColors } from "@/hooks/useColors";
import { formatTimeAgo } from "@/utils/time";

interface RequestCardProps {
  request: MaintenanceRequest;
  onPress: () => void;
}

export const RequestCard = React.memo(function RequestCard({ request, onPress }: RequestCardProps) {
  const c = useColors();
  const timeAgo = request.createdAt?.toDate
    ? formatTimeAgo(request.createdAt.toDate())
    : "";

  return (
    <TouchableOpacity
      className="border rounded-xl p-4 mb-3"
      style={{
        borderColor: c.borderLight,
        backgroundColor: c.surface,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${request.title}, status: ${request.status}`}
      accessibilityHint="Opens request details"
      testID={`request-card-${request.title}`}
    >
      <View className="flex-row items-start justify-between mb-2">
        <Text
          className="text-base font-semibold flex-1 mr-3"
          style={{ color: c.text }}
          numberOfLines={1}
        >
          {request.title}
        </Text>
        <StatusBadge status={request.status} />
      </View>

      <Text
        className="text-sm mb-3"
        style={{ color: c.textTertiary }}
        numberOfLines={2}
      >
        {request.description}
      </Text>

      {request.assignedToName && (
        <View className="flex-row items-center mb-2">
          <Ionicons name="person" size={13} color={c.textSecondary} />
          <Text className="text-sm ml-1.5" style={{ color: c.textSecondary }}>
            Assigned to {request.assignedToName}
          </Text>
        </View>
      )}

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View
            className="px-2 py-1 rounded-md mr-2"
            style={{ backgroundColor: c.surfaceAlt }}
          >
            <Text className="text-xs" style={{ color: c.textSecondary }}>
              {request.category}
            </Text>
          </View>
          {request.priority && <PriorityBadge priority={request.priority} />}
        </View>
        {timeAgo ? (
          <Text className="text-xs" style={{ color: c.textMuted }}>
            {timeAgo}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});
