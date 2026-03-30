import React from "react";
import { FlatList, View, Text, ActivityIndicator } from "react-native";
import { Message } from "@/types";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";

interface ChatViewProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  onSend: (text: string) => void;
}

export function ChatView({ messages, currentUserId, loading, onSend }: ChatViewProps) {
  return (
    <View className="flex-1">
      {loading ? (
        <View className="flex-1 items-center justify-center py-8">
          <ActivityIndicator size="small" color="#3b82f6" />
        </View>
      ) : messages.length === 0 ? (
        <View className="flex-1 items-center justify-center py-8">
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
