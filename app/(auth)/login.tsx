import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { signIn, TenantAccountInactiveError } from "@/services/auth";
import { validateEmail, validatePassword } from "@/utils/validation";
import { showError, showInfo } from "@/utils/toast";
import { useColors } from "@/hooks/useColors";
import { withOpacity } from "@/utils/color";

interface DemoPersona {
  label: string;
  email: string;
  role: "tenant" | "manager" | "maintainer";
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function LoginScreen() {
  const c = useColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const personas: DemoPersona[] = [
    { label: "Tenant", email: "alice@demo.trackeeper.app", role: "tenant", icon: "home-outline", color: c.primary },
    { label: "Manager", email: "manager@demo.trackeeper.app", role: "manager", icon: "briefcase-outline", color: c.violet },
    { label: "Maintainer", email: "david@demo.trackeeper.app", role: "maintainer", icon: "construct-outline", color: c.warning },
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      showError("Email", emailError);
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      showError("Password", passwordError);
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (error: unknown) {
      if (error instanceof TenantAccountInactiveError) {
        if (error.status === "pending_approval") {
          showInfo("Awaiting approval", "Your account is pending manager approval.");
          router.replace("/(auth)/pending");
          return;
        }
        showError(
          error.status === "suspended" ? "Account suspended" : "Account rejected",
          error.rejectionReason || error.message,
        );
        return;
      }
      const message = error instanceof Error ? error.message : "Login failed";
      showError("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (persona: DemoPersona) => {
    setEmail(persona.email);
    setPassword("Demo1234!");
    showInfo(persona.label, "Demo credentials filled — tap Sign in.");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero — gradient-ish background using overlapping circles */}
        <View
          style={{
            backgroundColor: c.primary,
            paddingTop: Platform.OS === "ios" ? 70 : 50,
            paddingBottom: 48,
            paddingHorizontal: 24,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            overflow: "hidden",
          }}
        >
          {/* Decorative bubbles */}
          <View style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: withOpacity(c.background, 0.08) }} />
          <View style={{ position: "absolute", left: -30, bottom: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: withOpacity(c.background, 0.06) }} />

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: withOpacity(c.background, 0.18),
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="home" size={22} color={c.background} />
              </View>
              <View>
                <Text style={{ fontSize: 28, fontWeight: "800", color: c.background, letterSpacing: -0.5 }}>
                  TracKeeper
                </Text>
                <Text style={{ fontSize: 12, color: withOpacity(c.background, 0.85), marginTop: 2 }}>
                  Property Maintenance, in real time
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Form */}
        <Animated.View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: 28,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "700", color: c.text, marginBottom: 4 }}>
            Welcome back
          </Text>
          <Text style={{ fontSize: 14, color: c.textTertiary, marginBottom: 24 }}>
            Sign in to manage maintenance requests, track progress, and keep tenants informed.
          </Text>

          {/* Email */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 6 }}>
              Email
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 14,
                paddingHorizontal: 14,
              }}
            >
              <Ionicons name="mail-outline" size={18} color={c.textTertiary} />
              <TextInput
                style={{ flex: 1, paddingVertical: 14, paddingLeft: 10, color: c.text, fontSize: 15 }}
                placeholder="you@example.com"
                placeholderTextColor={c.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                accessibilityLabel="Email address"
                testID="login-email-input"
              />
            </View>
          </View>

          {/* Password */}
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 6 }}>
              Password
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 14,
                paddingHorizontal: 14,
              }}
            >
              <Ionicons name="lock-closed-outline" size={18} color={c.textTertiary} />
              <TextInput
                style={{ flex: 1, paddingVertical: 14, paddingLeft: 10, color: c.text, fontSize: 15 }}
                placeholder="••••••••"
                placeholderTextColor={c.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="off"
                textContentType="none"
                accessibilityLabel="Password"
                testID="login-password-input"
              />
              <TouchableOpacity onPress={() => setShowPassword((s) => !s)} accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={c.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign in button */}
          <TouchableOpacity
            style={{
              backgroundColor: loading ? c.primaryLight : c.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              marginTop: 18,
              shadowColor: c.primary,
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
            }}
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
              <Text style={{ color: c.background, fontSize: 15, fontWeight: "700" }}>
                Sign in
              </Text>
            )}
          </TouchableOpacity>

          {/* Demo personas */}
          <View style={{ marginTop: 28 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: c.borderLight }} />
              <Text style={{ paddingHorizontal: 10, fontSize: 11, fontWeight: "600", color: c.textMuted, letterSpacing: 0.4 }}>
                DEMO PERSONAS
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: c.borderLight }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {personas.map((p) => (
                <TouchableOpacity
                  key={p.role}
                  style={{
                    flex: 1,
                    flexDirection: "column",
                    alignItems: "center",
                    paddingVertical: 14,
                    paddingHorizontal: 8,
                    borderWidth: 1,
                    borderColor: c.borderLight,
                    borderRadius: 14,
                    marginHorizontal: 4,
                    backgroundColor: c.surface,
                  }}
                  onPress={() => fillDemo(p)}
                  accessibilityRole="button"
                  accessibilityLabel={`Fill demo ${p.label} credentials`}
                  testID={`login-demo-${p.role}`}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: withOpacity(p.color, 0.14),
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Ionicons name={p.icon} size={20} color={p.color} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 10, color: c.textMuted, textAlign: "center", marginTop: 10 }}>
              Tap a persona to autofill credentials, then Sign in.
            </Text>
          </View>

          {/* Sign-up link */}
          <TouchableOpacity
            style={{ alignItems: "center", paddingVertical: 16, marginTop: 20 }}
            onPress={() => router.push("/(auth)/register")}
            accessibilityRole="button"
            accessibilityLabel="Go to sign up"
            testID="login-signup-link"
          >
            <Text style={{ color: c.textTertiary, fontSize: 13 }}>
              New tenant?{" "}
              <Text style={{ color: c.primary, fontWeight: "700" }}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
