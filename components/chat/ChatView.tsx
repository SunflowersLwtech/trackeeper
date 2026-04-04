import React from "react";
import { FlatList, View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Message } from "@/types";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { useColors } from "@/hooks/useColors";

interface ChatViewProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  error?: Error | null;
  onSend: (text: string) => void;
}

export function ChatView({ messages, currentUserId, loading, error, onSend }: ChatViewProps) {
  const c = useColors();

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.centerState} accessibilityLabel="Messages failed to load" accessibilityRole="text">
          <Ionicons name="warning-outline" size={32} color={c.error} style={{ marginBottom: 8 }} />
          <Text style={[styles.stateText, { color: c.error }]}>
            Failed to load messages
          </Text>
          <Text style={[styles.stateHint, { color: c.textMuted }]}>
            Pull down to retry
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.centerState} accessibilityLabel="Loading messages" accessibilityRole="text">
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={[styles.stateText, { color: c.textMuted, marginTop: 8 }]}>
            Loading messages...
          </Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.centerState} accessibilityLabel="No messages yet" accessibilityRole="text">
          <View style={[styles.emptyIcon, { backgroundColor: c.surfaceAlt }]}>
            <Ionicons name="chatbubbles-outline" size={28} color={c.textMuted} />
          </View>
          <Text style={[styles.stateText, { color: c.textSecondary }]}>
            No messages yet
          </Text>
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
      <ChatInput onSend={onSend} />
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
