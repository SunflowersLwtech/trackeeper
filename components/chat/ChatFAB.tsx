import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ChatView } from "@/components/chat/ChatView";
import { Message } from "@/types";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";

interface ChatFABProps {
  messages: Message[];
  currentUserId: string;
  currentUserRole?: "tenant" | "manager" | "maintainer";
  loading: boolean;
  error: Error | null;
  onSend: (
    text: string,
    imageUris?: string[],
    options?: { replyTo?: import("@/types").MessageReplyTo },
  ) => void | Promise<void>;
  /** Optional label shown in the sheet header */
  headerLabel?: string;
  /** Request id forwarded to ChatView for read-receipt marking. */
  requestId?: string;
  /** Names of other participants currently typing. */
  othersTyping?: { name: string }[];
  /** Notify the parent that the local user is or isn't typing. */
  onTypingChange?: (typing: boolean) => void;
}

/**
 * Floating Action Button that opens a bottom-sheet chat overlay.
 * Badge only counts UNREAD messages from OTHER users.
 */
export function ChatFAB({
  messages,
  currentUserId,
  currentUserRole,
  loading,
  error,
  onSend,
  headerLabel = "Messages",
  requestId,
  othersTyping,
  onTypingChange,
}: ChatFABProps) {
  const c = useColors();
  const [open, setOpen] = useState(false);

  // Only count UNREAD messages from others for the badge.
  const otherCount = useMemo(
    () =>
      messages.filter(
        (m) =>
          m.senderId !== currentUserId &&
          (!m.readBy || !m.readBy.includes(currentUserId)),
      ).length,
    [messages, currentUserId],
  );

  return (
    <>
      {/* Floating button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: c.primary }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={
          otherCount > 0
            ? `Open messages, ${otherCount} unread`
            : "Open messages"
        }
        testID="chat-fab"
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        {otherCount > 0 && (
          <View style={[styles.badge, { backgroundColor: c.error }]}>
            <Text style={styles.badgeText}>
              {otherCount > 99 ? "99+" : otherCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Chat bottom sheet */}
      <BottomSheet
        visible={open}
        onClose={() => {
          setOpen(false);
          if (onTypingChange) onTypingChange(false);
        }}
        heightFraction={0.8}
      >
        <View style={[styles.header, { borderBottomColor: c.borderLight }]}>
          <View style={styles.headerLeft}>
            <Ionicons
              name="chatbubbles-outline"
              size={20}
              color={c.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.headerText, { color: c.text }]}>{headerLabel}</Text>
            <View style={[styles.headerBadge, { backgroundColor: c.surfaceAlt }]}>
              <Text style={[styles.headerBadgeText, { color: c.textTertiary }]}>
                {messages.length}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              setOpen(false);
              if (onTypingChange) onTypingChange(false);
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close messages"
          >
            <Ionicons name="close" size={22} color={c.textMuted} />
          </TouchableOpacity>
        </View>
        <ChatView
          messages={messages}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          loading={loading}
          error={error}
          onSend={onSend}
          requestId={requestId}
          othersTyping={othersTyping}
          onTypingChange={onTypingChange}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: RADIUS.xs,
    borderWidth: BORDER.heavy,
    borderColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW_MD,
    zIndex: 100,
  },
  badge: {
    position: "absolute",
    top: -10,
    right: -10,
    minWidth: 24,
    height: 24,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: palette.paper,
    fontFamily: FONT.display,
    fontSize: 11,
    fontWeight: "900",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: BORDER.base,
    borderBottomColor: palette.ink,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    fontFamily: FONT.display,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headerBadge: {
    marginLeft: 10,
    minWidth: 24,
    height: 22,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    backgroundColor: palette.mustard500,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: "700",
    color: palette.ink,
  },
});
