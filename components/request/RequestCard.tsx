import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaintenanceRequest } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD } from "@/constants/Brutalism";
import { formatTimeAgo } from "@/utils/time";
import { slaRemainingMs, slaSeverity, formatSlaRemaining } from "@/utils/sla";
import { highlightMatches } from "@/utils/search";

interface RequestCardProps {
  request: MaintenanceRequest;
  onPress: () => void;
  /** Optional search query — when provided, matching spans in the title are highlighted. */
  searchQuery?: string;
}

const CATEGORY_TINT: Record<string, string> = {
  Plumbing: palette.sky500,
  Electrical: palette.mustard500,
  General: palette.ink,
};

export const RequestCard = React.memo(function RequestCard({ request, onPress, searchQuery }: RequestCardProps) {
  const c = useColors();
  const timeAgo = request.createdAt?.toDate
    ? formatTimeAgo(request.createdAt.toDate())
    : "";
  const categoryColor = CATEGORY_TINT[request.category] ?? palette.ink;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${request.title}, status: ${request.status}`}
      accessibilityHint="Opens request details"
      testID={`request-card-${request.title}`}
      style={{
        backgroundColor: c.surface,
        borderWidth: BORDER.base,
        borderColor: palette.ink,
        borderRadius: RADIUS.sm,
        padding: 16,
        marginBottom: 14,
        ...SHADOW_MD,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Category accent stripe — flush left */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 8,
          backgroundColor: categoryColor,
          borderRightWidth: BORDER.base,
          borderRightColor: palette.ink,
        }}
      />
      <View style={{ paddingLeft: 8 }}>
        {/* Header row: title + status */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
          <Text
            style={{
              flex: 1,
              fontFamily: FONT.display,
              fontSize: 16,
              fontWeight: "900",
              color: c.text,
              marginRight: 12,
              letterSpacing: -0.2,
              lineHeight: 20,
            }}
            numberOfLines={2}
          >
            {searchQuery && searchQuery.trim().length >= 2
              ? highlightMatches(request.title, searchQuery).map((seg, i) => (
                  <Text
                    key={i}
                    style={
                      seg.match
                        ? {
                            backgroundColor: "#FEF08A",
                            color: palette.ink,
                          }
                        : undefined
                    }
                  >
                    {seg.text}
                  </Text>
                ))
              : request.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {(() => {
              if (!request.sla) return null;
              const severity = slaSeverity(request.sla);
              if (severity === "ok") return null;
              const remaining = slaRemainingMs(request.sla);
              const bg =
                severity === "breached"
                  ? palette.tomato500
                  : severity === "danger"
                    ? "#F97316"
                    : palette.mustard500;
              const fg = severity === "warning" ? palette.ink : palette.paper;
              return (
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderWidth: BORDER.base,
                    borderColor: palette.ink,
                    backgroundColor: bg,
                  }}
                  testID={`sla-badge-${severity}`}
                >
                  <Text
                    style={{
                      fontFamily: FONT.display,
                      fontSize: 9,
                      fontWeight: "900",
                      color: fg,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {formatSlaRemaining(remaining)}
                  </Text>
                </View>
              );
            })()}
            <StatusBadge status={request.status} />
            {request.payment?.status === "refunded" && (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderWidth: 1.5,
                  borderColor: palette.ink400,
                  backgroundColor: palette.paper,
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT.display,
                    fontSize: 9,
                    fontWeight: "900",
                    color: palette.ink400,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}
                >
                  Refunded
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <Text
          style={{
            fontFamily: FONT.body,
            fontSize: 13,
            color: c.textBody,
            lineHeight: 18,
            marginBottom: 12,
          }}
          numberOfLines={2}
        >
          {request.description}
        </Text>

        {request.assignedToName && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 10,
              paddingVertical: 4,
              paddingHorizontal: 8,
              backgroundColor: c.surfaceAlt,
              borderWidth: 1.5,
              borderColor: palette.ink,
              alignSelf: "flex-start",
            }}
          >
            <Ionicons name="hammer" size={11} color={palette.ink} />
            <Text
              style={{
                fontFamily: FONT.mono,
                fontSize: 11,
                marginLeft: 6,
                color: palette.ink,
                letterSpacing: 0.3,
              }}
            >
              {request.assignedToName.toUpperCase()}
            </Text>
          </View>
        )}

        {/* Footer row */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                backgroundColor: categoryColor,
                borderWidth: BORDER.base,
                borderColor: palette.ink,
              }}
            >
              <Text
                style={{
                  fontFamily: FONT.display,
                  fontSize: 10,
                  fontWeight: "900",
                  letterSpacing: 0.6,
                  color: categoryColor === palette.mustard500 ? palette.ink : palette.paper,
                  textTransform: "uppercase",
                }}
              >
                {request.category}
              </Text>
            </View>
            {request.priority && <PriorityBadge priority={request.priority} />}
          </View>
          {timeAgo ? (
            <Text
              style={{
                fontFamily: FONT.mono,
                fontSize: 11,
                color: c.textMuted,
                letterSpacing: 0.2,
              }}
            >
              {timeAgo}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});
