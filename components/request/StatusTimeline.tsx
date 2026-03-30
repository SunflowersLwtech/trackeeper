import React from "react";
import { View, Text } from "react-native";
import { RequestStatus } from "@/types";
import { STATUS_ORDER, getStatusColor, getStatusLabel, getStatusIndex } from "@/utils/status";

interface StatusTimelineProps {
  currentStatus: RequestStatus;
}

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const currentIndex = getStatusIndex(currentStatus);

  return (
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
  );
}
