import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RequestStatus } from "@/types";
import { STATUS_ORDER, getStatusColor, getStatusLabel, getStatusIndex } from "@/utils/status";
import { useColors } from "@/hooks/useColors";
import { withOpacity } from "@/utils/color";

/** Step icon names matching each status stage. */
const STEP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  submitted: "document-text-outline",
  assigned: "person-add-outline",
  in_progress: "construct-outline",
  completed: "checkmark-circle-outline",
};

interface StatusTimelineProps {
  currentStatus: RequestStatus;
}

/**
 * Compact card-style status indicator.
 * Shows the current status prominently with a segmented progress bar beneath.
 */
export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const c = useColors();

  if (currentStatus === "cancelled") {
    return (
      <View style={[styles.card, { backgroundColor: c.errorBg, borderColor: c.errorBorder }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconCircle, { backgroundColor: withOpacity(c.error, 0.15) }]}>
            <Ionicons name="close-circle" size={20} color={c.error} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.statusLabel, { color: c.error }]}>Cancelled</Text>
            <Text style={[styles.statusHint, { color: c.errorTextMedium }]}>
              This request has been cancelled
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const isOnHold = currentStatus === "on_hold";
  const displayStatus: RequestStatus = isOnHold ? "in_progress" : currentStatus;
  const currentIndex = getStatusIndex(displayStatus);
  const color = isOnHold ? c.violet : getStatusColor(displayStatus);
  const label = isOnHold ? "On Hold" : getStatusLabel(displayStatus);
  const icon = isOnHold ? "pause-circle" : (STEP_ICONS[displayStatus] ?? "ellipse-outline");
  const bgColor = isOnHold ? c.violetBg : withOpacity(color, 0.08);
  const borderColor = isOnHold ? c.violetBorder : withOpacity(color, 0.2);

  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
      {/* Current status header */}
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: withOpacity(color, 0.15) }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.statusLabel, { color }]}>{label}</Text>
          <Text style={[styles.statusHint, { color: c.textTertiary }]}>
            Step {Math.min(currentIndex + 1, STATUS_ORDER.length)} of {STATUS_ORDER.length}
          </Text>
        </View>
      </View>

      {/* Segmented progress bar */}
      <View style={styles.progressRow}>
        {STATUS_ORDER.map((status, index) => {
          const isActive = index <= currentIndex;
          const segmentColor = isActive ? getStatusColor(status) : c.borderLight;
          return (
            <View
              key={status}
              style={[
                styles.progressSegment,
                index < STATUS_ORDER.length - 1 && styles.progressSegmentGap,
                { backgroundColor: segmentColor },
              ]}
            />
          );
        })}
      </View>

      {/* Step labels */}
      <View style={styles.labelsRow}>
        {STATUS_ORDER.map((status, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <Text
              key={status}
              style={[
                styles.stepLabel,
                {
                  color: isActive ? c.textSecondary : c.textMuted,
                  fontWeight: isCurrent ? "600" : "400",
                },
              ]}
              numberOfLines={1}
            >
              {getStatusLabel(status)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  statusHint: {
    fontSize: 12,
    marginTop: 1,
  },
  progressRow: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressSegment: {
    flex: 1,
    borderRadius: 3,
  },
  progressSegmentGap: {
    marginRight: 3,
  },
  labelsRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  stepLabel: {
    flex: 1,
    fontSize: 10,
    textAlign: "center",
  },
});
