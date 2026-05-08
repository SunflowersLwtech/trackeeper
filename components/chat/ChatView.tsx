import React, { useEffect, useState } from "react";
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Message } from "@/types";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { useColors } from "@/hooks/useColors";
import { markAllMessagesRead } from "@/services/messages";

interface ChatViewProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  error?: Error | null;
  /** Send handler — receives trimmed text plus an optional image URI from the picker. */
  onSend: (text: string, imageUri?: string) => void | Promise<void>;
  /** Request id used for batch read-receipt marking. */
  requestId?: string;
  /** Names of other participants currently typing (driven by useMessages). */
  othersTyping?: { name: string }[];
  /** Notify the parent that the local user is or isn't typing. */
  onTypingChange?: (typing: boolean) => void;
}

export function ChatView({
  messages,
  currentUserId,
  loading,
  error,
  onSend,
  requestId,
  othersTyping = [],
  onTypingChange,
}: ChatViewProps) {
  const c = useColors();
  const [refreshing, setRefreshing] = useState(false);

  // Mark all unread messages as read on mount AND whenever the list changes.
  // Fire-and-forget — failures are silent so a flaky network never blocks the UI.
  useEffect(() => {
    if (!requestId || !currentUserId || messages.length === 0) return;
    markAllMessagesRead(requestId, messages, currentUserId).catch(() => undefined);
  }, [requestId, currentUserId, messages]);

  const handleRefresh = () => {
    // onSnapshot already keeps the list real-time — just flash the spinner so
    // the user gets visible feedback that pull-to-refresh registered.
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  const showTyping = othersTyping.length > 0;
  const typingNames = othersTyping.map((t) => t.name);

  return (
    <View style={styles.container}>
      {error ? (
        <View
          style={styles.centerState}
          accessibilityLabel="Messages failed to load"
          accessibilityRole="text"
        >
          <Ionicons name="warning-outline" size={32} color={c.error} style={{ marginBottom: 8 }} />
          <Text style={[styles.stateText, { color: c.error }]}>Failed to load messages</Text>
          <Text style={[styles.stateHint, { color: c.textMuted }]}>Pull down to retry</Text>
        </View>
      ) : loading ? (
        <View
          style={styles.centerState}
          accessibilityLabel="Loading messages"
          accessibilityRole="text"
        >
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={[styles.stateText, { color: c.textMuted, marginTop: 8 }]}>
            Loading messages...
          </Text>
        </View>
      ) : messages.length === 0 ? (
        <View
          style={styles.centerState}
          accessibilityLabel="No messages yet"
          accessibilityRole="text"
        >
          <View style={[styles.emptyIcon, { backgroundColor: c.surfaceAlt }]}>
            <Ionicons name="chatbubbles-outline" size={28} color={c.textMuted} />
          </View>
          <Text style={[styles.stateText, { color: c.textSecondary }]}>No messages yet</Text>
          <Text style={[styles.stateHint, { color: c.textMuted }]}>
            Send a message to start the conversation
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          renderItem={({ item, index }) => {
            // Group consecutive messages from same sender — hide name & avatar
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
            const showName = !nextMessage || nextMessage.senderId !== item.senderId;

            return (
              <ChatBubble
                message={item}
                isOwn={item.senderId === currentUserId}
                showName={showName}
              />
            );
          }}
        />
      )}

      {/* Typing indicator above the input */}
      {showTyping && <TypingIndicator names={typingNames} />}

      <ChatInput onSend={onSend} onTypingChange={onTypingChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stateText: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  stateHint: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
