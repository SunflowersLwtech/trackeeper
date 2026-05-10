import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { showSuccess, showError } from "@/utils/toast";
import { createStaffUser, subscribeToUsersByRole } from "@/services/users";
import { suspendUser, reactivateUser } from "@/services/approvals";
import { User } from "@/types";
import { WebContainer } from "@/components/ui/WebContainer";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useConfirm } from "@/hooks/useConfirm";
import { useAuth } from "@/hooks/useAuth";
import { Unsubscribe } from "firebase/firestore";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";
import { validateEmail, validatePassword, validateName } from "@/utils/validation";
import { friendlyErrorMessage } from "@/utils/errorMessages";

export default function UserManagementScreen() {
  const c = useColors();
  const { user: currentUser } = useAuth();
  const { confirm, confirmProps } = useConfirm();
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"maintainer" | "manager">("maintainer");
  const [creating, setCreating] = useState(false);

  const [maintainers, setMaintainers] = useState<User[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const unsub1 = useRef<Unsubscribe | null>(null);
  const unsub2 = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    unsub1.current = subscribeToUsersByRole("maintainer", (users) => {
      setMaintainers(users);
      setLoading(false);
    });
    unsub2.current = subscribeToUsersByRole("manager", (users) => {
      setManagers(users);
    });
    return () => {
      unsub1.current?.();
      unsub2.current?.();
    };
  }, []);

  const resetForm = useCallback(() => {
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setRole("maintainer");
    setShowForm(false);
  }, []);

  const handleCreate = async () => {
    const nameErr = validateName(name);
    if (nameErr) { showError("Validation", nameErr); return; }
    const emailErr = validateEmail(email);
    if (emailErr) { showError("Validation", emailErr); return; }
    const passErr = validatePassword(password);
    if (passErr) { showError("Validation", passErr); return; }

    setCreating(true);
    try {
      await createStaffUser({
        email: email.trim(),
        password,
        name: name.trim(),
        role,
        phone: phone.trim() || undefined,
      });
      showSuccess(`${role === "maintainer" ? "Maintainer" : "Manager"} account created`);
      resetForm();
    } catch (error: unknown) {
      const message = friendlyErrorMessage(error, "Failed to create account. Try again.");
      showError("Error", message);
    } finally {
      setCreating(false);
    }
  };

  const handleSuspend = (target: User) => {
    if (!currentUser) return;
    confirm(
      `Suspend ${target.name}?`,
      "They will lose access immediately and the change is logged. You can reactivate later.",
      async () => {
        setBusyUid(target.uid);
        try {
          await suspendUser(target.uid, currentUser.uid, currentUser.name);
          showSuccess("Suspended", `${target.name} can no longer sign in.`);
        } catch (e) {
          const msg = friendlyErrorMessage(e, "Could not suspend this user. Try again.");
          showError("Error", msg);
        } finally {
          setBusyUid(null);
        }
      },
      { destructive: true },
    );
  };

  const handleReactivate = (target: User) => {
    if (!currentUser) return;
    confirm(
      `Reactivate ${target.name}?`,
      "They will regain access immediately.",
      async () => {
        setBusyUid(target.uid);
        try {
          await reactivateUser(target.uid, currentUser.uid, currentUser.name);
          showSuccess("Reactivated", `${target.name} can sign in again.`);
        } catch (e) {
          const msg = friendlyErrorMessage(e, "Could not reactivate this user. Try again.");
          showError("Error", msg);
        } finally {
          setBusyUid(null);
        }
      },
    );
  };

  const renderUser = ({ item }: { item: User }) => {
    const isManager = item.role === "manager";
    const isSuspended = item.status === "suspended";
    const tint = isManager ? palette.plum500 : palette.tomato500;
    const rowBusy = busyUid === item.uid;
    const isSelf = currentUser?.uid === item.uid;
    return (
      <View
        style={{
          padding: 12,
          marginBottom: 10,
          borderWidth: BORDER.base,
          borderColor: isSuspended ? palette.ink400 : palette.ink,
          backgroundColor: isSuspended ? c.surfaceAlt : c.surface,
          ...SHADOW_SM,
          opacity: isSuspended ? 0.85 : 1,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 44,
              height: 44,
              backgroundColor: isSuspended ? palette.ink400 : tint,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Text style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: "900", color: palette.paper }}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontFamily: FONT.display,
                fontSize: 14,
                fontWeight: "900",
                color: c.text,
                letterSpacing: -0.1,
                textDecorationLine: isSuspended ? "line-through" : "none",
              }}
            >
              {item.name}
            </Text>
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: c.textBody, marginTop: 2, letterSpacing: 0.2 }} numberOfLines={1} ellipsizeMode="tail">
              {item.email}
            </Text>
            {item.phone ? (
              <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: c.textMuted, marginTop: 1 }}>{item.phone}</Text>
            ) : null}
          </View>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: isSuspended ? palette.ink : tint,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons
              name={isSuspended ? "ban" : isManager ? "shield" : "construct"}
              size={11}
              color={palette.paper}
              style={{ marginRight: 4 }}
            />
            <Text style={{ fontFamily: FONT.display, fontSize: 9, fontWeight: "900", color: palette.paper, letterSpacing: 0.6, textTransform: "uppercase" }}>
              {isSuspended ? "Suspended" : isManager ? "Manager" : "Maintainer"}
            </Text>
          </View>
        </View>

        {!isSelf && (
          <TouchableOpacity
            style={{
              marginTop: 12,
              paddingVertical: 8,
              borderWidth: BORDER.base,
              borderColor: isSuspended ? palette.lime500 : palette.tomato500,
              backgroundColor: c.surface,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              opacity: rowBusy ? 0.6 : 1,
            }}
            onPress={() => (isSuspended ? handleReactivate(item) : handleSuspend(item))}
            disabled={rowBusy}
            accessibilityRole="button"
            accessibilityLabel={isSuspended ? `Reactivate ${item.name}` : `Suspend ${item.name}`}
            testID={isSuspended ? `reactivate-user-${item.uid}` : `suspend-user-${item.uid}`}
          >
            {rowBusy ? (
              <ActivityIndicator size="small" color={palette.ink} />
            ) : (
              <>
                <Ionicons
                  name={isSuspended ? "play-circle" : "ban"}
                  size={14}
                  color={isSuspended ? palette.lime700 : palette.tomato500}
                />
                <Text
                  style={{
                    marginLeft: 6,
                    fontFamily: FONT.display,
                    fontSize: 11,
                    fontWeight: "900",
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    color: isSuspended ? palette.lime700 : palette.tomato500,
                  }}
                >
                  {isSuspended ? "Reactivate" : "Suspend"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <WebContainer>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {!showForm && (
            <TouchableOpacity
              style={{
                paddingVertical: 16,
                alignItems: "center",
                marginBottom: 18,
                backgroundColor: palette.cobalt500,
                borderWidth: BORDER.heavy,
                borderColor: palette.ink,
                ...SHADOW_MD,
              }}
              onPress={() => setShowForm(true)}
              accessibilityRole="button"
              accessibilityLabel="Create new staff account"
              testID="create-staff-button"
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="person-add" size={18} color={palette.paper} />
                <Text style={{ color: palette.paper, fontFamily: FONT.display, fontSize: 14, fontWeight: "900", marginLeft: 8, letterSpacing: 0.8, textTransform: "uppercase" }}>
                  + Create staff account
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {showForm && (
            <View
              style={{
                padding: 16,
                marginBottom: 18,
                borderWidth: BORDER.heavy,
                borderColor: palette.ink,
                backgroundColor: c.surface,
                ...SHADOW_MD,
              }}
            >
              <Text style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: "900", color: c.text, marginBottom: 14, letterSpacing: 0.2, textTransform: "uppercase" }}>
                ◼ New staff account
              </Text>

              {/* Brutalist role toggle */}
              <View
                style={{
                  flexDirection: "row",
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                  marginBottom: 14,
                  ...SHADOW_SM,
                }}
              >
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: role === "maintainer" ? palette.tomato500 : c.surface,
                  }}
                  onPress={() => setRole("maintainer")}
                  accessibilityRole="button"
                  accessibilityLabel="Role: Maintainer"
                  accessibilityState={{ selected: role === "maintainer" }}
                >
                  <Text
                    style={{
                      fontFamily: FONT.display,
                      fontSize: 12,
                      fontWeight: "900",
                      color: role === "maintainer" ? palette.paper : palette.ink,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    Maintainer
                  </Text>
                </TouchableOpacity>
                <View style={{ width: BORDER.base, backgroundColor: palette.ink }} />
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: role === "manager" ? palette.plum500 : c.surface,
                  }}
                  onPress={() => setRole("manager")}
                  accessibilityRole="button"
                  accessibilityLabel="Role: Manager"
                  accessibilityState={{ selected: role === "manager" }}
                >
                  <Text
                    style={{
                      fontFamily: FONT.display,
                      fontSize: 12,
                      fontWeight: "900",
                      color: role === "manager" ? palette.paper : palette.ink,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    Manager
                  </Text>
                </TouchableOpacity>
              </View>

              <BrutalInput value={name} onChangeText={setName} placeholder="Full name" colors={c} testID="staff-name-input" />
              <BrutalInput value={email} onChangeText={setEmail} placeholder="Email" colors={c} keyboardType="email-address" autoCapitalize="none" testID="staff-email-input" />
              <BrutalInput value={password} onChangeText={setPassword} placeholder="Password (min 6 chars)" colors={c} secureTextEntry testID="staff-password-input" />
              <BrutalInput value={phone} onChangeText={setPhone} placeholder="Phone (optional)" colors={c} keyboardType="phone-pad" testID="staff-phone-input" />

              <TouchableOpacity
                style={{
                  paddingVertical: 14,
                  alignItems: "center",
                  marginTop: 6,
                  backgroundColor: creating ? palette.lime300 : palette.lime500,
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                  ...SHADOW_SM,
                }}
                onPress={handleCreate}
                disabled={creating}
                accessibilityRole="button"
                accessibilityLabel="Create account"
                accessibilityState={{ disabled: creating, busy: creating }}
                testID="confirm-create-staff-button"
              >
                {creating ? (
                  <ActivityIndicator color={palette.ink} />
                ) : (
                  <Text style={{ color: palette.ink, fontFamily: FONT.display, fontSize: 13, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" }}>
                    Create account
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ paddingVertical: 12, alignItems: "center" }}
                onPress={resetForm}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: c.textBody, letterSpacing: 0.6, textTransform: "uppercase" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color={palette.cobalt500} style={{ marginTop: 24 }} />
          ) : (
            <>
              {managers.length > 0 && (
                <View style={{ marginBottom: 18 }}>
                  <SectionHeader>Managers · {managers.length}</SectionHeader>
                  {managers.map((m) => (
                    <React.Fragment key={m.uid}>{renderUser({ item: m })}</React.Fragment>
                  ))}
                </View>
              )}
              <View>
                <SectionHeader>Maintainers · {maintainers.length}</SectionHeader>
                {maintainers.length === 0 ? (
                  <Text style={{ fontFamily: FONT.body, fontSize: 13, paddingVertical: 18, textAlign: "center", color: c.textMuted }}>
                    No maintainers yet
                  </Text>
                ) : (
                  maintainers.map((m) => (
                    <React.Fragment key={m.uid}>{renderUser({ item: m })}</React.Fragment>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
        <ConfirmModal {...confirmProps} />
      </KeyboardAvoidingView>
    </WebContainer>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 10, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: palette.ink, alignSelf: "flex-start" }}>
      <Text style={{ fontFamily: FONT.display, fontSize: 12, fontWeight: "900", color: palette.paper, letterSpacing: 1, textTransform: "uppercase" }}>
        ◼ {children}
      </Text>
    </View>
  );
}

interface BrutalInputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  testID?: string;
}

function BrutalInput({ value, onChangeText, placeholder, colors: c, secureTextEntry, keyboardType, autoCapitalize, testID }: BrutalInputProps) {
  return (
    <TextInput
      style={{
        borderWidth: BORDER.base,
        borderColor: palette.ink,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontFamily: FONT.body,
        fontSize: 14,
        color: c.text,
        backgroundColor: c.background,
        marginBottom: 10,
      }}
      placeholder={placeholder}
      placeholderTextColor={c.textMuted}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      accessibilityLabel={placeholder}
      testID={testID}
    />
  );
}
