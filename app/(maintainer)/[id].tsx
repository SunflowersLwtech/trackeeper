import React, { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { showError, showSuccess } from "@/utils/toast";
import { useLocalSearchParams, Stack } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useRequest } from "@/hooks/useRequest";
import { useMessages } from "@/hooks/useMessages";
import { updateRequestStatus, completeRequest } from "@/services/requests";
import { sendMessage } from "@/services/messages";
import { StatusTimeline } from "@/components/request/StatusTimeline";
import { StatusHistory } from "@/components/request/StatusHistory";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { ChatView } from "@/components/chat/ChatView";
import { RatingStars } from "@/components/request/RatingStars";
import { getStatusColor } from "@/utils/status";
import { RequestStatus } from "@/types";
import { confirmAction } from "@/utils/confirm";

export default function MaintainerTaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { request, loading, error: requestError } = useRequest(id);
  const { messages, loading: messagesLoading, error: messagesError } = useMessages(id);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "messages">("details");

  const handleStatusAction = (newStatus: RequestStatus, label: string) => {
    if (!request || !id || !user) return;
    confirmAction("Update Status", `${label}?`, async () => {
      setUpdating(true);
      try {
        if (newStatus === "completed") {
          await completeRequest(id, request.status, user.uid, user.name);
        } else {
          await updateRequestStatus(
            id,
            request.status,
            newStatus,
            user.uid,
            user.name,
            "maintainer",
          );
        }
        showSuccess(`Status updated`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update status";
        showError("Error", message);
      } finally {
        setUpdating(false);
      }
    });
  };

  const handleSend = async (text: string) => {
    if (!id || !user) return;
    try {
      await sendMessage(id, user.uid, user.name, text);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to send message";
      showError("Send Failed", msg);
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
        <Text style={{ color: requestError ? "#ef4444" : "#6b7280" }}>
          {requestError ? `Error: ${requestError.message}` : "Task not found"}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ headerShown: true, title: "Task Detail" }} />

      {/* Details / Messages tabs */}
      <View className="flex-row" style={{ backgroundColor: "#f9fafb" }}>
        <TouchableOpacity
          className="flex-1 py-2.5 items-center"
          style={{
            borderBottomWidth: 2,
            borderBottomColor: activeTab === "details" ? "#3b82f6" : "transparent",
          }}
          onPress={() => setActiveTab("details")}
          accessibilityRole="button"
          accessibilityLabel="Details tab"
          accessibilityState={{ selected: activeTab === "details" }}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: activeTab === "details" ? "#3b82f6" : "#6b7280" }}
          >
            Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 py-2.5 items-center"
          style={{
            borderBottomWidth: 2,
            borderBottomColor: activeTab === "messages" ? "#3b82f6" : "transparent",
          }}
          onPress={() => setActiveTab("messages")}
          accessibilityRole="button"
          accessibilityLabel="Messages tab"
          accessibilityState={{ selected: activeTab === "messages" }}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: activeTab === "messages" ? "#3b82f6" : "#6b7280" }}
          >
            Messages
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "details" ? (
        <ScrollView
          className="flex-1 bg-white"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          <StatusTimeline currentStatus={request.status} />

          <View
            className="flex-row items-center px-3 py-2 rounded-lg mt-2 mb-2"
            style={{ backgroundColor: "#f9fafb" }}
          >
            <Text className="text-sm" style={{ color: "#6b7280" }}>
              Tenant:{" "}
              <Text className="font-semibold" style={{ color: "#374151" }}>
                {request.tenantName}
              </Text>
            </Text>
          </View>

          <Text className="text-xl font-bold" style={{ color: "#111827" }}>
            {request.title}
          </Text>
          <View className="flex-row items-center mt-2">
            <View className="px-3 py-1 rounded-md mr-2" style={{ backgroundColor: "#f3f4f6" }}>
              <Text className="text-xs" style={{ color: "#374151" }}>{request.category}</Text>
            </View>
            {request.priority && <PriorityBadge priority={request.priority} />}
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

          {/* Action Buttons */}
          <View className="mt-4">
            {request.status === "assigned" && (
              <>
                <TouchableOpacity
                  className="rounded-xl py-3 items-center mb-2"
                  style={{ backgroundColor: updating ? "#d1d5db" : getStatusColor("in_progress") }}
                  onPress={() => handleStatusAction("in_progress", "Accept this task")}
                  disabled={updating}
                  accessibilityRole="button"
                  accessibilityLabel="Accept task"
                  accessibilityState={{ disabled: updating, busy: updating }}
                  testID="accept-task-button"
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-sm font-semibold">Accept Task</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-xl py-3 items-center mb-2"
                  style={{ backgroundColor: updating ? "#d1d5db" : getStatusColor("on_hold") }}
                  onPress={() => handleStatusAction("on_hold", "Put this task on hold")}
                  disabled={updating}
                  accessibilityRole="button"
                  accessibilityLabel="Put on hold"
                  accessibilityState={{ disabled: updating, busy: updating }}
                  testID="put-on-hold-button"
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-sm font-semibold">Put On Hold</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {request.status === "in_progress" && (
              <>
                <TouchableOpacity
                  className="rounded-xl py-3 items-center mb-2"
                  style={{ backgroundColor: updating ? "#d1d5db" : getStatusColor("completed") }}
                  onPress={() => handleStatusAction("completed", "Mark this task as complete")}
                  disabled={updating}
                  accessibilityRole="button"
                  accessibilityLabel="Mark task as complete"
                  accessibilityState={{ disabled: updating, busy: updating }}
                  testID="mark-complete-button"
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-sm font-semibold">Mark Complete</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-xl py-3 items-center mb-2"
                  style={{ backgroundColor: updating ? "#d1d5db" : getStatusColor("on_hold") }}
                  onPress={() => handleStatusAction("on_hold", "Put this task on hold")}
                  disabled={updating}
                  accessibilityRole="button"
                  accessibilityLabel="Put on hold"
                  accessibilityState={{ disabled: updating, busy: updating }}
                  testID="put-on-hold-button"
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-sm font-semibold">Put On Hold</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {request.status === "on_hold" && (
              <TouchableOpacity
                className="rounded-xl py-3 items-center mb-2"
                style={{ backgroundColor: updating ? "#d1d5db" : getStatusColor("in_progress") }}
                onPress={() => handleStatusAction("in_progress", "Resume this task")}
                disabled={updating}
                accessibilityRole="button"
                accessibilityLabel="Resume task"
                accessibilityState={{ disabled: updating, busy: updating }}
                testID="resume-task-button"
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-sm font-semibold">Resume Task</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Completed section */}
          {request.status === "completed" && (
            <View className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "#f0fdf4" }}>
              <Text className="text-sm font-semibold mb-1" style={{ color: "#22c55e" }}>
                Completed
              </Text>
              {request.rating ? (
                <View className="mt-2">
                  <Text className="text-xs mb-1" style={{ color: "#6b7280" }}>Tenant Rating</Text>
                  <RatingStars rating={request.rating} readonly size={20} />
                  {request.ratingComment ? (
                    <Text className="text-xs mt-1" style={{ color: "#6b7280" }}>
                      &quot;{request.ratingComment}&quot;
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text className="text-xs" style={{ color: "#6b7280" }}>Awaiting tenant rating</Text>
              )}
            </View>
          )}

          {/* Status History */}
          {request.statusHistory.length > 0 && (
            <View className="mt-4">
              <StatusHistory history={request.statusHistory} />
            </View>
          )}
        </ScrollView>
      ) : (
        <View className="flex-1 border-t" style={{ borderTopColor: "#e5e7eb" }}>
          <ChatView
            messages={messages}
            currentUserId={user?.uid ?? ""}
            loading={messagesLoading}
            error={messagesError}
            onSend={handleSend}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
