import React, { useState } from "react";
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
import { router } from "expo-router";
import { signUp } from "@/services/auth";
// Tenant-only public registration; manager/maintainer provisioned by admin
import { validateEmail, validatePassword, validateName } from "@/utils/validation";
import { showError } from "@/utils/toast";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const nameError = validateName(name);
    if (nameError) { showError("Error", nameError); return; }
    const emailError = validateEmail(email);
    if (emailError) { showError("Error", emailError); return; }
    const passwordError = validatePassword(password);
    if (passwordError) { showError("Error", passwordError); return; }

    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim(), "tenant", unitNumber.trim() || undefined);
      // Navigation handled by AuthContext + Stack.Protected
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Registration failed";
      showError("Registration Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-8 bg-white">
          {/* Header */}
          <View className="items-center mb-10">
            <Text className="text-3xl font-bold" style={{ color: "#3b82f6" }}>
              Create Account
            </Text>
            <Text className="text-sm mt-1" style={{ color: "#6b7280" }}>
              Join TracKeeper
            </Text>
          </View>

          {/* Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-1" style={{ color: "#374151" }}>Name</Text>
            <TextInput
              className="border rounded-xl px-4 py-3 text-base"
              style={{ borderColor: "#d1d5db", color: "#111827" }}
              placeholder="Your full name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              accessibilityLabel="Full name"
              testID="register-name-input"
            />
          </View>

          {/* Email */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-1" style={{ color: "#374151" }}>Email</Text>
            <TextInput
              className="border rounded-xl px-4 py-3 text-base"
              style={{ borderColor: "#d1d5db", color: "#111827" }}
              placeholder="your@email.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              accessibilityLabel="Email address"
              testID="register-email-input"
            />
          </View>

          {/* Password */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-1" style={{ color: "#374151" }}>Password</Text>
            <TextInput
              className="border rounded-xl px-4 py-3 text-base"
              style={{ borderColor: "#d1d5db", color: "#111827" }}
              placeholder="At least 6 characters"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="off"
              textContentType="none"
              accessibilityLabel="Password"
              accessibilityHint="At least 6 characters"
              testID="register-password-input"
            />
          </View>

          {/* Role Info */}
          <View className="mb-4 p-3 rounded-xl" style={{ backgroundColor: "#f9fafb" }}>
            <Text className="text-sm font-medium" style={{ color: "#374151" }}>
              Registering as: <Text style={{ color: "#3b82f6" }}>Tenant</Text>
            </Text>
            <Text className="text-xs mt-1" style={{ color: "#9ca3af" }}>
              Manager and Maintainer accounts are provisioned by your property administrator.
            </Text>
          </View>

          {/* Unit Number */}
          <View className="mb-6">
            <Text className="text-sm font-medium mb-1" style={{ color: "#374151" }}>
              Unit Number
            </Text>
            <TextInput
              className="border rounded-xl px-4 py-3 text-base"
              style={{ borderColor: "#d1d5db", color: "#111827" }}
              placeholder="e.g. A-12-03"
              placeholderTextColor="#9ca3af"
              value={unitNumber}
              onChangeText={setUnitNumber}
              accessibilityLabel="Unit number"
              testID="register-unit-number-input"
            />
          </View>

          {/* Register Button */}
          <TouchableOpacity
            className="rounded-xl py-4 items-center mb-4"
            style={{ backgroundColor: loading ? "#93c5fd" : "#3b82f6" }}
            onPress={handleRegister}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            accessibilityState={{ disabled: loading, busy: loading }}
            testID="register-submit-button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity
            className="items-center py-2"
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go to sign in"
            testID="register-signin-link"
          >
            <Text style={{ color: "#6b7280" }}>
              Already have an account?{" "}
              <Text className="font-semibold" style={{ color: "#3b82f6" }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
