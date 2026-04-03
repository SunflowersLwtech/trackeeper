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

export default function UserManagementScreen() {
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
    if (!name.trim() || name.trim().length < 2) {
      showError("Validation", "Name must be at least 2 characters");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      showError("Validation", "Please enter a valid email");
      return;
    }
    if (!password || password.length < 6) {
      showError("Validation", "Password must be at least 6 characters");
      return;
    }

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
      style={{ borderColor: "#e5e7eb" }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: item.role === "manager" ? "#fef3c7" : "#dbeafe" }}
      >
        <Text
          className="text-sm font-bold"
          style={{ color: item.role === "manager" ? "#f59e0b" : "#3b82f6" }}
        >
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold" style={{ color: "#111827" }}>{item.name}</Text>
        <Text className="text-xs" style={{ color: "#6b7280" }}>{item.email}</Text>
        {item.phone ? (
          <Text className="text-xs" style={{ color: "#9ca3af" }}>{item.phone}</Text>
        ) : null}
      </View>
      <View
        className="px-2 py-1 rounded-md"
        style={{ backgroundColor: item.role === "manager" ? "#fef3c7" : "#dbeafe" }}
      >
        <Text
          className="text-xs font-medium"
          style={{ color: item.role === "manager" ? "#92400e" : "#1e40af" }}
        >
          {item.role === "manager" ? "Manager" : "Maintainer"}
        </Text>
      </View>
    </View>
  );

  return (
    <WebContainer>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Create button */}
        {!showForm && (
          <TouchableOpacity
            className="rounded-xl py-3 items-center mb-4"
            style={{ backgroundColor: "#3b82f6" }}
            onPress={() => setShowForm(true)}
            accessibilityRole="button"
            accessibilityLabel="Create new staff account"
            testID="create-staff-button"
          >
            <View className="flex-row items-center">
              <Ionicons name="person-add-outline" size={18} color="#fff" />
              <Text className="text-white text-sm font-semibold ml-2">Create Staff Account</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Creation form */}
        {showForm && (
          <View className="rounded-xl p-4 mb-4 border" style={{ borderColor: "#d1d5db" }}>
            <Text className="text-base font-semibold mb-3" style={{ color: "#111827" }}>
              New Staff Account
            </Text>

            {/* Role selector */}
            <View className="flex-row mb-3">
              <TouchableOpacity
                className="flex-1 py-2 items-center rounded-l-xl border"
                style={{
                  backgroundColor: role === "maintainer" ? "#3b82f6" : "#fff",
                  borderColor: "#3b82f6",
                }}
                onPress={() => setRole("maintainer")}
                accessibilityRole="button"
                accessibilityLabel="Role: Maintainer"
                accessibilityState={{ selected: role === "maintainer" }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: role === "maintainer" ? "#fff" : "#3b82f6" }}
                >
                  Maintainer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-2 items-center rounded-r-xl border"
                style={{
                  backgroundColor: role === "manager" ? "#3b82f6" : "#fff",
                  borderColor: "#3b82f6",
                }}
                onPress={() => setRole("manager")}
                accessibilityRole="button"
                accessibilityLabel="Role: Manager"
                accessibilityState={{ selected: role === "manager" }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: role === "manager" ? "#fff" : "#3b82f6" }}
                >
                  Manager
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              className="border rounded-xl px-4 py-3 text-sm mb-2"
              style={{ borderColor: "#d1d5db", color: "#111827" }}
              placeholder="Full name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              accessibilityLabel="Full name"
              testID="staff-name-input"
            />
            <TextInput
              className="border rounded-xl px-4 py-3 text-sm mb-2"
              style={{ borderColor: "#d1d5db", color: "#111827" }}
              placeholder="Email"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel="Email"
              testID="staff-email-input"
            />
            <TextInput
              className="border rounded-xl px-4 py-3 text-sm mb-2"
              style={{ borderColor: "#d1d5db", color: "#111827" }}
              placeholder="Password (min 6 chars)"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              accessibilityLabel="Password"
              testID="staff-password-input"
            />
            <TextInput
              className="border rounded-xl px-4 py-3 text-sm mb-3"
              style={{ borderColor: "#d1d5db", color: "#111827" }}
              placeholder="Phone (optional)"
              placeholderTextColor="#9ca3af"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              accessibilityLabel="Phone"
              testID="staff-phone-input"
            />

            <TouchableOpacity
              className="rounded-xl py-3 items-center mb-2"
              style={{ backgroundColor: creating ? "#93c5fd" : "#3b82f6" }}
              onPress={handleCreate}
              disabled={creating}
              accessibilityRole="button"
              accessibilityLabel="Create account"
              accessibilityState={{ disabled: creating, busy: creating }}
              testID="confirm-create-staff-button"
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
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
              <Text className="text-sm" style={{ color: "#6b7280" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Staff list */}
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
        ) : (
          <>
            {managers.length > 0 && (
              <View className="mb-4">
                <Text className="text-sm font-semibold mb-2" style={{ color: "#374151" }}>
                  Managers ({managers.length})
                </Text>
                {managers.map((m) => (
                  <React.Fragment key={m.uid}>{renderUser({ item: m })}</React.Fragment>
                ))}
              </View>
            )}
            <View>
              <Text className="text-sm font-semibold mb-2" style={{ color: "#374151" }}>
                Maintainers ({maintainers.length})
              </Text>
              {maintainers.length === 0 ? (
                <Text className="text-sm py-4 text-center" style={{ color: "#9ca3af" }}>
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
