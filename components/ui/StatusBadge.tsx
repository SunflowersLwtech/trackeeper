import React from "react";
import { View, Text } from "react-native";
import { RequestStatus } from "@/types";
import { getStatusColor, getStatusLabel } from "@/utils/status";
import { palette } from "@/constants/Colors";
import { FONT, RADIUS, BORDER, SHADOW_SM } from "@/constants/Brutalism";

interface StatusBadgeProps {
  status: RequestStatus;
}

/** Status colors that need light text on top */
const DARK_STATUSES: Record<RequestStatus, boolean> = {
  submitted: true, // ink black
  assigned: true, // cobalt
  scheduled: true, // sky blue
  cancelled: true, // tomato
  on_hold: true, // plum
  verified: true, // emerald — light text reads
  in_progress: false, // mustard — ink reads better
  completed: false, // lime — ink reads better
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status).toUpperCase();
  const useLightText = DARK_STATUSES[status];

  return (
    <View
      style={{
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
      <Text
        style={{
          fontFamily: FONT.display,
          fontSize: 10,
          fontWeight: "900",
          letterSpacing: 0.6,
          color: useLightText ? palette.paper : palette.ink,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
