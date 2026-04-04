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
import { User } from "@/types";
import { WebContainer } from "@/components/ui/WebContainer";
import { Unsubscribe } from "firebase/firestore";
import { useColors } from "@/hooks/useColors";
import { validateEmail, validatePassword, validateName } from "@/utils/validation";

export default function UserManagementScreen() {
  const c = useColors();
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
      const message = error instanceof Error ? error.message : "Failed to create account";
      showError("Error", message);
    } finally {
      setCreating(false);
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <View
      className="flex-row items-center p-3 mb-2 rounded-xl border"
      style={{ borderColor: c.borderLight }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: item.role === "manager" ? c.warningBadgeBg : c.primaryBadgeBg }}
      >
        <Text
          className="text-sm font-bold"
          style={{ color: item.role === "manager" ? c.warning : c.primary }}
        >
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold" style={{ color: c.text }}>{item.name}</Text>
        <Text className="text-xs" style={{ color: c.textTertiary }} numberOfLines={1} ellipsizeMode="tail">{item.email}</Text>
        {item.phone ? (
          <Text className="text-xs" style={{ color: c.textMuted }}>{item.phone}</Text>
        ) : null}
      </View>
      <View
        className="flex-row items-center px-2 py-1 rounded-md"
        style={{ backgroundColor: item.role === "manager" ? c.warningBadgeBg : c.primaryBadgeBg }}
      >
        <Ionicons
          name={item.role === "manager" ? "shield-outline" : "construct-outline"}
          size={12}
          color={item.role === "manager" ? c.warningTextDark : c.primaryDark}
          style={{ marginRight: 4 }}
        />
        <Text
          className="text-xs font-medium"
          style={{ color: item.role === "manager" ? c.warningTextDark : c.primaryDark }}
        >
          {item.role === "manager" ? "Manager" : "Maintainer"}
        </Text>
      </View>
    </View>
  );

  return (
    <WebContainer>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Create button */}
        {!showForm && (
          <TouchableOpacity
            className="rounded-xl py-3 items-center mb-4"
            style={{ backgroundColor: c.primary }}
            onPress={() => setShowForm(true)}
            accessibilityRole="button"
            accessibilityLabel="Create new staff account"
            testID="create-staff-button"
          >
            <View className="flex-row items-center">
              <Ionicons name="person-add-outline" size={18} color={c.background} />
              <Text className="text-white text-sm font-semibold ml-2">Create Staff Account</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Creation form */}
        {showForm && (
          <View className="rounded-xl p-4 mb-4 border" style={{ borderColor: c.border }}>
            <Text className="text-base font-semibold mb-3" style={{ color: c.text }}>
              New Staff Account
            </Text>

            {/* Role selector */}
            <View
              style={{
                flexDirection: "row",
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: c.primary,
                overflow: "hidden",
                marginBottom: 12,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: "center",
                  backgroundColor: role === "maintainer" ? c.primary : c.background,
                }}
                onPress={() => setRole("maintainer")}
                accessibilityRole="button"
                accessibilityLabel="Role: Maintainer"
                accessibilityState={{ selected: role === "maintainer" }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: role === "maintainer" ? c.background : c.primary,
                  }}
                >
                  Maintainer
                </Text>
              </TouchableOpacity>
              <View style={{ width: 1.5, backgroundColor: c.primary }} />
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: "center",
                  backgroundColor: role === "manager" ? c.primary : c.background,
                }}
                onPress={() => setRole("manager")}
                accessibilityRole="button"
                accessibilityLabel="Role: Manager"
                accessibilityState={{ selected: role === "manager" }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: role === "manager" ? c.background : c.primary,
                  }}
                >
                  Manager
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              className="border rounded-xl px-4 py-3 text-sm mb-2"
              style={{ borderColor: c.border, color: c.text }}
              placeholder="Full name"
              placeholderTextColor={c.textMuted}
              value={name}
              onChangeText={setName}
              accessibilityLabel="Full name"
              testID="staff-name-input"
            />
            <TextInput
              className="border rounded-xl px-4 py-3 text-sm mb-2"
              style={{ borderColor: c.border, color: c.text }}
              placeholder="Email"
              placeholderTextColor={c.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel="Email"
              testID="staff-email-input"
            />
            <TextInput
              className="border rounded-xl px-4 py-3 text-sm mb-2"
              style={{ borderColor: c.border, color: c.text }}
              placeholder="Password (min 6 chars)"
              placeholderTextColor={c.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              accessibilityLabel="Password"
              testID="staff-password-input"
            />
            <TextInput
              className="border rounded-xl px-4 py-3 text-sm mb-3"
              style={{ borderColor: c.border, color: c.text }}
              placeholder="Phone (optional)"
              placeholderTextColor={c.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              accessibilityLabel="Phone"
              testID="staff-phone-input"
            />

            <TouchableOpacity
              className="rounded-xl py-3 items-center mb-2"
              style={{ backgroundColor: creating ? c.primaryLight : c.primary }}
              onPress={handleCreate}
              disabled={creating}
              accessibilityRole="button"
              accessibilityLabel="Create account"
              accessibilityState={{ disabled: creating, busy: creating }}
              testID="confirm-create-staff-button"
            >
              {creating ? (
                <ActivityIndicator color={c.background} />
              ) : (
                <Text className="text-white text-sm font-semibold">Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="py-2 items-center"
              onPress={resetForm}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text className="text-sm" style={{ color: c.textTertiary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Staff list */}
        {loading ? (
          <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 20 }} />
        ) : (
          <>
            {managers.length > 0 && (
              <View className="mb-4">
                <Text className="text-sm font-semibold mb-2" style={{ color: c.textSecondary }}>
                  Managers ({managers.length})
                </Text>
                {managers.map((m) => (
                  <React.Fragment key={m.uid}>{renderUser({ item: m })}</React.Fragment>
                ))}
              </View>
            )}
            <View>
              <Text className="text-sm font-semibold mb-2" style={{ color: c.textSecondary }}>
                Maintainers ({maintainers.length})
              </Text>
              {maintainers.length === 0 ? (
                <Text className="text-sm py-4 text-center" style={{ color: c.textMuted }}>
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
    </KeyboardAvoidingView>
    </WebContainer>
  );
}
