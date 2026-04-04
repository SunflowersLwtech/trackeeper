import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ChatView } from "@/components/chat/ChatView";
import { Message } from "@/types";
import { useColors } from "@/hooks/useColors";

interface ChatFABProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  error: Error | null;
  onSend: (text: string) => void;
  /** Optional label shown in the sheet header */
  headerLabel?: string;
}

/**
 * Floating Action Button that opens a bottom-sheet chat overlay.
 * Badge only counts messages from OTHER users (not your own).
 */
export function ChatFAB({
  messages,
  currentUserId,
  loading,
  error,
  onSend,
  headerLabel = "Messages",
}: ChatFABProps) {
  const c = useColors();
  const [open, setOpen] = useState(false);

  // Only count messages from others for the badge
  const otherCount = useMemo(
    () => messages.filter((m) => m.senderId !== currentUserId).length,
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
            ? `Open messages, ${otherCount} from others`
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
      <BottomSheet visible={open} onClose={() => setOpen(false)} heightFraction={0.8}>
        <View style={[styles.header, { borderBottomColor: c.borderLight }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="chatbubbles-outline" size={20} color={c.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.headerText, { color: c.text }]}>{headerLabel}</Text>
            <View style={[styles.headerBadge, { backgroundColor: c.surfaceAlt }]}>
              <Text style={[styles.headerBadgeText, { color: c.textTertiary }]}>
                {messages.length}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setOpen(false)}
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
          loading={loading}
          error={error}
          onSend={onSend}
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 100,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerBadge: {
    marginLeft: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
