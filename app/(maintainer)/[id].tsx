import React, { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { showError, showSuccess } from "@/utils/toast";
import { useLocalSearchParams, Stack } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useRequest } from "@/hooks/useRequest";
import { useMessages } from "@/hooks/useMessages";
import { startWork, completeRequest, putOnHold, resumeRequest } from "@/services/requests";
import { sendMessage } from "@/services/messages";
import { uploadChatImage } from "@/services/chatStorage";
import { StatusTimeline } from "@/components/request/StatusTimeline";
import { StatusHistory } from "@/components/request/StatusHistory";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { ChatFAB } from "@/components/chat/ChatFAB";
import { RatingStars } from "@/components/request/RatingStars";
import { getStatusColor } from "@/utils/status";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useConfirm } from "@/hooks/useConfirm";
import { useColors } from "@/hooks/useColors";
import { withOpacity } from "@/utils/color";

export default function MaintainerTaskDetailScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { request, loading, error: requestError } = useRequest(id);
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    othersTyping,
    setTyping,
  } = useMessages(id, { currentUserId: user?.uid, currentUserName: user?.name });
  const [updating, setUpdating] = useState(false);
  const { confirm, confirmProps } = useConfirm();

  const tenantId = request?.tenantId;
  const jobTitle = request?.title;

  const handleAccept = () => {
    if (!request || !id || !user) return;
    confirm("Accept Task", "Start work on this request?", async () => {
      setUpdating(true);
      try {
        await startWork(id, request.status, user.uid, user.name, tenantId, jobTitle);
        showSuccess("Started", "The tenant has been notified.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to start";
        showError("Error", msg);
      } finally {
        setUpdating(false);
      }
    });
  };

  const handleComplete = () => {
    if (!request || !id || !user) return;
    confirm("Mark complete", "Confirm the work is done?", async () => {
      setUpdating(true);
      try {
        await completeRequest(id, request.status, user.uid, user.name, tenantId, jobTitle);
        showSuccess("Completed", "Tenant has been asked to rate the service.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to complete";
        showError("Error", msg);
      } finally {
        setUpdating(false);
      }
    });
  };

  const handleHold = () => {
    if (!request || !id || !user) return;
    confirm("Put on hold", "Pause this task?", async () => {
      setUpdating(true);
      try {
        await putOnHold(id, request.status, user.uid, user.name, "maintainer", undefined, tenantId, jobTitle);
        showSuccess("Paused");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed";
        showError("Error", msg);
      } finally {
        setUpdating(false);
      }
    });
  };

  const handleResume = () => {
    if (!request || !id || !user) return;
    confirm("Resume task", "Continue work?", async () => {
      setUpdating(true);
      try {
        await resumeRequest(id, "in_progress", user.uid, user.name, "maintainer", tenantId, jobTitle);
        showSuccess("Resumed");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed";
        showError("Error", msg);
      } finally {
        setUpdating(false);
      }
    });
  };

  const handleSend = async (text: string, imageUri?: string) => {
    if (!id || !user) return;
    try {
      let imageUrl: string | undefined;
      if (imageUri) {
        imageUrl = await uploadChatImage(imageUri, id);
      }
      await sendMessage(id, user.uid, user.name, text, imageUrl);
      setTyping(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to send message";
      showError("Send Failed", msg);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background }}>
        <Text style={{ color: requestError ? c.error : c.textTertiary }}>
          {requestError ? `Error: ${requestError.message}` : "Task not found"}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ headerShown: true, title: "Task Detail" }} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
        <StatusTimeline currentStatus={request.status} />

        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 10, marginBottom: 8, backgroundColor: c.surface }}>
          <Ionicons name="person-outline" size={14} color={c.textTertiary} />
          <Text style={{ marginLeft: 6, fontSize: 13, color: c.textTertiary }}>
            Tenant: <Text style={{ color: c.text, fontWeight: "700" }}>{request.tenantName}</Text>
            {request.tenantUnit ? <Text> · Unit {request.tenantUnit}</Text> : null}
          </Text>
        </View>

        <Text style={{ fontSize: 20, fontWeight: "800", color: c.text }}>{request.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: c.surfaceAlt, marginRight: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: c.textSecondary }}>{request.category}</Text>
          </View>
          {request.priority && <PriorityBadge priority={request.priority} />}
        </View>
        <Text style={{ fontSize: 14, marginTop: 12, lineHeight: 22, color: c.textBody }}>
          {request.description}
        </Text>

        {request.imageUrl && (
          <Image source={{ uri: request.imageUrl }} style={{ width: "100%", height: 180, borderRadius: 14, marginTop: 12 }} resizeMode="cover" />
        )}

        {/* Action Buttons */}
        <View style={{ marginTop: 18 }}>
          {request.status === "assigned" && (
            <>
              <ActionButton onPress={handleAccept} updating={updating} label="Accept task" tint={getStatusColor("in_progress")} icon="play" colors={c} testID="accept-task-button" />
              <ActionButton onPress={handleHold} updating={updating} label="Put on hold" tint={getStatusColor("on_hold")} icon="pause" colors={c} testID="put-on-hold-button" />
            </>
          )}
          {request.status === "in_progress" && (
            <>
              <ActionButton onPress={handleComplete} updating={updating} label="Mark complete" tint={getStatusColor("completed")} icon="checkmark-circle" colors={c} testID="mark-complete-button" />
              <ActionButton onPress={handleHold} updating={updating} label="Put on hold" tint={getStatusColor("on_hold")} icon="pause" colors={c} testID="put-on-hold-button" />
            </>
          )}
          {request.status === "on_hold" && (
            <ActionButton onPress={handleResume} updating={updating} label="Resume task" tint={getStatusColor("in_progress")} icon="play" colors={c} testID="resume-task-button" />
          )}
        </View>

        {/* Cost & payment summary */}
        {request.cost && (
          <View
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 16,
              backgroundColor: request.payment?.status === "paid" ? c.successBg : c.warningBg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={request.payment?.status === "paid" ? "checkmark-circle" : "wallet-outline"}
                size={20}
                color={request.payment?.status === "paid" ? c.success : c.warning}
              />
              <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: "800", color: c.text }}>
                {request.payment?.status === "paid" ? "Paid" : "Awaiting payment"}
              </Text>
            </View>
            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: withOpacity(c.text, 0.06) }}>
              <CostRow label={`Labor (${request.cost.laborHours}h × RM${request.cost.hourlyRate.toFixed(0)})`} value={`RM ${(request.cost.laborHours * request.cost.hourlyRate).toFixed(2)}`} colors={c} />
              <CostRow label="Materials" value={`RM ${request.cost.materialCost.toFixed(2)}`} colors={c} />
              <CostRow label="Total" value={`RM ${request.cost.total.toFixed(2)}`} bold colors={c} />
              {request.payment?.reference && (
                <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 6 }}>Ref: {request.payment.reference}</Text>
              )}
            </View>
          </View>
        )}

        {request.status === "completed" && (
          <View style={{ marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: c.successBg }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.success }}>Completed</Text>
            {request.rating ? (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: c.textTertiary, marginBottom: 4 }}>Tenant rating</Text>
                <RatingStars rating={request.rating} readonly size={20} />
                {request.ratingComment ? (
                  <Text style={{ fontSize: 12, color: c.textTertiary, marginTop: 4 }}>
                    &quot;{request.ratingComment}&quot;
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: c.textTertiary, marginTop: 4 }}>Awaiting tenant rating</Text>
            )}
          </View>
        )}

        {request.statusHistory.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <StatusHistory history={request.statusHistory} />
          </View>
        )}
      </ScrollView>

      <ChatFAB
        messages={messages}
        currentUserId={user?.uid ?? ""}
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

interface ActionButtonProps {
  onPress: () => void;
  updating: boolean;
  label: string;
  tint: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useColors>;
  testID?: string;
}

function ActionButton({ onPress, updating, label, tint, icon, colors: c, testID }: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={{ borderRadius: 14, paddingVertical: 14, marginBottom: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", backgroundColor: updating ? c.borderLight : tint }}
      onPress={onPress}
      disabled={updating}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: updating, busy: updating }}
      testID={testID}
    >
      {updating ? <ActivityIndicator color={c.background} /> : (
        <>
          <Ionicons name={icon} size={16} color={c.background} />
          <Text style={{ marginLeft: 6, color: c.background, fontSize: 14, fontWeight: "700" }}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

interface CostRowProps {
  label: string;
  value: string;
  bold?: boolean;
  colors: ReturnType<typeof useColors>;
}

function CostRow({ label, value, bold, colors: c }: CostRowProps) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
      <Text style={{ fontSize: 12, fontWeight: bold ? "800" : "500", color: bold ? c.text : c.textTertiary }}>{label}</Text>
      <Text style={{ fontSize: bold ? 15 : 12, fontWeight: bold ? "800" : "600", color: bold ? c.success : c.text }}>{value}</Text>
    </View>
  );
}
