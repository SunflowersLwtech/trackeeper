import React, { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useRequest } from "@/hooks/useRequest";
import { useMessages } from "@/hooks/useMessages";
import { updateRequestStatus } from "@/services/requests";
import { sendMessage } from "@/services/messages";
import { StatusTimeline } from "@/components/request/StatusTimeline";
import { ChatView } from "@/components/chat/ChatView";
import { getNextStatuses, getStatusLabel, getStatusColor } from "@/utils/status";
import { RequestStatus } from "@/types";

export default function ManagerRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { request, loading } = useRequest(id);
  const { messages, loading: messagesLoading } = useMessages(id);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: RequestStatus) => {
    if (!request || !id) return;
    setUpdating(true);
    try {
      await updateRequestStatus(id, request.status, newStatus);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update status";
      Alert.alert("Error", message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSend = async (text: string) => {
    if (!id || !user) return;
    try {
      await sendMessage(id, user.uid, user.name, text);
    } catch {
      // Silently fail
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

  const nextStatuses = getNextStatuses(request.status);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ headerShown: true, title: "Manage Request" }} />
      <ScrollView
        className="bg-white"
        contentContainerStyle={{ padding: 20, paddingBottom: 0 }}
        style={{ maxHeight: "45%" }}
      >
        <StatusTimeline currentStatus={request.status} />

        <View
          className="flex-row items-center px-3 py-2 rounded-lg mt-2 mb-2"
          style={{ backgroundColor: "#f9fafb" }}
        >
          <Text className="text-sm" style={{ color: "#6b7280" }}>
            By{" "}
            <Text className="font-semibold" style={{ color: "#374151" }}>
              {request.tenantName}
            </Text>
          </Text>
        </View>

        <Text className="text-xl font-bold" style={{ color: "#111827" }}>
          {request.title}
        </Text>
        <View
          className="self-start px-3 py-1 rounded-md mt-2"
          style={{ backgroundColor: "#f3f4f6" }}
        >
          <Text className="text-xs" style={{ color: "#374151" }}>{request.category}</Text>
        </View>
        <Text className="text-base mt-3 leading-6" style={{ color: "#4b5563" }}>
          {request.description}
        </Text>

        {request.imageUrl ? (
          <Image
            source={{ uri: request.imageUrl }}
            className="w-full rounded-xl mt-3"
            style={{ height: 140 }}
            resizeMode="cover"
          />
        ) : null}

        {/* Status Action Buttons */}
        {nextStatuses.length > 0 && (
          <View className="mt-4">
            {nextStatuses.map((status) => (
              <TouchableOpacity
                key={status}
                className="rounded-xl py-3 items-center mb-2"
                style={{ backgroundColor: updating ? "#d1d5db" : getStatusColor(status) }}
                onPress={() => handleStatusChange(status)}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-sm font-semibold">
                    Mark as {getStatusLabel(status)}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {request.status === "completed" && (
          <View className="mt-4 rounded-xl py-3 items-center" style={{ backgroundColor: "#f0fdf4" }}>
            <Text className="text-sm font-semibold" style={{ color: "#22c55e" }}>
              Completed
            </Text>
          </View>
        )}
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
