import React, { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useRequest } from "@/hooks/useRequest";
import { useMessages } from "@/hooks/useMessages";
import { sendMessage } from "@/services/messages";
import { cancelRequest, rateRequest } from "@/services/requests";
import { canCancel } from "@/utils/status";
import { showSuccess, showError } from "@/utils/toast";
import { confirmAction } from "@/utils/confirm";
import { StatusTimeline } from "@/components/request/StatusTimeline";
import { StatusHistory } from "@/components/request/StatusHistory";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { ChatView } from "@/components/chat/ChatView";
import { RatingStars } from "@/components/request/RatingStars";

export default function TenantRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { request, loading, error: requestError } = useRequest(id);
  const { messages, loading: messagesLoading, error: messagesError } = useMessages(id);
  const [cancelling, setCancelling] = useState(false);
  const [pendingRating, setPendingRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const handleSend = async (text: string) => {
    if (!id || !user) return;
    try {
      await sendMessage(id, user.uid, user.name, text);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to send message";
      showError("Send Failed", msg);
    }
  };

  const handleCancel = () => {
    if (!request || !id || !user) return;
    confirmAction(
      "Cancel Request",
      "Are you sure you want to cancel this request? This cannot be undone.",
      async () => {
        setCancelling(true);
        try {
          await cancelRequest(id, request.status, user.uid, user.name);
          showSuccess("Request cancelled");
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Failed to cancel";
          showError("Error", message);
        } finally {
          setCancelling(false);
        }
      },
      { destructive: true },
    );
  };

  const handleRate = async () => {
    if (!id || pendingRating === 0) return;
    setSubmittingRating(true);
    try {
      await rateRequest(id, pendingRating, ratingComment.trim() || undefined);
      showSuccess("Thank you for your feedback!");
      setPendingRating(0);
      setRatingComment("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit rating";
      showError("Error", message);
    } finally {
      setSubmittingRating(false);
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
          {requestError ? `Error: ${requestError.message}` : "Request not found"}
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
      <Stack.Screen options={{ headerShown: true, title: "Request Detail" }} />
      <ScrollView
        className="bg-white"
        contentContainerStyle={{ padding: 20, paddingBottom: 0 }}
        style={{ maxHeight: "50%" }}
      >
        <StatusTimeline currentStatus={request.status} />

        {/* Title + Edit */}
        <View className="flex-row items-start justify-between mt-4">
          <Text className="text-xl font-bold flex-1 mr-2" style={{ color: "#111827" }}>
            {request.title}
          </Text>
          {request.status === "submitted" && (
            <TouchableOpacity
              className="flex-row items-center px-3 py-1.5 rounded-lg border"
              style={{ borderColor: "#d1d5db" }}
              onPress={() => router.push(`/(tenant)/edit/${id}`)}
              accessibilityRole="button"
              accessibilityLabel="Edit request"
              testID="tenant-edit-button"
            >
              <Ionicons name="pencil-outline" size={14} color="#3b82f6" />
              <Text className="text-xs ml-1 font-medium" style={{ color: "#3b82f6" }}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row items-center mt-2">
          <View className="px-3 py-1 rounded-md mr-2" style={{ backgroundColor: "#f3f4f6" }}>
            <Text className="text-xs" style={{ color: "#374151" }}>{request.category}</Text>
          </View>
          {request.priority && <PriorityBadge priority={request.priority} />}
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

        {/* Assignee Info */}
        {request.assignedToName && (
          <View className="mt-4 p-3 rounded-lg" style={{ backgroundColor: "#eff6ff" }}>
            <Text className="text-xs font-medium" style={{ color: "#3b82f6" }}>Your Technician</Text>
            <Text className="text-sm font-semibold mt-0.5" style={{ color: "#111827" }}>
              {request.assignedToName}
            </Text>
            {request.assignedToPhone ? (
              <Text className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                {request.assignedToPhone}
              </Text>
            ) : null}
            {request.estimatedArrival ? (
              <Text className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                ETA: {request.estimatedArrival}
              </Text>
            ) : null}
          </View>
        )}

        {/* Cancel button */}
        {canCancel(request.status) && (
          <TouchableOpacity
            className="rounded-xl py-3 items-center mt-4 border"
            style={{ borderColor: "#fecaca", backgroundColor: cancelling ? "#fef2f2" : "#fff" }}
            onPress={handleCancel}
            disabled={cancelling}
            accessibilityRole="button"
            accessibilityLabel="Cancel request"
            accessibilityState={{ disabled: cancelling, busy: cancelling }}
            testID="cancel-request-button"
          >
            {cancelling ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Text className="text-sm font-semibold" style={{ color: "#ef4444" }}>
                Cancel Request
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Status History */}
        <StatusHistory history={request.statusHistory} />

        {/* Rating - show when completed */}
        {request.status === "completed" && (
          <View className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "#f9fafb" }}>
            {request.rating ? (
              <View>
                <Text className="text-sm font-medium mb-2" style={{ color: "#374151" }}>
                  Your Rating
                </Text>
                <RatingStars rating={request.rating} readonly />
                {request.ratingComment ? (
                  <Text className="text-sm mt-2" style={{ color: "#6b7280" }}>
                    {request.ratingComment}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View>
                <Text className="text-sm font-medium mb-2" style={{ color: "#374151" }}>
                  Rate this service
                </Text>
                <RatingStars rating={pendingRating} onRate={setPendingRating} />
                {pendingRating > 0 && (
                  <View className="mt-3">
                    <TextInput
                      className="border rounded-xl px-3 py-2 text-sm"
                      style={{ borderColor: "#d1d5db", color: "#111827" }}
                      placeholder="Add a comment (optional)"
                      placeholderTextColor="#9ca3af"
                      value={ratingComment}
                      onChangeText={setRatingComment}
                      accessibilityLabel="Rating comment"
                      accessibilityHint="Optionally add a comment with your rating"
                      testID="rating-comment-input"
                    />
                    <TouchableOpacity
                      className="rounded-xl py-2.5 items-center mt-2"
                      style={{ backgroundColor: submittingRating ? "#93c5fd" : "#3b82f6" }}
                      onPress={handleRate}
                      disabled={submittingRating}
                      accessibilityRole="button"
                      accessibilityLabel="Submit rating"
                      accessibilityState={{ disabled: submittingRating, busy: submittingRating }}
                      testID="submit-rating-button"
                    >
                      {submittingRating ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text className="text-white text-sm font-semibold">Submit Rating</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Chat section */}
      <View className="flex-1 border-t" style={{ borderTopColor: "#e5e7eb" }}>
        <View className="px-4 py-2" style={{ backgroundColor: "#f9fafb" }}>
          <Text className="text-sm font-medium" style={{ color: "#374151" }}>Messages</Text>
        </View>
        <ChatView
          messages={messages}
          currentUserId={user?.uid ?? ""}
          loading={messagesLoading}
          error={messagesError}
          onSend={handleSend}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
