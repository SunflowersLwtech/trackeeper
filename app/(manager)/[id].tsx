import React, { useState, useCallback } from "react";
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
} from "@/services/requests";
import { setRequestCost, payMaintainer } from "@/services/payments";
import { sendMessage } from "@/services/messages";
import { uploadChatImage } from "@/services/chatStorage";
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
import { User, RequestPriority, PaymentMethod } from "@/types";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useConfirm } from "@/hooks/useConfirm";
import { useColors } from "@/hooks/useColors";
import { getPriorityColor, getPriorityLabel, PRIORITY_ORDER } from "@/utils/priority";
import { withOpacity } from "@/utils/color";
import { formatLongDate } from "@/utils/time";

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

  const tenantId = request?.tenantId;
  const jobTitle = request?.title;

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

  const handlePay = async (method: PaymentMethod) => {
    if (!request || !id || !user || !request.cost || !request.assignedTo || !request.assignedToName) {
      showError("Cannot pay", "Cost or assignee missing.");
      throw new Error("missing");
    }
    try {
      await payMaintainer(
        id,
        request.cost.total,
        method,
        user.uid,
        user.name,
        request.assignedTo,
        request.assignedToName,
      );
      showSuccess("Paid", `Sent RM ${request.cost.total.toFixed(2)} to ${request.assignedToName}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      showError("Error", msg);
      throw e;
    }
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
          {requestError ? `Error: ${requestError.message}` : "Request not found"}
        </Text>
      </View>
    );
  }

  const canEditCost = request.status === "completed";
  const canPay = request.cost && request.payment?.status !== "paid" && request.assignedTo;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ headerShown: true, title: "Manage Request" }} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
        <StatusTimeline currentStatus={request.status} />

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
          {request.prioritySuggestion?.source === "auto" && (
            <View style={{ marginLeft: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: c.violetBg, flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="sparkles-outline" size={11} color={c.violet} />
              <Text style={{ marginLeft: 4, fontSize: 10, fontWeight: "700", color: c.violet }}>AI suggested</Text>
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

        {request.imageUrl && (
          <Image source={{ uri: request.imageUrl }} style={{ width: "100%", height: 160, borderRadius: 14, marginTop: 12 }} resizeMode="cover" />
        )}

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
                  maintainers.map((m) => {
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
                      style={{ paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: updating ? c.primaryLight : c.primary }}
                      onPress={handleAssign}
                      disabled={updating}
                      accessibilityRole="button"
                      accessibilityLabel="Confirm assignment"
                      testID="confirm-assignment-button"
                    >
                      {updating ? <ActivityIndicator color={c.background} /> : (
                        <Text style={{ color: c.background, fontWeight: "700" }}>Confirm assignment</Text>
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

        {/* Hold/Resume */}
        {(request.status === "assigned" || request.status === "in_progress") && (
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

        {/* Existing cost summary */}
        {request.cost && (
          <View
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 14,
              backgroundColor: request.payment?.status === "paid" ? c.successBg : c.warningBg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={request.payment?.status === "paid" ? "checkmark-circle" : "wallet-outline"}
                size={18}
                color={request.payment?.status === "paid" ? c.success : c.warning}
              />
              <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: "800", color: c.text }}>
                {request.payment?.status === "paid"
                  ? `Paid · ${formatLongDate(request.payment.paidAt)}`
                  : "Unpaid"}
              </Text>
            </View>
            <Text style={{ marginTop: 4, fontSize: 11, color: c.textTertiary }}>
              Total RM {request.cost.total.toFixed(2)}
              {request.payment?.reference ? ` · Ref ${request.payment.reference}` : ""}
            </Text>
            {canPay && (
              <TouchableOpacity
                style={{ marginTop: 10, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: c.primary, flexDirection: "row", justifyContent: "center" }}
                onPress={() => setPaymentOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Pay maintainer"
                testID="pay-maintainer-button"
              >
                <Ionicons name="card" size={14} color={c.background} />
                <Text style={{ marginLeft: 6, color: c.background, fontWeight: "700", fontSize: 13 }}>
                  Pay {request.assignedToName} — RM {request.cost.total.toFixed(2)}
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
          onClose={() => setPaymentOpen(false)}
          onPay={handlePay}
        />
      )}

      <ConfirmModal {...confirmProps} />
    </View>
  );
}
