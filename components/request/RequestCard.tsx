import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaintenanceRequest } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface RequestCardProps {
  request: MaintenanceRequest;
  onPress: () => void;
}

export function RequestCard({ request, onPress }: RequestCardProps) {
  const timeAgo = request.createdAt?.toDate
    ? formatTimeAgo(request.createdAt.toDate())
    : "";

  return (
    <TouchableOpacity
      className="border rounded-xl p-4 mb-3"
      style={{ borderColor: "#e5e7eb" }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between mb-2">
        <Text
          className="text-base font-semibold flex-1 mr-3"
          style={{ color: "#111827" }}
          numberOfLines={1}
        >
          {request.title}
        </Text>
        <StatusBadge status={request.status} />
      </View>

      <Text
        className="text-sm mb-3"
        style={{ color: "#6b7280" }}
        numberOfLines={2}
      >
        {request.description}
      </Text>

      <View className="flex-row items-center justify-between">
        <View
          className="px-2 py-1 rounded-md"
          style={{ backgroundColor: "#f3f4f6" }}
        >
          <Text className="text-xs" style={{ color: "#374151" }}>
            {request.category}
          </Text>
        </View>
        {timeAgo ? (
          <Text className="text-xs" style={{ color: "#9ca3af" }}>
            {timeAgo}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
