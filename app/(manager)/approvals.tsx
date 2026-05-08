import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { usePendingTenants } from "@/hooks/usePendingTenants";
import { useAuth } from "@/hooks/useAuth";
import { approveTenant, rejectTenant } from "@/services/approvals";
import { showSuccess, showError } from "@/utils/toast";
import { useColors } from "@/hooks/useColors";
import { WebContainer } from "@/components/ui/WebContainer";
import { withOpacity } from "@/utils/color";
import { User } from "@/types";

export default function ApprovalsScreen() {
  const c = useColors();
  const { user } = useAuth();
  const { tenants, loading, error } = usePendingTenants();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingTenant, setRejectingTenant] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (tenant: User) => {
    if (!user) return;
    setBusyId(tenant.uid);
    try {
      await approveTenant(tenant.uid, user.uid, user.name);
      showSuccess("Approved", `${tenant.name} can now use TracKeeper.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Approval failed";
      showError("Error", msg);
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async () => {
    if (!user || !rejectingTenant) return;
    setBusyId(rejectingTenant.uid);
    try {
      await rejectTenant(rejectingTenant.uid, user.uid, user.name, rejectReason.trim() || undefined);
      showSuccess("Rejected", `${rejectingTenant.name} has been notified.`);
      setRejectingTenant(null);
      setRejectReason("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Reject failed";
      showError("Error", msg);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <WebContainer>
      <Stack.Screen options={{ title: "Tenant Approvals" }} />
      <View style={{ flex: 1, backgroundColor: c.background }}>
        {/* Header banner */}
        <View
          style={{
            margin: 16,
            padding: 16,
            borderRadius: 16,
            backgroundColor: c.primaryBg,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: c.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="people-circle-outline" size={26} color={c.background} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>
              {tenants.length} pending {tenants.length === 1 ? "request" : "requests"}
            </Text>
            <Text style={{ fontSize: 12, color: c.textTertiary, marginTop: 2 }}>
              Verify the tenant by their unit number before approving.
            </Text>
          </View>
        </View>

        {error && (
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={{ color: c.error, fontSize: 13 }}>Failed to load: {error.message}</Text>
          </View>
        )}

        <FlatList
          data={tenants}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} tintColor={c.primary} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Ionicons name="checkmark-done-circle-outline" size={64} color={c.borderLight} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.textMuted, marginTop: 12 }}>
                Inbox zero — no pending tenants
              </Text>
              <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>
                New tenant registrations will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const initial = item.name.charAt(0).toUpperCase();
            const busy = busyId === item.uid;
            return (
              <View
                style={{
                  backgroundColor: c.background,
                  borderWidth: 1,
                  borderColor: c.borderLight,
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 12,
                  shadowColor: c.text,
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 1,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: withOpacity(c.primary, 0.16),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: "800", color: c.primary }}>{initial}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: c.textTertiary, marginTop: 2 }}>{item.email}</Text>
                  </View>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: c.warningBg }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: c.warningTextDark }}>PENDING</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", marginTop: 12 }}>
                  <DetailLine icon="home-outline" label="Unit" value={item.unitNumber || "—"} colors={c} />
                  <DetailLine icon="call-outline" label="Phone" value={item.phone || "—"} colors={c} />
                </View>

                <View style={{ flexDirection: "row", marginTop: 14 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: c.errorBorder,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: "center",
                      marginRight: 8,
                      backgroundColor: c.errorBg,
                    }}
                    onPress={() => setRejectingTenant(item)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Reject ${item.name}`}
                    testID={`reject-tenant-${item.uid}`}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: c.error }}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: busy ? c.primaryLight : c.primary,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                    onPress={() => handleApprove(item)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Approve ${item.name}`}
                    testID={`approve-tenant-${item.uid}`}
                  >
                    {busy ? (
                      <ActivityIndicator color={c.background} size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color={c.background} />
                        <Text style={{ fontSize: 13, fontWeight: "700", color: c.background, marginLeft: 6 }}>
                          Approve
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />

        {/* Reject reason modal */}
        <Modal
          visible={rejectingTenant !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setRejectingTenant(null)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: c.overlay, justifyContent: "center", paddingHorizontal: 24 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={{ backgroundColor: c.background, borderRadius: 16, padding: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }}>
                Reject {rejectingTenant?.name}?
              </Text>
              <Text style={{ fontSize: 13, color: c.textTertiary, marginTop: 6 }}>
                Optionally include a reason — the tenant will see this in their notification.
              </Text>
              <TextInput
                style={{
                  marginTop: 14,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: c.text,
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
                placeholder="e.g. Unit number does not match our records"
                placeholderTextColor={c.textMuted}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                accessibilityLabel="Rejection reason"
              />
              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 16 }}>
                <TouchableOpacity
                  style={{ paddingHorizontal: 16, paddingVertical: 10, marginRight: 8 }}
                  onPress={() => {
                    setRejectingTenant(null);
                    setRejectReason("");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel rejection"
                >
                  <Text style={{ color: c.textTertiary, fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    backgroundColor: c.error,
                    borderRadius: 10,
                  }}
                  onPress={submitReject}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm rejection"
                  testID="confirm-reject-button"
                >
                  <Text style={{ color: c.background, fontWeight: "700" }}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </WebContainer>
  );
}

interface DetailLineProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}

function DetailLine({ icon, label, value, colors: c }: DetailLineProps) {
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
      <Ionicons name={icon} size={14} color={c.textTertiary} />
      <Text style={{ fontSize: 11, color: c.textTertiary, marginLeft: 4 }}>
        {label}: <Text style={{ color: c.text, fontWeight: "600" }}>{value}</Text>
      </Text>
    </View>
  );
}
