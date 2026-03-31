import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RequestStatus } from "@/types";
import { STATUS_ORDER, getStatusColor, getStatusLabel, getStatusIndex } from "@/utils/status";

interface StatusTimelineProps {
  currentStatus: RequestStatus;
}

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  if (currentStatus === "cancelled") {
    return (
      <View className="items-center py-4 px-2">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mb-2"
          style={{ backgroundColor: "#fef2f2" }}
        >
          <Ionicons name="close-circle" size={24} color="#ef4444" />
        </View>
        <Text className="text-sm font-semibold" style={{ color: "#ef4444" }}>
          Request Cancelled
        </Text>
      </View>
    );
  }

  // For on_hold, show a banner + the timeline at the last active position
  const isOnHold = currentStatus === "on_hold";
  // When on hold, show timeline up to in_progress level (index 2) to indicate work was underway
  const displayStatus: RequestStatus = isOnHold ? "in_progress" : currentStatus;
  const currentIndex = getStatusIndex(displayStatus);

  return (
    <View>
      {isOnHold && (
        <View className="items-center py-3 px-2 mb-2 rounded-lg" style={{ backgroundColor: "#f5f3ff" }}>
          <View className="flex-row items-center">
            <Ionicons name="pause-circle" size={20} color="#8b5cf6" />
            <Text className="text-sm font-semibold ml-2" style={{ color: "#8b5cf6" }}>
              On Hold
            </Text>
          </View>
        </View>
      )}
      <View className="flex-row items-center justify-between py-4 px-2">
        {STATUS_ORDER.map((status, index) => {
          const isActive = index <= currentIndex;
          const color = isActive ? getStatusColor(status) : "#d1d5db";
          const isLast = index === STATUS_ORDER.length - 1;

          return (
            <React.Fragment key={status}>
              <View className="items-center" style={{ flex: 1 }}>
                <View
                  className="w-8 h-8 rounded-full items-center justify-center mb-1"
                  style={{ backgroundColor: isActive ? color : "#f3f4f6" }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: isActive ? "#fff" : "#9ca3af" }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  className="text-xs text-center"
                  style={{ color: isActive ? "#374151" : "#9ca3af" }}
                  numberOfLines={1}
                >
                  {getStatusLabel(status)}
                </Text>
              </View>
              {!isLast && (
                <View
                  className="h-1 flex-1 rounded-full mx-1"
                  style={{
                    backgroundColor: index < currentIndex ? getStatusColor(STATUS_ORDER[index + 1]) : "#e5e7eb",
                    marginBottom: 20,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}
