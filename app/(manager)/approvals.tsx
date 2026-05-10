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
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";
import { WebContainer } from "@/components/ui/WebContainer";
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
        {/* Brutalist banner */}
        <View
          style={{
            margin: 16,
            padding: 16,
            backgroundColor: palette.cobalt500,
            borderWidth: BORDER.heavy,
            borderColor: palette.ink,
            flexDirection: "row",
            alignItems: "center",
            ...SHADOW_MD,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              backgroundColor: palette.mustard500,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: FONT.display,
                fontSize: 24,
                fontWeight: "900",
                color: palette.ink,
                letterSpacing: -1,
              }}
            >
              {tenants.length}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text
              style={{
                fontFamily: FONT.display,
                fontSize: 15,
                fontWeight: "900",
                color: palette.paper,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              Pending {tenants.length === 1 ? "request" : "requests"}
            </Text>
            <Text style={{ fontFamily: FONT.body, fontSize: 12, color: palette.paper, marginTop: 4, opacity: 0.9 }}>
              Verify by unit number before approving.
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
              <View
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: palette.lime500,
                  borderWidth: BORDER.heavy,
                  borderColor: palette.ink,
                  alignItems: "center",
                  justifyContent: "center",
                  ...SHADOW_MD,
                }}
              >
                <Ionicons name="checkmark-done" size={36} color={palette.ink} />
              </View>
              <Text
                style={{
                  fontFamily: FONT.display,
                  fontSize: 16,
                  fontWeight: "900",
                  color: c.text,
                  marginTop: 18,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                Inbox zero
              </Text>
              <Text style={{ fontFamily: FONT.body, fontSize: 13, color: c.textBody, marginTop: 8, textAlign: "center", maxWidth: 280 }}>
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
                  backgroundColor: c.surface,
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                  padding: 14,
                  marginBottom: 14,
                  ...SHADOW_MD,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      backgroundColor: palette.cobalt500,
                      borderWidth: BORDER.base,
                      borderColor: palette.ink,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONT.display,
                        fontSize: 22,
                        fontWeight: "900",
                        color: palette.paper,
                      }}
                    >
                      {initial}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: "900", color: c.text, letterSpacing: -0.2 }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: c.textBody, marginTop: 3, letterSpacing: 0.3 }}>
                      {item.email}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      backgroundColor: palette.mustard500,
                      borderWidth: BORDER.base,
                      borderColor: palette.ink,
                    }}
                  >
                    <Text style={{ fontFamily: FONT.display, fontSize: 10, fontWeight: "900", color: palette.ink, letterSpacing: 0.6 }}>
                      PENDING
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", marginTop: 14, gap: 12 }}>
                  <DetailLine icon="home" label="UNIT" value={item.unitNumber || "—"} />
                  <DetailLine icon="call" label="PHONE" value={item.phone || "—"} />
                </View>

                <View style={{ flexDirection: "row", marginTop: 16, gap: 10 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      borderWidth: BORDER.base,
                      borderColor: palette.ink,
                      paddingVertical: 12,
                      alignItems: "center",
                      backgroundColor: c.surface,
                      ...SHADOW_SM,
                    }}
                    onPress={() => setRejectingTenant(item)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Reject ${item.name}`}
                    testID={`reject-tenant-${item.uid}`}
                  >
                    <Text style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: "900", color: palette.tomato500, letterSpacing: 0.6, textTransform: "uppercase" }}>
                      Reject
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: busy ? palette.lime300 : palette.lime500,
                      borderWidth: BORDER.base,
                      borderColor: palette.ink,
                      paddingVertical: 12,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      ...SHADOW_SM,
                    }}
                    onPress={() => handleApprove(item)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Approve ${item.name}`}
                    testID={`approve-tenant-${item.uid}`}
                  >
                    {busy ? (
                      <ActivityIndicator color={palette.ink} size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color={palette.ink} />
                        <Text style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: "900", color: palette.ink, marginLeft: 6, letterSpacing: 0.6, textTransform: "uppercase" }}>
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
                Reject {rejectingTenant?.name}?
              </Text>
              <View style={{ height: BORDER.base, backgroundColor: palette.tomato500, width: 36, marginVertical: 10 }} />
              <Text style={{ fontFamily: FONT.body, fontSize: 13, color: c.textBody, lineHeight: 18 }}>
                Optionally include a reason — the tenant will see this in their notification.
              </Text>
              <TextInput
                style={{
                  marginTop: 16,
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: c.text,
                  fontFamily: FONT.body,
                  fontSize: 14,
                  minHeight: 92,
                  textAlignVertical: "top",
                  backgroundColor: c.background,
                }}
                placeholder="e.g. Unit number does not match our records"
                placeholderTextColor={c.textMuted}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                accessibilityLabel="Rejection reason"
              />
              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 18, gap: 10 }}>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    borderWidth: BORDER.base,
                    borderColor: palette.ink,
                    backgroundColor: c.surface,
                    ...SHADOW_SM,
                  }}
                  onPress={() => {
                    setRejectingTenant(null);
                    setRejectReason("");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel rejection"
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
                  }}
                  onPress={submitReject}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm rejection"
                  testID="confirm-reject-button"
                >
                  <Text style={{ color: palette.paper, fontFamily: FONT.display, fontSize: 12, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" }}>
                    Reject
                  </Text>
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
}

function DetailLine({ icon, label, value }: DetailLineProps) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1.5,
        borderColor: palette.ink,
        backgroundColor: palette.cream100,
      }}
    >
      <Ionicons name={icon} size={13} color={palette.ink} />
      <Text style={{ fontFamily: FONT.display, fontSize: 9, color: palette.ink, marginLeft: 4, letterSpacing: 0.6 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: palette.ink, marginLeft: 6, fontWeight: "700" }}>
        {value}
      </Text>
    </View>
  );
}
