import React from "react";
import { View, Text } from "react-native";
import { RequestPriority } from "@/types";
import { getPriorityColor, getPriorityLabel } from "@/utils/priority";
import { palette } from "@/constants/Colors";
import { FONT, RADIUS, BORDER, SHADOW_SM } from "@/constants/Brutalism";

interface PriorityBadgeProps {
  priority: RequestPriority;
}

const DARK_PRIORITIES: Record<RequestPriority, boolean> = {
  low: false, // lime — ink reads
  medium: false, // mustard — ink reads
  high: true, // tomato — paper reads
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const color = getPriorityColor(priority);
  const label = getPriorityLabel(priority).toUpperCase();
  const useLight = DARK_PRIORITIES[priority];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
        backgroundColor: color,
        borderWidth: BORDER.base,
        borderColor: palette.ink,
        ...SHADOW_SM,
        alignSelf: "flex-start",
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          backgroundColor: useLight ? palette.paper : palette.ink,
          marginRight: 6,
        }}
      />
      <Text
        style={{
          fontFamily: FONT.display,
          fontSize: 10,
          fontWeight: "900",
          letterSpacing: 0.6,
          color: useLight ? palette.paper : palette.ink,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
