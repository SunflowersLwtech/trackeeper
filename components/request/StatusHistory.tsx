import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusChange } from "@/types";
import { getStatusLabel, getStatusColor } from "@/utils/status";

interface StatusHistoryProps {
  history: StatusChange[] | undefined;
}

export function StatusHistory({ history }: StatusHistoryProps) {
  if (!history || history.length === 0) return null;

  return (
    <View className="mt-4">
      <Text className="text-sm font-semibold mb-3" style={{ color: "#374151" }}>
        Status History
      </Text>
      {history.map((change, index) => {
        const toColor = getStatusColor(change.to);
        const timeStr = change.changedAt?.toDate
          ? formatTime(change.changedAt.toDate())
          : "";

        return (
          <View key={index} className="flex-row mb-3">
            {/* Timeline line + dot */}
            <View className="items-center mr-3" style={{ width: 20 }}>
              <View
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: toColor }}
              />
              {index < history.length - 1 && (
                <View
                  className="w-0.5 flex-1 mt-1"
                  style={{ backgroundColor: "#e5e7eb" }}
                />
              )}
            </View>

            {/* Content */}
            <View className="flex-1 pb-1">
              <View className="flex-row items-center flex-wrap">
                <Text className="text-xs font-medium" style={{ color: "#374151" }}>
                  {getStatusLabel(change.from)}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={10}
                  color="#9ca3af"
                  style={{ marginHorizontal: 4 }}
                />
                <Text className="text-xs font-semibold" style={{ color: toColor }}>
                  {getStatusLabel(change.to)}
                </Text>
              </View>
              <Text className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                by {change.changedByName} {timeStr ? `• ${timeStr}` : ""}
              </Text>
              {change.note ? (
                <Text className="text-xs mt-1" style={{ color: "#6b7280" }}>
                  {change.note}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function formatTime(date: Date): string {
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
