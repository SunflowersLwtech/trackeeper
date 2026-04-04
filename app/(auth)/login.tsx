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
import { signIn } from "@/services/auth";
import { validateEmail, validatePassword } from "@/utils/validation";
import { showError } from "@/utils/toast";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const c = useColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      showError("Error", emailError);
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      showError("Error", passwordError);
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Navigation handled by AuthContext + Stack.Protected
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Login failed";
      showError("Login Failed", message);
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
        <View className="flex-1 justify-center px-8" style={{ backgroundColor: c.background }}>
          {/* Header */}
          <View className="items-center mb-12">
            <Text className="text-4xl font-bold" style={{ color: c.primary }}>
              TracKeeper
            </Text>
            <Text className="text-base mt-2" style={{ color: c.textTertiary }}>
              Property Maintenance Tracking
            </Text>
          </View>

          {/* Form */}
          <View className="mb-6">
            <Text className="text-sm font-medium mb-2" style={{ color: c.textSecondary }}>
              Email
            </Text>
            <TextInput
              className="border rounded-xl px-4 py-3 text-base"
              style={{ borderColor: c.border, color: c.text }}
              placeholder="Enter your email"
              placeholderTextColor={c.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              accessibilityLabel="Email address"
              accessibilityHint="Enter your email to sign in"
              testID="login-email-input"
            />
          </View>

          <View className="mb-8">
            <Text className="text-sm font-medium mb-2" style={{ color: c.textSecondary }}>
              Password
            </Text>
            <TextInput
              className="border rounded-xl px-4 py-3 text-base"
              style={{ borderColor: c.border, color: c.text }}
              placeholder="Enter your password"
              placeholderTextColor={c.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="off"
              textContentType="none"
              accessibilityLabel="Password"
              accessibilityHint="Enter your password to sign in"
              testID="login-password-input"
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className="rounded-xl py-4 items-center mb-4"
            style={{ backgroundColor: loading ? c.primaryLight : c.primary }}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ disabled: loading, busy: loading }}
            testID="login-submit-button"
          >
            {loading ? (
              <ActivityIndicator color={c.background} />
            ) : (
              <Text className="text-white text-base font-semibold">Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <TouchableOpacity
            className="items-center py-2"
            onPress={() => router.push("/(auth)/register")}
            accessibilityRole="button"
            accessibilityLabel="Go to sign up"
            testID="login-signup-link"
          >
            <Text style={{ color: c.textTertiary }}>
              Don&apos;t have an account?{" "}
              <Text className="font-semibold" style={{ color: c.primary }}>
                Sign Up
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
