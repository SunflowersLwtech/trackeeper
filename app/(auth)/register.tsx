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
import { Ionicons } from "@expo/vector-icons";
import { signUp, signOut } from "@/services/auth";
import { validateEmail, validatePassword, validateName } from "@/utils/validation";
import { showError, showSuccess } from "@/utils/toast";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const c = useColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const nameError = validateName(name);
    if (nameError) { showError("Name", nameError); return; }
    const emailError = validateEmail(email);
    if (emailError) { showError("Email", emailError); return; }
    const passwordError = validatePassword(password);
    if (passwordError) { showError("Password", passwordError); return; }
    if (!unitNumber.trim()) { showError("Unit", "Unit number is required so the manager can verify you live here."); return; }

    setLoading(true);
    try {
      await signUp(
        email.trim(),
        password,
        name.trim(),
        "tenant",
        unitNumber.trim() || undefined,
        phone.trim() || undefined,
      );
      // Registration succeeds but tenant is pending. Sign back out to clear the
      // logged-in but inactive auth state, then route to the pending screen.
      await signOut().catch(() => {});
      showSuccess("Registration submitted!", "Awaiting manager approval.");
      router.replace("/(auth)/pending");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Registration failed";
      showError("Registration Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {/* Hero header */}
        <View
          style={{
            backgroundColor: c.primary,
            paddingTop: Platform.OS === "ios" ? 60 : 40,
            paddingBottom: 32,
            paddingHorizontal: 24,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 14 }} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={c.background} />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: "800", color: c.background }}>Create your tenant account</Text>
          <Text style={{ fontSize: 13, color: c.background, opacity: 0.9, marginTop: 4 }}>
            Your account will need to be approved by your property manager before you can submit requests.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
          {/* Name */}
          <Field
            label="Full name"
            icon="person-outline"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Wei Liu"
            testID="register-name-input"
            colors={c}
          />

          {/* Email */}
          <Field
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            testID="register-email-input"
            colors={c}
          />

          {/* Password */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 6 }}>
              Password
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 14 }}>
              <Ionicons name="lock-closed-outline" size={18} color={c.textTertiary} />
              <TextInput
                style={{ flex: 1, paddingVertical: 14, paddingLeft: 10, color: c.text, fontSize: 15 }}
                placeholder="At least 6 characters"
                placeholderTextColor={c.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="off"
                textContentType="none"
                accessibilityLabel="Password"
                testID="register-password-input"
              />
              <TouchableOpacity onPress={() => setShowPassword((s) => !s)} accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={c.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Phone */}
          <Field
            label="Phone (optional)"
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            placeholder="+60 12 345 6789"
            keyboardType="phone-pad"
            testID="register-phone-input"
            colors={c}
          />

          {/* Unit Number */}
          <Field
            label="Unit number"
            icon="home-outline"
            value={unitNumber}
            onChangeText={setUnitNumber}
            placeholder="e.g. A-12-03"
            testID="register-unit-number-input"
            colors={c}
          />

          {/* Verification notice */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              padding: 14,
              borderRadius: 14,
              backgroundColor: c.primaryBg,
              marginBottom: 18,
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={c.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: c.primary }}>Verification required</Text>
              <Text style={{ fontSize: 11, color: c.textSecondary, marginTop: 4, lineHeight: 16 }}>
                Manager / maintainer accounts are provisioned by your property administrator. Tenants register here, and must be approved before they can submit maintenance requests.
              </Text>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={{
              backgroundColor: loading ? c.primaryLight : c.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              shadowColor: c.primary,
              shadowOpacity: 0.18,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            }}
            onPress={handleRegister}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            accessibilityState={{ disabled: loading, busy: loading }}
            testID="register-submit-button"
          >
            {loading ? (
              <ActivityIndicator color={c.background} />
            ) : (
              <Text style={{ color: c.background, fontSize: 15, fontWeight: "700" }}>Submit for approval</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: "center", paddingVertical: 16 }}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go to sign in"
            testID="register-signin-link"
          >
            <Text style={{ color: c.textTertiary, fontSize: 13 }}>
              Already have an account?{" "}
              <Text style={{ color: c.primary, fontWeight: "700" }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface FieldProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  testID?: string;
  colors: ReturnType<typeof useColors>;
}

function Field({ label, icon, value, onChangeText, placeholder, keyboardType, testID, colors: c }: FieldProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 6 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 14 }}>
        <Ionicons name={icon} size={18} color={c.textTertiary} />
        <TextInput
          style={{ flex: 1, paddingVertical: 14, paddingLeft: 10, color: c.text, fontSize: 15 }}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          accessibilityLabel={label}
          testID={testID}
        />
      </View>
    </View>
  );
}
