import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Timestamp } from "firebase/firestore";
import { showError, showSuccess } from "@/utils/toast";
import { useLocalSearchParams, Stack } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useRequest } from "@/hooks/useRequest";
import { useMessages } from "@/hooks/useMessages";
import {
  assignRequest,
  putOnHold,
  resumeRequest,
  setPriority,
  scheduleRequest,
} from "@/services/requests";
import { DateTimePickerSheet } from "@/components/ui/DateTimePickerSheet";
import { setRequestCost, payMaintainer, refundPayment, markPaymentPending } from "@/services/payments";
import { sendMessage } from "@/services/messages";
import { uploadChatImage, uploadChatImages } from "@/services/chatStorage";
import { MessageReplyTo } from "@/types";
import { addNote } from "@/services/notes";
import { useNotes } from "@/hooks/useNotes";
import { useMaintainers } from "@/hooks/useMaintainers";
import { StatusTimeline } from "@/components/request/StatusTimeline";
import { StatusHistory } from "@/components/request/StatusHistory";
import { NotesList } from "@/components/notes/NotesList";
import { NoteInput } from "@/components/notes/NoteInput";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { ChatFAB } from "@/components/chat/ChatFAB";
import { RatingStars } from "@/components/request/RatingStars";
import { CostBreakdownEditor } from "@/components/payment/CostBreakdownEditor";
import { PaymentDialog } from "@/components/payment/PaymentDialog";
import { User, RequestPriority, PaymentMethod, RequestPayment } from "@/types";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useConfirm } from "@/hooks/useConfirm";
import { useColors } from "@/hooks/useColors";
import { getRequestImages } from "@/utils/images";
import { ImageGallery } from "@/components/ui/ImageGallery";
import { getPriorityColor, getPriorityLabel, PRIORITY_ORDER } from "@/utils/priority";
import { withOpacity } from "@/utils/color";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";
import { formatLongDate } from "@/utils/time";
import {
  slaRemainingMs,
  slaSeverity,
  formatSlaRemaining,
  effectiveResolutionAt,
} from "@/utils/sla";

export default function ManagerRequestDetailScreen() {
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
  const { notes, loading: notesLoading, error: notesError } = useNotes(id);
  const { maintainers, loading: maintainersLoading, error: maintainersError } = useMaintainers();
  const [updating, setUpdating] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const { confirm, confirmProps } = useConfirm();
  const [selectedMaintainer, setSelectedMaintainer] = useState<User | null>(null);
  const [assignPhone, setAssignPhone] = useState("");
  const [assignEta, setAssignEta] = useState("");
  const [costSaving, setCostSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [optimisticPayment, setOptimisticPayment] = useState<RequestPayment | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const tenantId = request?.tenantId;
  const jobTitle = request?.title;
  const effectivePayment = optimisticPayment ?? request?.payment;

  useEffect(() => {
    setOptimisticPayment(null);
  }, [id]);

  useEffect(() => {
    if (!optimisticPayment) return;
    if (request?.payment?.status === optimisticPayment.status) {
      setOptimisticPayment(null);
    }
  }, [optimisticPayment, request?.payment?.status]);

  const handleAddNote = useCallback(async (text: string) => {
    if (!id || !user) return;
    try {
      await addNote(id, user.uid, user.name, text);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to add note";
      showError("Error", msg);
    }
  }, [id, user]);

  const handleAssign = async () => {
    if (!request || !id || !selectedMaintainer || !user) return;
    setUpdating(true);
    try {
      await assignRequest(
        id,
        request.status,
        selectedMaintainer.uid,
        selectedMaintainer.name,
        assignPhone.trim() || selectedMaintainer.phone || "",
        assignEta.trim(),
        user.uid,
        user.name,
        tenantId,
        jobTitle,
      );
      showSuccess("Assigned", `${selectedMaintainer.name} has been notified.`);
      setShowAssignForm(false);
      setSelectedMaintainer(null);
      setAssignPhone("");
      setAssignEta("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to assign";
      showError("Error", message);
    } finally {
      setUpdating(false);
    }
  };

  const handlePutOnHold = () => {
    if (!request || !id || !user) return;
    confirm("Put On Hold", "Pause this request?", async () => {
      setUpdating(true);
      try {
        await putOnHold(id, request.status, user.uid, user.name, "manager", undefined, tenantId, jobTitle);
        showSuccess("On hold");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed";
        showError("Error", message);
      } finally {
        setUpdating(false);
      }
    });
  };

  const handleResume = () => {
    if (!request || !id || !user) return;
    confirm("Resume Request", "Continue this request?", async () => {
      setUpdating(true);
      try {
        await resumeRequest(id, "assigned", user.uid, user.name, "manager", tenantId, jobTitle);
        showSuccess("Resumed");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed";
        showError("Error", message);
      } finally {
        setUpdating(false);
      }
    });
  };

  const handleSetPriority = async (p: RequestPriority) => {
    if (!request || !id || !user || p === request.priority) return;
    setUpdating(true);
    try {
      await setPriority(id, p, user.uid, user.name);
      showSuccess("Priority updated", `Set to ${getPriorityLabel(p)}.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      showError("Error", msg);
    } finally {
      setUpdating(false);
    }
  };

  const handleSetCost = async (laborHours: number, hourlyRate: number, materialCost: number) => {
    if (!request || !id || !user) return;
    setCostSaving(true);
    try {
      await setRequestCost(id, laborHours, hourlyRate, materialCost, user.uid, user.name);
      showSuccess("Cost saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      showError("Error", msg);
    } finally {
      setCostSaving(false);
    }
  };

  const handlePaymentSubmit = async (
    action: "pay" | "mark_pending",
    method: PaymentMethod,
  ) => {
    if (!request || !id || !user || !request.cost || !request.assignedTo || !request.assignedToName) {
      showError("Cannot pay", "Cost or assignee missing.");
      throw new Error("missing");
    }
    try {
      if (action === "pay") {
        const paid = await payMaintainer(
          id,
          request.cost.total,
          method,
          user.uid,
          user.name,
          request.assignedTo,
          request.assignedToName,
        );
        setOptimisticPayment(paid);
        showSuccess(
          "Payment sent",
          `Reference ${paid.reference ?? "—"}`,
        );
      } else {
        const pendingPayment: RequestPayment = {
          status: "pending",
          method,
          amount: Math.round(request.cost.total * 100) / 100,
          paidAt: Timestamp.now(),
          paidBy: user.uid,
          paidByName: user.name,
        };
        await markPaymentPending(
          id,
          request.cost.total,
          method,
          user.uid,
          user.name,
        );
        setOptimisticPayment(pendingPayment);
        showSuccess("Marked as pending", "Confirm in your bank app");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      showError("Error", msg);
      throw e;
    }
  };

  const handleSchedule = async (date: Date) => {
    if (!request || !id || !user) return;
    setScheduling(true);
    try {
      await scheduleRequest(id, date, user.uid, user.name, "manager");
      showSuccess("Scheduled", `Appointment set for ${date.toLocaleString()}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not schedule";
      showError("Schedule failed", msg);
    } finally {
      setScheduling(false);
    }
  };

  const handleRefund = async () => {
    if (!request || !id || !user || refunding) return;
    if (effectivePayment?.status !== "paid") return;
    setRefunding(true);
    try {
      const refunded = await refundPayment(id, user.uid, user.name, refundReason.trim() || undefined);
      setOptimisticPayment(refunded);
      showSuccess("Refunded", `Payment of RM ${refunded.amount.toFixed(2)} has been reversed`);
      setRefundOpen(false);
      setRefundReason("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Refund failed";
      showError("Refund failed", msg);
    } finally {
      setRefunding(false);
    }
  };

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
          {requestError ? `Error: ${requestError.message}` : "Request not found"}
        </Text>
      </View>
    );
  }

  const canEditCost = request.status === "completed";
  const paymentStatus = effectivePayment?.status;
  const isPaid = paymentStatus === "paid";
  const isRefunded = paymentStatus === "refunded";
  const isPending = paymentStatus === "pending";
  const canPay =
    !!request.cost && !isPaid && !isRefunded && !!request.assignedTo;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ headerShown: true, title: "Manage Request" }} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
        <StatusTimeline currentStatus={request.status} />

        {/* SLA progress bar (manager-only) */}
        {request.sla && request.status !== "verified" && request.status !== "cancelled" && (() => {
          const now = Date.now();
          const created = request.createdAt?.toMillis ? request.createdAt.toMillis() : now;
          const target = effectiveResolutionAt(request.sla, new Date(now));
          const elapsed = Math.max(0, now - created);
          const totalWindow = Math.max(1, target - created);
          const ratio = Math.min(1, Math.max(0, elapsed / totalWindow));
          const remaining = slaRemainingMs(request.sla);
          const severity = slaSeverity(request.sla);
          const paused = !!request.sla.pausedAt;
          const barColor = paused
            ? palette.ink400
            : severity === "breached"
              ? palette.tomato500
              : severity === "danger"
                ? "#F97316"
                : severity === "warning"
                  ? palette.mustard500
                  : palette.lime500;
          return (
            <View
              style={{
                marginTop: 14,
                padding: 12,
                borderWidth: BORDER.base,
                borderColor: palette.ink,
                backgroundColor: c.surface,
                ...SHADOW_SM,
              }}
              testID="manager-sla-bar"
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: palette.ink, letterSpacing: 0.6, textTransform: "uppercase" }}>
                  ◼ Resolution due
                </Text>
                <Text style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: "700", color: severity === "breached" ? palette.tomato500 : palette.ink, letterSpacing: 0.3 }}>
                  {paused ? "PAUSED" : formatSlaRemaining(remaining)}
                </Text>
              </View>
              <Text style={{ marginTop: 4, fontFamily: FONT.body, fontSize: 12, color: c.textBody }}>
                {new Date(target).toLocaleString()}
              </Text>
              <View
                style={{
                  marginTop: 10,
                  height: 14,
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                  backgroundColor: palette.cream100,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${ratio * 100}%`,
                    height: "100%",
                    backgroundColor: barColor,
                  }}
                />
              </View>
            </View>
          );
        })()}

        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 8, marginBottom: 8, backgroundColor: c.surface }}>
          <Ionicons name="person-outline" size={14} color={c.textTertiary} />
          <Text style={{ marginLeft: 6, fontSize: 13, color: c.textTertiary }}>
            By <Text style={{ color: c.text, fontWeight: "700" }}>{request.tenantName}</Text>
            {request.tenantUnit ? <Text> · Unit {request.tenantUnit}</Text> : null}
          </Text>
        </View>

        <Text style={{ fontSize: 20, fontWeight: "800", color: c.text }}>{request.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: c.surfaceAlt, marginRight: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: c.textSecondary }}>{request.category}</Text>
          </View>
          {request.priority && <PriorityBadge priority={request.priority} />}
          {(request.prioritySuggestion?.source === "system_triage" || request.prioritySuggestion?.source === "auto") && (
            <View style={{ marginLeft: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: c.violetBg, flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="git-network-outline" size={11} color={c.violet} />
              <Text style={{ marginLeft: 4, fontSize: 10, fontWeight: "700", color: c.violet }}>System triage</Text>
            </View>
          )}
        </View>
        {request.prioritySuggestion?.reason && (
          <Text style={{ fontSize: 11, color: c.textTertiary, marginTop: 4, fontStyle: "italic" }}>
            {request.prioritySuggestion.reason}
          </Text>
        )}

        <Text style={{ fontSize: 14, marginTop: 12, lineHeight: 22, color: c.textBody }}>
          {request.description}
        </Text>

        {(() => {
          const imgs = getRequestImages(request);
          return imgs.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              <ImageGallery uris={imgs} layout="horizontal" thumbSize={110} testIDPrefix="manager-request-image" />
            </View>
          ) : null;
        })()}

        {/* Priority override */}
        {request.status !== "completed" && request.status !== "cancelled" && (
          <View style={{ marginTop: 18 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 8 }}>
              Override priority
            </Text>
            <View style={{ flexDirection: "row" }}>
              {PRIORITY_ORDER.map((p) => {
                const selected = request.priority === p;
                const color = getPriorityColor(p);
                return (
                  <TouchableOpacity
                    key={p}
                    style={{
                      flex: 1,
                      marginRight: p === "low" ? 0 : 8,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: selected ? color : c.borderLight,
                      backgroundColor: selected ? withOpacity(color, 0.1) : c.background,
                      alignItems: "center",
                    }}
                    onPress={() => handleSetPriority(p)}
                    disabled={updating}
                    accessibilityRole="button"
                    accessibilityLabel={`Set priority to ${p}`}
                    accessibilityState={{ selected }}
                    testID={`priority-${p}`}
                  >
                    <Text style={{ fontSize: 12, fontWeight: selected ? "800" : "600", color: selected ? color : c.textSecondary }}>
                      {getPriorityLabel(p)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Assignee Info */}
        {request.assignedToName && (
          <View style={{ marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: c.primaryBg }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: c.primary }}>Assigned to</Text>
            <Text style={{ fontSize: 14, fontWeight: "800", color: c.text, marginTop: 2 }}>{request.assignedToName}</Text>
            {request.assignedToPhone && (
              <Text style={{ fontSize: 11, color: c.textTertiary, marginTop: 2 }}>{request.assignedToPhone}</Text>
            )}
            {request.estimatedArrival && (
              <Text style={{ fontSize: 11, color: c.textTertiary, marginTop: 2 }}>ETA: {request.estimatedArrival}</Text>
            )}
            {request.resolvedAt && (
              <Text style={{ fontSize: 11, color: c.success, marginTop: 6, fontWeight: "600" }}>
                <Ionicons name="checkmark-circle" size={11} color={c.success} /> Resolved {formatLongDate(request.resolvedAt)}
              </Text>
            )}
          </View>
        )}

        {/* Assignment form */}
        {request.status === "submitted" && (
          <View style={{ marginTop: 18 }}>
            {!showAssignForm ? (
              <TouchableOpacity
                style={{ borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", backgroundColor: c.primary }}
                onPress={() => setShowAssignForm(true)}
                accessibilityRole="button"
                accessibilityLabel="Assign request"
                testID="assign-request-button"
              >
                <Ionicons name="person-add" size={16} color={c.background} />
                <Text style={{ marginLeft: 6, color: c.background, fontWeight: "700" }}>Assign request</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.borderLight }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSecondary, marginBottom: 8 }}>Select maintainer</Text>
                {maintainersLoading ? (
                  <ActivityIndicator size="small" color={c.primary} />
                ) : maintainersError ? (
                  <Text style={{ color: c.error, fontSize: 12 }}>Failed to load maintainers</Text>
                ) : maintainers.length === 0 ? (
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>No maintainers registered yet.</Text>
                ) : (
                  (selectedMaintainer ? [selectedMaintainer] : maintainers).map((m) => {
                    const selected = selectedMaintainer?.uid === m.uid;
                    return (
                      <TouchableOpacity
                        key={m.uid}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 8,
                          borderRadius: 10,
                          marginBottom: 6,
                          backgroundColor: selected ? c.primaryBg : c.surface,
                          borderWidth: selected ? 1.5 : 0,
                          borderColor: c.primary,
                        }}
                        onPress={() => {
                          setSelectedMaintainer(m);
                          setAssignPhone(m.phone || "");
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${m.name}`}
                        accessibilityState={{ selected }}
                      >
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.primaryBadgeBg, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontWeight: "800", color: c.primary, fontSize: 13 }}>{m.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ fontWeight: "700", color: c.text, fontSize: 13 }}>{m.name}</Text>
                          {m.phone && <Text style={{ color: c.textTertiary, fontSize: 11 }}>{m.phone}</Text>}
                        </View>
                        {m.specialties && m.specialties.includes(request.category) && (
                          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: c.successBg }}>
                            <Text style={{ fontSize: 9, fontWeight: "700", color: c.success }}>SPECIALIST</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
                {selectedMaintainer && (
                  <View style={{ marginTop: 10 }}>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: c.text, marginBottom: 8 }}
                      placeholder="Phone (optional)"
                      placeholderTextColor={c.textMuted}
                      value={assignPhone}
                      onChangeText={setAssignPhone}
                      keyboardType="phone-pad"
                      accessibilityLabel="Maintainer phone"
                      testID="assign-phone-input"
                    />
                    <TextInput
                      style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: c.text, marginBottom: 8 }}
                      placeholder="ETA (e.g. Today 3PM)"
                      placeholderTextColor={c.textMuted}
                      value={assignEta}
                      onChangeText={setAssignEta}
                      accessibilityLabel="ETA"
                      testID="assign-eta-input"
                    />
                    <TouchableOpacity
                      style={{
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                        backgroundColor: updating ? c.primaryLight : c.primary,
                        position: "relative",
                        zIndex: 20,
                        elevation: 20,
                      }}
                      onPress={handleAssign}
                      disabled={updating}
                      accessibilityRole="button"
                      accessibilityLabel="Confirm assignment"
                      testID="confirm-assignment-button"
                    >
                      {updating ? <ActivityIndicator color={c.background} /> : (
                        <View pointerEvents="none">
                          <Text style={{ color: c.background, fontWeight: "700" }}>Confirm assignment</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  style={{ paddingVertical: 8, alignItems: "center", marginTop: 8 }}
                  onPress={() => { setShowAssignForm(false); setSelectedMaintainer(null); }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel assignment"
                  testID="cancel-assignment-button"
                >
                  <Text style={{ color: c.textTertiary, fontSize: 12 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Schedule / Reschedule */}
        {(request.status === "assigned" || request.status === "scheduled") && (
          <TouchableOpacity
            style={{
              marginTop: 14,
              paddingVertical: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              backgroundColor: palette.sky500,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              ...SHADOW_SM,
              opacity: scheduling ? 0.7 : 1,
            }}
            onPress={() => setScheduleOpen(true)}
            disabled={scheduling}
            accessibilityRole="button"
            accessibilityLabel={request.status === "scheduled" ? "Reschedule appointment" : "Schedule appointment"}
            testID="manager-schedule-button"
          >
            <Ionicons name="calendar" size={16} color={palette.paper} />
            <Text style={{ marginLeft: 8, color: palette.paper, fontFamily: FONT.display, fontSize: 13, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" }}>
              {request.status === "scheduled" ? "Reschedule appointment" : "Schedule appointment"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Scheduled banner */}
        {request.scheduledFor ? (
          <View
            style={{
              marginTop: 14,
              padding: 12,
              backgroundColor: palette.sky50,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              flexDirection: "row",
              alignItems: "center",
              ...SHADOW_SM,
            }}
            testID="scheduled-banner"
          >
            <Ionicons name="calendar-outline" size={18} color={palette.ink} />
            <Text style={{ marginLeft: 10, fontFamily: FONT.body, fontSize: 13, color: palette.ink, flex: 1 }}>
              Scheduled for {request.scheduledFor.toDate().toLocaleString()}
            </Text>
          </View>
        ) : null}

        {/* Hold/Resume */}
        {(request.status === "assigned" || request.status === "scheduled" || request.status === "in_progress") && (
          <TouchableOpacity
            style={{ marginTop: 14, paddingVertical: 12, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", borderWidth: 1, borderColor: c.violetBorder, backgroundColor: updating ? c.violetBg : c.background }}
            onPress={handlePutOnHold}
            disabled={updating}
            accessibilityRole="button"
            accessibilityLabel="Put on hold"
            testID="put-on-hold-button"
          >
            {updating ? <ActivityIndicator color={c.violet} /> : (
              <>
                <Ionicons name="pause-circle-outline" size={16} color={c.violet} />
                <Text style={{ marginLeft: 6, color: c.violet, fontWeight: "700", fontSize: 13 }}>Put on hold</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {request.status === "on_hold" && (
          <TouchableOpacity
            style={{ marginTop: 14, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: updating ? c.borderLight : c.primary }}
            onPress={handleResume}
            disabled={updating}
            accessibilityRole="button"
            accessibilityLabel="Resume request"
            testID="resume-request-button"
          >
            {updating ? <ActivityIndicator color={c.background} /> : (
              <Text style={{ color: c.background, fontWeight: "700", fontSize: 13 }}>Resume request</Text>
            )}
          </TouchableOpacity>
        )}

        <StatusHistory history={request.statusHistory} />

        {/* Completed: rating display */}
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

        {/* Cost editor (only when completed) */}
        {canEditCost && request.assignedTo && (
          <CostBreakdownEditor
            initial={request.cost}
            onSave={handleSetCost}
            saving={costSaving}
          />
        )}

        {/* Cost summary — state-aware: unpaid / pending / paid / refunded */}
        {request.cost && (
          <View
            style={{
              marginTop: 14,
              padding: 14,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              backgroundColor: isPaid
                ? palette.lime50
                : isRefunded
                  ? c.surfaceAlt
                  : isPending
                    ? palette.mustard50
                    : palette.mustard50,
              ...SHADOW_SM,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={
                  isPaid ? "checkmark-circle" :
                  isRefunded ? "arrow-undo" :
                  isPending ? "hourglass" :
                  "wallet"
                }
                size={18}
                color={isPaid ? palette.lime700 : isRefunded ? palette.ink400 : palette.mustard700}
              />
              <Text
                style={{
                  marginLeft: 8,
                  fontFamily: FONT.display,
                  fontSize: 13,
                  fontWeight: "900",
                  color: isRefunded ? palette.ink500 : c.text,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                {isRefunded
                  ? `Refunded · ${formatLongDate(effectivePayment?.refundedAt)}`
                  : isPaid
                    ? `Paid · ${formatLongDate(effectivePayment?.paidAt)}`
                    : isPending
                      ? `Pending · ${formatLongDate(effectivePayment?.paidAt)}`
                      : "Unpaid"}
              </Text>
            </View>
            <Text
              style={{
                marginTop: 6,
                fontFamily: FONT.mono,
                fontSize: 12,
                color: isRefunded ? palette.ink400 : c.textBody,
                letterSpacing: 0.2,
                textDecorationLine: isRefunded ? "line-through" : "none",
              }}
            >
              Total RM {request.cost.total.toFixed(2)}
              {effectivePayment?.reference ? ` · Ref ${effectivePayment.reference}` : ""}
            </Text>
            {isRefunded && (
              <View
                style={{
                  marginTop: 8,
                  padding: 10,
                  borderWidth: 1.5,
                  borderColor: palette.ink400,
                  backgroundColor: palette.paper,
                }}
              >
                <Text style={{ fontFamily: FONT.display, fontSize: 10, fontWeight: "900", color: palette.ink500, letterSpacing: 0.6, textTransform: "uppercase" }}>
                  ◼ Reversed by {effectivePayment?.refundedByName ?? "manager"}
                </Text>
                {effectivePayment?.refundReason ? (
                  <Text style={{ marginTop: 4, fontFamily: FONT.body, fontSize: 12, color: palette.ink600, lineHeight: 16 }}>
                    {effectivePayment.refundReason}
                  </Text>
                ) : null}
              </View>
            )}
            {canPay && (
              <TouchableOpacity
                style={{
                  marginTop: 10,
                  paddingVertical: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  backgroundColor: palette.cobalt500,
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                  ...SHADOW_SM,
                }}
                onPress={() => setPaymentOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={isPending ? "Confirm payment received" : "Pay maintainer"}
                testID="pay-maintainer-button"
              >
                <Ionicons name="card" size={14} color={palette.paper} />
                <Text
                  style={{
                    marginLeft: 8,
                    color: palette.paper,
                    fontFamily: FONT.display,
                    fontSize: 13,
                    fontWeight: "900",
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}
                >
                  {isPending ? "Confirm payment received" : `Pay ${request.assignedToName} — RM ${request.cost.total.toFixed(2)}`}
                </Text>
              </TouchableOpacity>
            )}
            {isPaid && (
              <TouchableOpacity
                style={{
                  marginTop: 10,
                  paddingVertical: 11,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  backgroundColor: palette.paper,
                  borderWidth: BORDER.base,
                  borderColor: palette.tomato500,
                }}
                onPress={() => setRefundOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Refund payment"
                testID="manager-refund-button"
              >
                <Ionicons name="arrow-undo-outline" size={14} color={palette.tomato500} />
                <Text
                  style={{
                    marginLeft: 8,
                    color: palette.tomato500,
                    fontFamily: FONT.display,
                    fontSize: 12,
                    fontWeight: "900",
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}
                >
                  Refund payment
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Internal Notes */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSecondary, marginBottom: 8 }}>
            Internal notes ({notes.length}) · manager-only
          </Text>
          <NotesList notes={notes} loading={notesLoading} error={notesError} />
          <NoteInput onSubmit={handleAddNote} />
        </View>
      </ScrollView>

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

      {paymentOpen && request.cost && request.assignedToName && (
        <PaymentDialog
          visible={paymentOpen}
          amount={request.cost.total}
          payeeName={request.assignedToName}
          jobTitle={request.title}
          payment={effectivePayment ?? null}
          onClose={() => setPaymentOpen(false)}
          onSubmit={handlePaymentSubmit}
        />
      )}

      <ConfirmModal {...confirmProps} />

      {/* Schedule / Reschedule picker */}
      <DateTimePickerSheet
        visible={scheduleOpen}
        initial={request.scheduledFor ? request.scheduledFor.toDate() : undefined}
        minimumDate={new Date()}
        title={request.status === "scheduled" ? "Reschedule appointment" : "Schedule appointment"}
        onClose={() => setScheduleOpen(false)}
        onConfirm={handleSchedule}
        testID="manager-schedule-picker"
      />

      {/* Refund-reason modal (task #1) */}
      <Modal
        visible={refundOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !refunding && setRefundOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: c.overlay, justifyContent: "center", paddingHorizontal: 24 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={{ flex: 1, ...StyleSheetAbsolute }} onPress={() => !refunding && setRefundOpen(false)} />
          <View
            style={{
              backgroundColor: c.surface,
              borderWidth: BORDER.heavy,
              borderColor: palette.ink,
              padding: 22,
              ...SHADOW_MD,
            }}
          >
            <Text
              style={{
                fontFamily: FONT.display,
                fontSize: 18,
                fontWeight: "900",
                color: c.text,
                letterSpacing: -0.2,
                textTransform: "uppercase",
              }}
            >
              Refund payment?
            </Text>
            <View style={{ height: BORDER.base, backgroundColor: palette.tomato500, width: 40, marginVertical: 10 }} />
            <Text style={{ fontFamily: FONT.body, fontSize: 13, color: c.textBody, lineHeight: 18 }}>
              Reverses RM {request.cost?.total.toFixed(2) ?? "—"} paid to {request.assignedToName ?? "the maintainer"}. They'll be notified.
            </Text>
            <Text
              style={{
                fontFamily: FONT.display,
                fontSize: 11,
                fontWeight: "900",
                color: palette.ink,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                marginTop: 16,
                marginBottom: 6,
              }}
            >
              ◼ Reason (optional)
            </Text>
            <TextInput
              style={{
                borderWidth: BORDER.base,
                borderColor: palette.ink,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: c.text,
                fontFamily: FONT.body,
                fontSize: 14,
                minHeight: 80,
                textAlignVertical: "top",
                backgroundColor: c.background,
              }}
              placeholder="e.g. Duplicate transfer / wrong amount"
              placeholderTextColor={c.textMuted}
              value={refundReason}
              onChangeText={setRefundReason}
              multiline
              accessibilityLabel="Refund reason"
              testID="refund-confirm-input"
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 16, gap: 10 }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                  backgroundColor: c.surface,
                  ...SHADOW_SM,
                  opacity: refunding ? 0.5 : 1,
                }}
                onPress={() => {
                  setRefundOpen(false);
                  setRefundReason("");
                }}
                disabled={refunding}
                accessibilityRole="button"
                accessibilityLabel="Cancel refund"
              >
                <Text style={{ color: palette.ink, fontFamily: FONT.display, fontSize: 12, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  backgroundColor: palette.tomato500,
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                  ...SHADOW_SM,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onPress={handleRefund}
                disabled={refunding}
                accessibilityRole="button"
                accessibilityLabel="Confirm refund"
                testID="refund-confirm-submit"
              >
                {refunding ? (
                  <ActivityIndicator color={palette.paper} size="small" />
                ) : (
                  <>
                    <Ionicons name="arrow-undo" size={14} color={palette.paper} />
                    <Text style={{ marginLeft: 6, color: palette.paper, fontFamily: FONT.display, fontSize: 12, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" }}>
                      Refund
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const StyleSheetAbsolute = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
