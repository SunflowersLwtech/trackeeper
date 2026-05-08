import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface MessageStatusIconProps {
  /** True when at least one recipient (other than the sender) has read the message. */
  read: boolean;
  /** Optional override colour. Defaults to muted (sent) or primary blue (read). */
  color?: string;
  /** Icon size in points. Default 14. */
  size?: number;
}

/**
 * WhatsApp-style read receipt indicator.
 * - read=false → single grey check (sent / pending read)
 * - read=true  → double blue check (read by at least one recipient)
 *
 * The double-check is composited from two overlapping checkmarks so the
 * presentation matches WhatsApp without depending on a stack icon.
 */
export const MessageStatusIcon = React.memo(function MessageStatusIcon({
  read,
  color,
  size = 14,
}: MessageStatusIconProps) {
  const c = useColors();
  const tone = color ?? (read ? c.primary : c.textMuted);

  if (!read) {
    return (
      <Ionicons
        name="checkmark"
        size={size}
        color={tone}
        accessibilityLabel="Message sent"
      />
    );
  }

  // Double check — overlap two checkmarks horizontally for the WhatsApp look.
  return (
    <View
      style={[styles.doubleCheck, { width: size + 5 }]}
      accessibilityLabel="Message read"
      accessible
    >
      <Ionicons
        name="checkmark"
        size={size}
        color={tone}
        style={styles.firstCheck}
      />
      <Ionicons
        name="checkmark"
        size={size}
        color={tone}
        style={[styles.secondCheck, { left: size * 0.35 }]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  doubleCheck: {
    height: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  firstCheck: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  secondCheck: {
    position: "absolute",
    top: 0,
  },
});
