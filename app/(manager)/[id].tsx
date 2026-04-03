import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { showError, showSuccess } from "@/utils/toast";
import { useLocalSearchParams, Stack } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useRequest } from "@/hooks/useRequest";
import { useMessages } from "@/hooks/useMessages";
import { assignRequest, putOnHold, resumeRequest } from "@/services/requests";
import { sendMessage } from "@/services/messages";
import { addNote } from "@/services/notes";
import { useNotes } from "@/hooks/useNotes";
import { useMaintainers } from "@/hooks/useMaintainers";
import { StatusTimeline } from "@/components/request/StatusTimeline";
import { StatusHistory } from "@/components/request/StatusHistory";
import { NotesList } from "@/components/notes/NotesList";
import { NoteInput } from "@/components/notes/NoteInput";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { ChatView } from "@/components/chat/ChatView";
import { RatingStars } from "@/components/request/RatingStars";
import { User } from "@/types";
import { confirmAction } from "@/utils/confirm";

export default function ManagerRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { request, loading, error: requestError } = useRequest(id);
  const { messages, loading: messagesLoading, error: messagesError } = useMessages(id);
  const { notes, loading: notesLoading, error: notesError } = useNotes(id);
  const { maintainers, loading: maintainersLoading, error: maintainersError } = useMaintainers();
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<"messages" | "notes">("messages");
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedMaintainer, setSelectedMaintainer] = useState<User | null>(null);
  const [assignPhone, setAssignPhone] = useState("");
  const [assignEta, setAssignEta] = useState("");

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
      );
      showSuccess("Request assigned to " + selectedMaintainer.name);
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
    confirmAction("Put On Hold", "Put this request on hold?", async () => {
      setUpdating(true);
      try {
        await putOnHold(id, request.status, user.uid, user.name, "manager");
        showSuccess("Request put on hold");
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
    confirmAction("Resume Request", "Resume this request?", async () => {
      setUpdating(true);
      try {
        await resumeRequest(id, "assigned", user.uid, user.name, "manager");
        showSuccess("Request resumed");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed";
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

        {/* Assignee Info */}
        {request.assignedToName && (
          <View className="mt-3 p-3 rounded-lg" style={{ backgroundColor: "#eff6ff" }}>
            <Text className="text-xs font-medium" style={{ color: "#3b82f6" }}>Assigned To</Text>
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

        {/* Assignment Form */}
        {request.status === "submitted" && (
          <View className="mt-4">
            {!showAssignForm ? (
              <TouchableOpacity
                className="rounded-xl py-3 items-center"
                style={{ backgroundColor: "#3b82f6" }}
                onPress={() => setShowAssignForm(true)}
                accessibilityRole="button"
                accessibilityLabel="Assign request"
                testID="assign-request-button"
              >
                <Text className="text-white text-sm font-semibold">Assign Request</Text>
              </TouchableOpacity>
            ) : (
              <View className="rounded-xl p-3 border" style={{ borderColor: "#d1d5db" }}>
                <Text className="text-sm font-semibold mb-2" style={{ color: "#374151" }}>
                  Select Maintainer
                </Text>
                {maintainersLoading ? (
                  <ActivityIndicator size="small" color="#3b82f6" style={{ marginBottom: 8 }} />
                ) : maintainersError ? (
                  <Text className="text-xs mb-2" style={{ color: "#ef4444" }}>
                    Failed to load maintainers
                  </Text>
                ) : maintainers.length === 0 ? (
                  <Text className="text-xs mb-2" style={{ color: "#9ca3af" }}>
                    No maintainers registered yet
                  </Text>
                ) : (
                  maintainers.map((m) => (
                    <TouchableOpacity
                      key={m.uid}
                      className="flex-row items-center p-2 rounded-lg mb-1"
                      style={{
                        backgroundColor: selectedMaintainer?.uid === m.uid ? "#eff6ff" : "#f9fafb",
                        borderWidth: selectedMaintainer?.uid === m.uid ? 1 : 0,
                        borderColor: "#3b82f6",
                      }}
                      onPress={() => {
                        setSelectedMaintainer(m);
                        setAssignPhone(m.phone || "");
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Select maintainer: ${m.name}`}
                      accessibilityState={{ selected: selectedMaintainer?.uid === m.uid }}
                    >
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center mr-2"
                        style={{ backgroundColor: "#dbeafe" }}
                      >
                        <Text className="text-xs font-bold" style={{ color: "#3b82f6" }}>
                          {m.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium" style={{ color: "#111827" }}>
                          {m.name}
                        </Text>
                        {m.phone ? (
                          <Text className="text-xs" style={{ color: "#6b7280" }}>{m.phone}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
                {selectedMaintainer && (
                  <View className="mt-2">
                    <TextInput
                      className="border rounded-lg px-3 py-2 text-sm mb-2"
                      style={{ borderColor: "#d1d5db", color: "#111827" }}
                      placeholder="Phone (optional)"
                      placeholderTextColor="#9ca3af"
                      value={assignPhone}
                      onChangeText={setAssignPhone}
                      keyboardType="phone-pad"
                      accessibilityLabel="Maintainer phone number"
                      testID="assign-phone-input"
                    />
                    <TextInput
                      className="border rounded-lg px-3 py-2 text-sm mb-2"
                      style={{ borderColor: "#d1d5db", color: "#111827" }}
                      placeholder="ETA (e.g. Today 3PM)"
                      placeholderTextColor="#9ca3af"
                      value={assignEta}
                      onChangeText={setAssignEta}
                      accessibilityLabel="Estimated time of arrival"
                      testID="assign-eta-input"
                    />
                    <TouchableOpacity
                      className="rounded-xl py-3 items-center"
                      style={{ backgroundColor: updating ? "#93c5fd" : "#3b82f6" }}
                      onPress={handleAssign}
                      disabled={updating}
                      accessibilityRole="button"
                      accessibilityLabel="Confirm assignment"
                      accessibilityState={{ disabled: updating, busy: updating }}
                      testID="confirm-assignment-button"
                    >
                      {updating ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white text-sm font-semibold">
                          Confirm Assignment
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  className="mt-2 py-2 items-center"
                  onPress={() => {
                    setShowAssignForm(false);
                    setSelectedMaintainer(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel assignment"
                  testID="cancel-assignment-button"
                >
                  <Text className="text-sm" style={{ color: "#6b7280" }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Hold / Resume buttons */}
        {(request.status === "assigned" || request.status === "in_progress") && (
          <TouchableOpacity
            className="rounded-xl py-3 items-center mt-4 border"
            style={{ borderColor: "#c4b5fd", backgroundColor: updating ? "#f5f3ff" : "#fff" }}
            onPress={handlePutOnHold}
            disabled={updating}
            accessibilityRole="button"
            accessibilityLabel="Put on hold"
            accessibilityState={{ disabled: updating, busy: updating }}
            testID="put-on-hold-button"
          >
            {updating ? (
              <ActivityIndicator color="#8b5cf6" />
            ) : (
              <Text className="text-sm font-semibold" style={{ color: "#8b5cf6" }}>
                Put On Hold
              </Text>
            )}
          </TouchableOpacity>
        )}

        {request.status === "on_hold" && (
          <TouchableOpacity
            className="rounded-xl py-3 items-center mt-4"
            style={{ backgroundColor: updating ? "#d1d5db" : "#3b82f6" }}
            onPress={handleResume}
            disabled={updating}
            accessibilityRole="button"
            accessibilityLabel="Resume request"
            accessibilityState={{ disabled: updating, busy: updating }}
            testID="resume-request-button"
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-sm font-semibold">Resume Request</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Status History */}
        <StatusHistory history={request.statusHistory} />

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
      </ScrollView>

      {/* Messages / Notes tabs */}
      <View className="flex-1 border-t" style={{ borderTopColor: "#e5e7eb" }}>
        <View className="flex-row" style={{ backgroundColor: "#f9fafb" }}>
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
            testID="manager-messages-tab"
          >
            <Text
              className="text-sm font-medium"
              style={{ color: activeTab === "messages" ? "#3b82f6" : "#6b7280" }}
            >
              Messages
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-2.5 items-center"
            style={{
              borderBottomWidth: 2,
              borderBottomColor: activeTab === "notes" ? "#f59e0b" : "transparent",
            }}
            onPress={() => setActiveTab("notes")}
            accessibilityRole="button"
            accessibilityLabel={`Notes tab, ${notes.length} notes`}
            accessibilityState={{ selected: activeTab === "notes" }}
            testID="manager-notes-tab"
          >
            <Text
              className="text-sm font-medium"
              style={{ color: activeTab === "notes" ? "#f59e0b" : "#6b7280" }}
            >
              Notes ({notes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "messages" ? (
          <ChatView
            messages={messages}
            currentUserId={user?.uid ?? ""}
            loading={messagesLoading}
            error={messagesError}
            onSend={handleSend}
          />
        ) : (
          <View className="flex-1">
            <ScrollView className="flex-1 px-3 pt-2">
              <NotesList notes={notes} loading={notesLoading} error={notesError} />
            </ScrollView>
            <NoteInput onSubmit={handleAddNote} />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
