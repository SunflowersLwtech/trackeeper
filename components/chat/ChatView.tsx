import React, { useEffect, useState } from "react";
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Message, MessageReplyTo } from "@/types";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER } from "@/constants/Brutalism";
import {
  markAllMessagesRead,
  editMessage as editMessageApi,
  softDeleteMessage,
  toggleReaction,
  AllowedReaction,
} from "@/services/messages";
import { showError, showSuccess } from "@/utils/toast";

interface ChatViewProps {
  messages: Message[];
  currentUserId: string;
  currentUserName?: string;
  currentUserRole?: "tenant" | "manager" | "maintainer";
  loading: boolean;
  error?: Error | null;
  onSend: (
    text: string,
    imageUris?: string[],
    options?: { replyTo?: MessageReplyTo },
  ) => void | Promise<void>;
  requestId?: string;
  othersTyping?: { name: string }[];
  onTypingChange?: (typing: boolean) => void;
}

export function ChatView({
  messages,
  currentUserId,
  currentUserRole,
  loading,
  error,
  onSend,
  requestId,
  othersTyping = [],
  onTypingChange,
}: ChatViewProps) {
  const c = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (!requestId || !currentUserId || messages.length === 0) return;
    markAllMessagesRead(requestId, messages, currentUserId).catch(() => undefined);
  }, [requestId, currentUserId, messages]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  const showTyping = othersTyping.length > 0;
  const typingNames = othersTyping.map((t) => t.name);

  const onReply = (m: Message) => {
    setEditingMessage(null);
    setReplyingTo(m);
  };

  const onEdit = (m: Message) => {
    setReplyingTo(null);
    setEditingMessage(m);
  };

  const onCancelReply = () => setReplyingTo(null);
  const onCancelEdit = () => setEditingMessage(null);

  const onSubmitEdit = async (newText: string) => {
    if (!editingMessage || !requestId) return;
    if (newText.trim().length === 0) {
      showError("Empty message", "Type something or cancel the edit.");
      return;
    }
    try {
      await editMessageApi(requestId, editingMessage.id, currentUserId, newText);
      setEditingMessage(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not edit message";
      showError("Edit failed", msg);
    }
  };

  const onDelete = (m: Message) => {
    if (!requestId) return;
    Alert.alert(
      "Delete this message?",
      "Other participants will see it was deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await softDeleteMessage(requestId, m.id, currentUserId);
              showSuccess("Deleted");
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Could not delete";
              showError("Delete failed", msg);
            }
          },
        },
      ],
    );
  };

  const onReact = async (m: Message, emoji: AllowedReaction) => {
    if (!requestId) return;
    try {
      await toggleReaction(requestId, m.id, currentUserId, emoji);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not react";
      showError("Reaction failed", msg);
    }
  };

  const onShowReactionPeople = (m: Message, emoji: AllowedReaction) => {
    const uids = m.reactions?.[emoji] ?? [];
    if (uids.length === 0) return;
    // Look up names from the current message thread (each message carries senderName).
    const nameByUid = new Map<string, string>();
    for (const msg of messages) nameByUid.set(msg.senderId, msg.senderName);
    const list = uids.map((uid) => nameByUid.get(uid) ?? "Someone").join("\n");
    Alert.alert(`${emoji} · ${uids.length}`, list);
  };

  const handleSend = async (
    text: string,
    imageUris?: string[],
    options?: { replyTo?: MessageReplyTo },
  ) => {
    await onSend(text, imageUris, options);
    setReplyingTo(null);
  };

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.centerState} accessibilityLabel="Messages failed to load" accessibilityRole="text">
          <Ionicons name="warning-outline" size={32} color={c.error} style={{ marginBottom: 8 }} />
          <Text style={[styles.stateText, { color: c.error }]}>Failed to load messages</Text>
          <Text style={[styles.stateHint, { color: c.textMuted }]}>Pull down to retry</Text>
        </View>
      ) : loading ? (
        <View style={styles.centerState} accessibilityLabel="Loading messages" accessibilityRole="text">
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={[styles.stateText, { color: c.textMuted, marginTop: 8 }]}>Loading messages...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.centerState} accessibilityLabel="No messages yet" accessibilityRole="text">
          <View style={[styles.emptyIcon, { backgroundColor: c.surfaceAlt }]}>
            <Ionicons name="chatbubbles-outline" size={28} color={c.textMuted} />
          </View>
          <Text style={[styles.stateText, { color: c.textSecondary }]}>No messages yet</Text>
          <Text style={[styles.stateHint, { color: c.textMuted }]}>Send a message to start the conversation</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary} colors={[c.primary]} />}
          renderItem={({ item, index }) => {
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
            const showName = !nextMessage || nextMessage.senderId !== item.senderId;
            return (
              <ChatBubble
                message={item}
                isOwn={item.senderId === currentUserId}
                showName={showName}
                currentUserRole={currentUserRole}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleReaction={onReact}
                onShowReactionPeople={onShowReactionPeople}
              />
            );
          }}
        />
      )}

      {showTyping && <TypingIndicator names={typingNames} />}

      <ChatInput
        onSend={handleSend}
        onSubmitEdit={onSubmitEdit}
        onTypingChange={onTypingChange}
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
        editingMessage={editingMessage}
        onCancelEdit={onCancelEdit}
      />
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
    width: 64,
    height: 64,
    borderWidth: BORDER.heavy,
    borderColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  stateText: {
    fontFamily: FONT.display,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.6,
    textAlign: "center",
    textTransform: "uppercase",
  },
  stateHint: {
    fontFamily: FONT.body,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
