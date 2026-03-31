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

export default function LoginScreen() {
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
        <View className="flex-1 justify-center px-8 bg-white">
          {/* Header */}
          <View className="items-center mb-12">
            <Text className="text-4xl font-bold" style={{ color: "#3b82f6" }}>
              TracKeeper
            </Text>
            <Text className="text-base mt-2" style={{ color: "#6b7280" }}>
              Property Maintenance Tracking
            </Text>
          </View>

          {/* Form */}
          <View className="mb-6">
            <Text className="text-sm font-medium mb-2" style={{ color: "#374151" }}>
              Email
            </Text>
            <TextInput
              className="border rounded-xl px-4 py-3 text-base"
              style={{ borderColor: "#d1d5db", color: "#111827" }}
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View className="mb-8">
            <Text className="text-sm font-medium mb-2" style={{ color: "#374151" }}>
              Password
            </Text>
            <TextInput
              className="border rounded-xl px-4 py-3 text-base"
              style={{ borderColor: "#d1d5db", color: "#111827" }}
              placeholder="Enter your password"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className="rounded-xl py-4 items-center mb-4"
            style={{ backgroundColor: loading ? "#93c5fd" : "#3b82f6" }}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <TouchableOpacity
            className="items-center py-2"
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={{ color: "#6b7280" }}>
              Don&apos;t have an account?{" "}
              <Text className="font-semibold" style={{ color: "#3b82f6" }}>
                Sign Up
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
