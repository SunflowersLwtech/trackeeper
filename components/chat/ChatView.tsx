import React from "react";
import { FlatList, View, Text, ActivityIndicator } from "react-native";
import { Message } from "@/types";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";

interface ChatViewProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  error?: Error | null;
  onSend: (text: string) => void;
}

export function ChatView({ messages, currentUserId, loading, error, onSend }: ChatViewProps) {
  return (
    <View className="flex-1">
      {error ? (
        <View className="flex-1 items-center justify-center py-8" accessibilityLabel="Messages failed to load" accessibilityRole="text">
          <Text className="text-sm" style={{ color: "#ef4444" }}>
            Failed to load messages
          </Text>
        </View>
      ) : loading ? (
        <View className="flex-1 items-center justify-center py-8" accessibilityLabel="Loading messages" accessibilityRole="text">
          <ActivityIndicator size="small" color="#3b82f6" />
        </View>
      ) : messages.length === 0 ? (
        <View className="flex-1 items-center justify-center py-8" accessibilityLabel="No messages yet. Start the conversation!" accessibilityRole="text">
          <Text className="text-sm" style={{ color: "#9ca3af" }}>
            No messages yet. Start the conversation!
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              isOwn={item.senderId === currentUserId}
            />
          )}
        />
      )}
      <ChatInput onSend={onSend} />
    </View>
  );
}
