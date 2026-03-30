import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useRequest } from "@/hooks/useRequest";
import { useMessages } from "@/hooks/useMessages";
import { sendMessage } from "@/services/messages";
import { StatusTimeline } from "@/components/request/StatusTimeline";
import { ChatView } from "@/components/chat/ChatView";

export default function TenantRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { request, loading } = useRequest(id);
  const { messages, loading: messagesLoading } = useMessages(id);

  const handleSend = async (text: string) => {
    if (!id || !user) return;
    try {
      await sendMessage(id, user.uid, user.name, text);
    } catch {
      // Silently fail for chat - message will appear when reconnected
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!request) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text style={{ color: "#6b7280" }}>Request not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ headerShown: true, title: "Request Detail" }} />
      <ScrollView
        className="bg-white"
        contentContainerStyle={{ padding: 20, paddingBottom: 0 }}
        style={{ maxHeight: "45%" }}
      >
        <StatusTimeline currentStatus={request.status} />
        <Text className="text-xl font-bold mt-4" style={{ color: "#111827" }}>
          {request.title}
        </Text>
        <View
          className="self-start px-3 py-1 rounded-md mt-2"
          style={{ backgroundColor: "#f3f4f6" }}
        >
          <Text className="text-xs" style={{ color: "#374151" }}>{request.category}</Text>
        </View>
        <Text className="text-base mt-4 leading-6" style={{ color: "#4b5563" }}>
          {request.description}
        </Text>
        {request.imageUrl ? (
          <Image
            source={{ uri: request.imageUrl }}
            className="w-full rounded-xl mt-4"
            style={{ height: 160 }}
            resizeMode="cover"
          />
        ) : null}
      </ScrollView>

      {/* Chat section */}
      <View className="flex-1 border-t" style={{ borderTopColor: "#e5e7eb" }}>
        <View className="px-4 py-2" style={{ backgroundColor: "#f9fafb" }}>
          <Text className="text-sm font-medium" style={{ color: "#374151" }}>
            Messages
          </Text>
        </View>
        <ChatView
          messages={messages}
          currentUserId={user?.uid ?? ""}
          loading={messagesLoading}
          onSend={handleSend}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
