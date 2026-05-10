import React, { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Image,
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
import { uploadChatImage, uploadChatImages } from "@/services/chatStorage";
import { MessageReplyTo } from "@/types";
import { cancelRequest, rateRequest, verifyByTenant } from "@/services/requests";
import { canCancel } from "@/utils/status";
import { showSuccess, showError } from "@/utils/toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useConfirm } from "@/hooks/useConfirm";
import { StatusTimeline } from "@/components/request/StatusTimeline";
import { StatusHistory } from "@/components/request/StatusHistory";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { ChatFAB } from "@/components/chat/ChatFAB";
import { RatingStars } from "@/components/request/RatingStars";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";
import { getRequestImages } from "@/utils/images";
import { ImageGallery } from "@/components/ui/ImageGallery";

export default function TenantRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const c = useColors();
  const { request, loading, error: requestError } = useRequest(id);
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    othersTyping,
    setTyping,
  } = useMessages(id, { currentUserId: user?.uid, currentUserName: user?.name });
  const [cancelling, setCancelling] = useState(false);
  const { confirm, confirmProps } = useConfirm();
  const [pendingRating, setPendingRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSend = async (
    text: string,
    imageUris?: string[],
    options?: { replyTo?: MessageReplyTo },
  ) => {
    if (!id || !user) return;
    try {
      let imageUrls: string[] | undefined;
      if (imageUris && imageUris.length > 0) {
        imageUrls = await uploadChatImages(imageUris, id);
      }
      await sendMessage(id, user.uid, user.name, text, imageUrls, options);
      setTyping(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to send message";
      showError("Send Failed", msg);
    }
  };

  const handleCancel = () => {
    if (!request || !id || !user || cancelling) return;
    confirm(
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

  const handleVerify = async () => {
    if (!id || !user || verifying) return;
    setVerifying(true);
    try {
      await verifyByTenant(id, user.uid, user.name);
      showSuccess("Verified — thanks!", "Your maintainer has been notified.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not verify";
      showError("Error", msg);
    } finally {
      setVerifying(false);
    }
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
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: c.background }}>
        <Text style={{ color: requestError ? c.error : c.textTertiary }}>
          {requestError ? `Error: ${requestError.message}` : "Request not found"}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ headerShown: true, title: "Request Detail" }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
      >
        <StatusTimeline currentStatus={request.status} />

        {/* Title + Edit */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: 18 }}>
          <Text
            style={{
              flex: 1,
              fontFamily: FONT.display,
              fontSize: 24,
              fontWeight: "900",
              color: c.text,
              marginRight: 12,
              letterSpacing: -0.4,
              lineHeight: 28,
            }}
          >
            {request.title}
          </Text>
          {request.status === "submitted" && (
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: palette.mustard500,
                borderWidth: BORDER.base,
                borderColor: palette.ink,
                ...SHADOW_SM,
              }}
              onPress={() => router.push(`/(tenant)/edit/${id}`)}
              accessibilityRole="button"
              accessibilityLabel="Edit request"
              testID="tenant-edit-button"
            >
              <Ionicons name="pencil" size={14} color={palette.ink} />
              <Text style={{ marginLeft: 6, fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: palette.ink, letterSpacing: 0.6 }}>
                EDIT
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 }}>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              backgroundColor: palette.ink,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
            }}
          >
            <Text style={{ fontFamily: FONT.display, fontSize: 10, fontWeight: "900", color: palette.paper, letterSpacing: 0.6 }}>
              {request.category.toUpperCase()}
            </Text>
          </View>
          {request.priority && <PriorityBadge priority={request.priority} />}
        </View>

        <Text style={{ fontFamily: FONT.body, fontSize: 14, marginTop: 16, lineHeight: 22, color: c.textBody }}>
          {request.description}
        </Text>
        {(() => {
          const imgs = getRequestImages(request);
          return imgs.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <ImageGallery uris={imgs} layout="horizontal" thumbSize={120} testIDPrefix="tenant-request-image" />
            </View>
          ) : null;
        })()}

        {/* Assignee Info */}
        {request.assignedToName && (
          <View
            style={{
              marginTop: 18,
              padding: 14,
              backgroundColor: palette.cobalt500,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              ...SHADOW_MD,
            }}
          >
            <Text style={{ fontFamily: FONT.display, fontSize: 10, fontWeight: "900", color: palette.paper, letterSpacing: 1, textTransform: "uppercase" }}>
              ◼ Your technician
            </Text>
            <Text
              style={{
                fontFamily: FONT.display,
                fontSize: 18,
                fontWeight: "900",
                marginTop: 4,
                color: palette.paper,
                letterSpacing: -0.2,
              }}
            >
              {request.assignedToName}
            </Text>
            {request.assignedToPhone ? (
              <Text style={{ fontFamily: FONT.mono, fontSize: 12, marginTop: 4, color: palette.paper, letterSpacing: 0.4 }}>
                {request.assignedToPhone}
              </Text>
            ) : null}
            {request.estimatedArrival ? (
              <Text style={{ fontFamily: FONT.mono, fontSize: 12, marginTop: 2, color: palette.paper, letterSpacing: 0.4 }}>
                ETA · {request.estimatedArrival}
              </Text>
            ) : null}
          </View>
        )}

        {/* Cancel button */}
        {canCancel(request.status) && (
          <TouchableOpacity
            style={{
              marginTop: 18,
              paddingVertical: 14,
              alignItems: "center",
              backgroundColor: palette.tomato500,
              borderWidth: BORDER.heavy,
              borderColor: palette.ink,
              ...SHADOW_MD,
              opacity: cancelling ? 0.7 : 1,
            }}
            onPress={handleCancel}
            disabled={cancelling}
            accessibilityRole="button"
            accessibilityLabel="Cancel request"
            accessibilityState={{ disabled: cancelling, busy: cancelling }}
            testID="cancel-request-button"
          >
            {cancelling ? (
              <ActivityIndicator color={palette.paper} />
            ) : (
              <Text style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: "900", color: palette.paper, letterSpacing: 1, textTransform: "uppercase" }}>
                Cancel request
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Status History */}
        <StatusHistory history={request.statusHistory} />

        {/* Verify button — completed but not yet verified */}
        {request.status === "completed" && (
          <View
            style={{
              marginTop: 18,
              padding: 14,
              backgroundColor: palette.mustard50,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              ...SHADOW_SM,
            }}
            testID="awaiting-confirmation-banner"
          >
            <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: palette.ink, letterSpacing: 0.6, textTransform: "uppercase" }}>
              ◼ Awaiting your confirmation
            </Text>
            <Text style={{ marginTop: 6, fontFamily: FONT.body, fontSize: 13, color: palette.ink, lineHeight: 18 }}>
              Tap below if the work was done correctly. This closes the request.
            </Text>
            <TouchableOpacity
              style={{
                marginTop: 12,
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                backgroundColor: verifying ? palette.lime300 : palette.lime500,
                borderWidth: BORDER.heavy,
                borderColor: palette.ink,
                ...SHADOW_MD,
              }}
              onPress={handleVerify}
              disabled={verifying}
              accessibilityRole="button"
              accessibilityLabel="Confirm work was done correctly"
              testID="tenant-verify-button"
            >
              {verifying ? (
                <ActivityIndicator color={palette.ink} />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color={palette.ink} />
                  <Text
                    style={{
                      marginLeft: 8,
                      color: palette.ink,
                      fontFamily: FONT.display,
                      fontSize: 14,
                      fontWeight: "900",
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                    }}
                  >
                    Confirm work was done correctly
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Verified banner */}
        {request.status === "verified" && (
          <View
            style={{
              marginTop: 18,
              padding: 14,
              backgroundColor: palette.lime500,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              flexDirection: "row",
              alignItems: "center",
              ...SHADOW_SM,
            }}
            testID="verified-banner"
          >
            <Ionicons name="shield-checkmark" size={18} color={palette.ink} />
            <Text style={{ marginLeft: 10, fontFamily: FONT.display, fontSize: 13, fontWeight: "900", color: palette.ink, letterSpacing: 0.4, textTransform: "uppercase" }}>
              Verified — request closed
            </Text>
          </View>
        )}

        {/* Rating - show when completed or verified */}
        {(request.status === "completed" || request.status === "verified") && (
          <View
            style={{
              marginTop: 18,
              padding: 16,
              backgroundColor: c.surface,
              borderWidth: BORDER.heavy,
              borderColor: palette.ink,
              ...SHADOW_MD,
            }}
          >
            {request.rating ? (
              <View>
                <Text style={{ fontFamily: FONT.display, fontSize: 12, fontWeight: "900", color: c.text, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>
                  ◼ Your rating
                </Text>
                <RatingStars rating={request.rating} readonly />
                {request.ratingComment ? (
                  <Text style={{ fontFamily: FONT.body, fontSize: 13, marginTop: 10, color: c.textBody, lineHeight: 18 }}>
                    "{request.ratingComment}"
                  </Text>
                ) : null}
              </View>
            ) : (
              <View>
                <Text style={{ fontFamily: FONT.display, fontSize: 12, fontWeight: "900", color: c.text, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>
                  ◼ Rate this service
                </Text>
                <RatingStars rating={pendingRating} onRate={setPendingRating} />
                {pendingRating > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <TextInput
                      style={{
                        borderWidth: BORDER.base,
                        borderColor: palette.ink,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontFamily: FONT.body,
                        fontSize: 14,
                        color: c.text,
                        backgroundColor: c.background,
                      }}
                      placeholder="Add a comment (optional)"
                      placeholderTextColor={c.textMuted}
                      value={ratingComment}
                      onChangeText={setRatingComment}
                      accessibilityLabel="Rating comment"
                      accessibilityHint="Optionally add a comment with your rating"
                      testID="rating-comment-input"
                    />
                    <TouchableOpacity
                      style={{
                        marginTop: 10,
                        paddingVertical: 14,
                        alignItems: "center",
                        backgroundColor: submittingRating ? palette.cobalt300 : palette.cobalt500,
                        borderWidth: BORDER.base,
                        borderColor: palette.ink,
                        ...SHADOW_SM,
                      }}
                      onPress={handleRate}
                      disabled={submittingRating}
                      accessibilityRole="button"
                      accessibilityLabel="Submit rating"
                      accessibilityState={{ disabled: submittingRating, busy: submittingRating }}
                      testID="submit-rating-button"
                    >
                      {submittingRating ? (
                        <ActivityIndicator color={palette.paper} size="small" />
                      ) : (
                        <Text style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: "900", color: palette.paper, letterSpacing: 0.8, textTransform: "uppercase" }}>
                          Submit rating
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Chat FAB + bottom sheet overlay */}
      <ChatFAB
        messages={messages}
        currentUserId={user?.uid ?? ""}
        currentUserRole={user?.role}
        loading={messagesLoading}
        error={messagesError}
        onSend={handleSend}
        requestId={id}
        othersTyping={othersTyping}
        onTypingChange={setTyping}
      />
      <ConfirmModal {...confirmProps} />
    </View>
  );
}
