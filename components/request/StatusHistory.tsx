import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusChange } from "@/types";
import { getStatusLabel, getStatusColor } from "@/utils/status";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER } from "@/constants/Brutalism";
import { formatTimeAgo } from "@/utils/time";

interface StatusHistoryProps {
  history: StatusChange[] | undefined;
}

export function StatusHistory({ history }: StatusHistoryProps) {
  const c = useColors();
  if (!history || history.length === 0) return null;

  return (
    <View style={{ marginTop: 16 }}>
      <Text
        style={{
          fontFamily: FONT.display,
          fontSize: 13,
          fontWeight: "900",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: c.text,
          marginBottom: 12,
        }}
      >
        ◼ Status history
      </Text>
      {history.map((change, index) => {
        const toColor = getStatusColor(change.to);
        const timeStr = change.changedAt?.toDate
          ? formatTimeAgo(change.changedAt.toDate())
          : "";

        return (
          <View key={index} style={{ flexDirection: "row", marginBottom: 14 }}>
            {/* Brutalist timeline dot + rail */}
            <View style={{ alignItems: "center", marginRight: 12, width: 22 }}>
              <View
                style={{
                  width: 16,
                  height: 16,
                  backgroundColor: toColor,
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                }}
              />
              {index < history.length - 1 && (
                <View
                  style={{
                    width: 3,
                    flex: 1,
                    marginTop: 4,
                    backgroundColor: palette.ink,
                  }}
                />
              )}
            </View>

            <View style={{ flex: 1, paddingBottom: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                <Text
                  style={{
                    fontFamily: FONT.display,
                    fontSize: 11,
                    fontWeight: "900",
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    color: c.textBody,
                  }}
                >
                  {getStatusLabel(change.from)}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={11}
                  color={palette.ink}
                  style={{ marginHorizontal: 6 }}
                />
                <Text
                  style={{
                    fontFamily: FONT.display,
                    fontSize: 11,
                    fontWeight: "900",
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    color: toColor === palette.mustard500 || toColor === palette.lime500 ? palette.ink : toColor,
                  }}
                >
                  {getStatusLabel(change.to)}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 11,
                  marginTop: 3,
                  color: c.textMuted,
                  letterSpacing: 0.2,
                }}
              >
                by {change.changedByName}
                {timeStr ? `  ·  ${timeStr}` : ""}
              </Text>
              {change.note ? (
                <Text
                  style={{
                    fontFamily: FONT.body,
                    fontSize: 12,
                    marginTop: 4,
                    color: c.textBody,
                    lineHeight: 16,
                  }}
                >
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
