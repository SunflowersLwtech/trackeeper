import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RequestStatus } from "@/types";
import {
  STATUS_ORDER,
  getStatusColor,
  getStatusLabel,
  getStatusIndex,
} from "@/utils/status";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD } from "@/constants/Brutalism";

const STEP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  submitted: "document-text",
  assigned: "person-add",
  scheduled: "calendar",
  in_progress: "construct",
  completed: "checkmark-circle",
  verified: "shield-checkmark",
};

interface StatusTimelineProps {
  currentStatus: RequestStatus;
  /** Optional caller-provided "On hold reason" for inline badge. */
  onHoldReason?: string;
}

const NODE_DIAMETER = 28;

/**
 * Six-node brutalist status timeline.
 * - Past nodes: solid colour fill + ✓
 * - Current node: solid + pulse animation
 * - Future nodes: hollow circle, ink hairline border
 * - Connector segments: solid (past) / dashed (future)
 * - on_hold: keeps the same node row, current node turns mustard with pause icon + reason badge
 * - cancelled: row greyed + strikethrough, connector truncated after submitted
 */
export function StatusTimeline({ currentStatus, onHoldReason }: StatusTimelineProps) {
  const c = useColors();

  const isCancelled = currentStatus === "cancelled";
  const isOnHold = currentStatus === "on_hold";
  // For on_hold we still walk through the main lane — pretend the user is at
  // the in_progress node visually but render the node as mustard / paused.
  const lookupStatus: RequestStatus = isOnHold ? "in_progress" : isCancelled ? "submitted" : currentStatus;
  const currentIndex = Math.max(0, getStatusIndex(lookupStatus));

  // Pulse animation for the current node (skipped when on_hold or cancelled).
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isOnHold || isCancelled) {
      pulseAnim.setValue(0);
      return;
    }
    pulseAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [isOnHold, isCancelled, pulseAnim, currentStatus]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isCancelled ? c.surfaceAlt : c.surface,
          borderColor: isCancelled ? palette.ink400 : palette.ink,
          opacity: isCancelled ? 0.85 : 1,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: getStatusColor(currentStatus),
            borderWidth: BORDER.base,
            borderColor: palette.ink,
          }}
        >
          <Text
            style={{
              fontFamily: FONT.display,
              fontSize: 11,
              fontWeight: "900",
              color: needsLightText(currentStatus) ? palette.paper : palette.ink,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            {getStatusLabel(currentStatus)}
          </Text>
        </View>
        {isOnHold && onHoldReason ? (
          <View style={styles.onHoldBadge}>
            <Ionicons name="pause" size={12} color={palette.ink} />
            <Text style={styles.onHoldText} numberOfLines={1}>
              On hold — {onHoldReason}
            </Text>
          </View>
        ) : null}
        {isOnHold && !onHoldReason ? (
          <View style={styles.onHoldBadge}>
            <Ionicons name="pause" size={12} color={palette.ink} />
            <Text style={styles.onHoldText}>On hold</Text>
          </View>
        ) : null}
      </View>

      {/* Nodes row */}
      <View style={styles.nodesRow}>
        {STATUS_ORDER.map((status, i) => {
          const isCurrent = i === currentIndex && !isCancelled;
          const isPast = i < currentIndex && !isCancelled;
          const isFuture = i > currentIndex || isCancelled;
          const nodeColor = isOnHold && isCurrent
            ? palette.mustard500
            : isCancelled
              ? palette.ink300
              : isCurrent
                ? getStatusColor(status)
                : isPast
                  ? getStatusColor(status)
                  : "transparent";

          return (
            <React.Fragment key={status}>
              <View style={styles.nodeWrap}>
                {/* Pulse ring (current node only, not on_hold/cancelled) */}
                {isCurrent && !isOnHold && !isCancelled && (
                  <Animated.View
                    style={[
                      styles.pulse,
                      {
                        backgroundColor: getStatusColor(status),
                        opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                        transform: [
                          {
                            scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }),
                          },
                        ],
                      },
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.node,
                    {
                      backgroundColor: nodeColor,
                      borderColor: isFuture ? palette.ink300 : palette.ink,
                      borderWidth: isFuture ? 1.5 : BORDER.base,
                      borderStyle: isFuture ? "dashed" : "solid",
                    },
                  ]}
                  testID={`status-timeline-node-${status}`}
                >
                  {(isPast || isCurrent) ? (
                    <Ionicons
                      name={
                        isOnHold && isCurrent
                          ? "pause"
                          : (STEP_ICONS[status] ?? "ellipse")
                      }
                      size={14}
                      color={
                        isOnHold && isCurrent
                          ? palette.ink
                          : needsLightText(status)
                            ? palette.paper
                            : palette.ink
                      }
                    />
                  ) : null}
                </View>
              </View>
              {/* Connector */}
              {i < STATUS_ORDER.length - 1 && (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  {i < currentIndex && !isCancelled ? (
                    <View style={[styles.connector, { backgroundColor: palette.ink }]} />
                  ) : (
                    <View
                      style={[
                        styles.connectorDashed,
                        { borderColor: palette.ink300 },
                      ]}
                    />
                  )}
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Labels row */}
      <View style={styles.labelsRow}>
        {STATUS_ORDER.map((status, i) => {
          const isCurrent = i === currentIndex && !isCancelled;
          return (
            <Text
              key={status}
              style={[
                styles.stepLabel,
                {
                  color: isCancelled
                    ? palette.ink400
                    : isCurrent
                      ? palette.ink
                      : palette.ink500,
                  fontWeight: isCurrent ? "900" : "700",
                  textDecorationLine: isCancelled ? "line-through" : "none",
                  opacity: i <= currentIndex || isCancelled ? 1 : 0.7,
                },
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {getStatusLabel(status).toUpperCase()}
            </Text>
          );
        })}
      </View>

      {isCancelled && (
        <View style={[styles.onHoldBadge, { marginTop: 10, alignSelf: "flex-start" }]}>
          <Ionicons name="close-circle" size={12} color={palette.tomato500} />
          <Text style={[styles.onHoldText, { color: palette.tomato500 }]}>Cancelled — request closed</Text>
        </View>
      )}
    </View>
  );
}

function needsLightText(status: RequestStatus): boolean {
  return status === "submitted" || status === "assigned" || status === "scheduled" || status === "cancelled" || status === "on_hold" || status === "verified";
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.sm,
    borderWidth: BORDER.heavy,
    padding: 16,
    ...SHADOW_MD,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
    flexWrap: "wrap",
  },
  onHoldBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1.5,
    borderColor: palette.ink,
    backgroundColor: palette.mustard50,
    gap: 4,
  },
  onHoldText: {
    fontFamily: FONT.display,
    fontSize: 10,
    fontWeight: "900",
    color: palette.ink,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  nodesRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nodeWrap: {
    width: NODE_DIAMETER,
    height: NODE_DIAMETER,
    alignItems: "center",
    justifyContent: "center",
  },
  node: {
    width: NODE_DIAMETER,
    height: NODE_DIAMETER,
    borderRadius: NODE_DIAMETER / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.paper,
  },
  pulse: {
    position: "absolute",
    width: NODE_DIAMETER,
    height: NODE_DIAMETER,
    borderRadius: NODE_DIAMETER / 2,
  },
  connector: {
    height: BORDER.base,
    width: "100%",
  },
  connectorDashed: {
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    width: "100%",
  },
  labelsRow: {
    flexDirection: "row",
    marginTop: 8,
    // gap prevents adjacent labels from butting up against each other when
    // they fully use their flex column ("SCHEDULED" + "IN PROGRESS" was
    // rendering as "SCHEDULEDIN PROGR…" before).
    columnGap: 4,
  },
  stepLabel: {
    flex: 1,
    fontFamily: FONT.display,
    fontSize: 9,
    letterSpacing: 0.3,
    textAlign: "center",
    // Tight horizontal padding lets long labels wrap onto a 2nd line without
    // touching neighbours; combined with numberOfLines={2} on the <Text>.
    paddingHorizontal: 1,
  },
});
