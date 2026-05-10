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
  Modal,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { signIn, requestPasswordReset, TenantAccountInactiveError } from "@/services/auth";
import { validateEmail, validatePassword } from "@/utils/validation";
import { showError, showInfo } from "@/utils/toast";
import { friendlyErrorMessage } from "@/utils/errorMessages";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";

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

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const openResetDialog = () => {
    setResetEmail(email);
    setResetOpen(true);
  };

  const handleResetSubmit = async () => {
    const trimmed = resetEmail.trim();
    if (!trimmed) {
      showError("Email", "Please enter your email.");
      return;
    }
    setResetSubmitting(true);
    try {
      await requestPasswordReset(trimmed);
      // Generic message regardless of whether the email exists — backend
      // already silences user-not-found, do not leak account existence.
      showInfo(
        "Reset link sent",
        "If that email is registered, a reset link has been sent.",
      );
      setResetOpen(false);
      setResetEmail("");
    } catch (e) {
      const msg = friendlyErrorMessage(e, "Could not send reset email. Try again.");
      showError("Reset failed", msg);
    } finally {
      setResetSubmitting(false);
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const personas: DemoPersona[] = [
    { label: "TENANT", email: "alice@demo.trackeeper.app", role: "tenant", icon: "home", color: palette.cobalt500 },
    { label: "MANAGER", email: "manager@demo.trackeeper.app", role: "manager", icon: "briefcase", color: palette.plum500 },
    { label: "MAINTAINER", email: "david@demo.trackeeper.app", role: "maintainer", icon: "construct", color: palette.tomato500 },
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    if (emailError) { showError("Email", emailError); return; }
    const passwordError = validatePassword(password);
    if (passwordError) { showError("Password", passwordError); return; }

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
      const message = friendlyErrorMessage(error, "Unable to sign in. Try again.");
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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brutalist hero — solid cobalt block with hard accent corner */}
        <View
          style={{
            backgroundColor: palette.cobalt500,
            paddingTop: Platform.OS === "ios" ? 66 : 48,
            paddingBottom: 44,
            paddingHorizontal: 24,
            borderBottomWidth: BORDER.heavy,
            borderBottomColor: palette.ink,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Geometric corner blocks */}
          <View
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 190,
              height: 190,
              backgroundColor: palette.mustard500,
              borderWidth: BORDER.heavy,
              borderColor: palette.ink,
              transform: [{ rotate: "12deg" }],
            }}
          />
          <View
            style={{
              position: "absolute",
              right: 30,
              top: 80,
              width: 60,
              height: 60,
              backgroundColor: palette.tomato500,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
            }}
          />
          {/* Diagonal stripe pattern */}
          <View
            style={{
              position: "absolute",
              left: -20,
              bottom: -20,
              width: 140,
              height: 140,
              backgroundColor: palette.lime500,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              transform: [{ rotate: "-8deg" }],
            }}
          />

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], zIndex: 1 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: palette.paper,
                borderWidth: BORDER.base,
                borderColor: palette.ink,
                alignSelf: "flex-start",
                marginBottom: 14,
                ...SHADOW_SM,
              }}
            >
              <Text
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 11,
                  letterSpacing: 1.4,
                  color: palette.ink,
                  fontWeight: "700",
                }}
              >
                ◼ EST. 2026
              </Text>
            </View>
            <Text
              style={{
                fontFamily: FONT.display,
                fontSize: 48,
                fontWeight: "900",
                color: palette.paper,
                letterSpacing: 0,
                lineHeight: 48,
              }}
            >
              TRAC{"\n"}KEEPER
            </Text>
            <View
              style={{
                marginTop: 18,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: palette.ink,
                alignSelf: "flex-start",
                maxWidth: "100%",
              }}
            >
              <Text
                style={{
                  fontFamily: FONT.display,
                  fontSize: 11,
                  fontWeight: "900",
                  color: palette.paper,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
                numberOfLines={2}
              >
                Property maintenance · Real-time
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Form */}
        <Animated.View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: 32,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View pointerEvents="none">
            <Text
              style={{
                fontFamily: FONT.display,
                fontSize: 28,
                fontWeight: "900",
                color: c.text,
                letterSpacing: 0,
                textTransform: "uppercase",
              }}
            >
              Welcome back
            </Text>
            <View
              style={{
                height: BORDER.heavy,
                width: 40,
                backgroundColor: palette.tomato500,
                marginTop: 8,
                marginBottom: 14,
              }}
            />
            <Text
              style={{
                fontFamily: FONT.body,
                fontSize: 14,
                color: c.textBody,
                marginBottom: 28,
                lineHeight: 20,
              }}
            >
              Sign in to manage maintenance requests, track progress, and keep tenants informed.
            </Text>
          </View>

          {/* Email */}
          <FieldLabel>Email</FieldLabel>
          <BrutalInput
            iconName="mail"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="login-email-input"
            accessibilityLabel="Email address"
          />

          {/* Password */}
          <FieldLabel>Password</FieldLabel>
          <BrutalInput
            iconName="lock-closed"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            testID="login-password-input"
            accessibilityLabel="Password"
            trailing={
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} color={palette.ink} />
              </TouchableOpacity>
            }
          />

          {/* Sign in */}
          <TouchableOpacity
            style={{
              backgroundColor: loading ? palette.cobalt300 : palette.cobalt500,
              borderWidth: BORDER.heavy,
              borderColor: palette.ink,
              paddingVertical: 18,
              alignItems: "center",
              marginTop: 24,
              position: "relative",
              zIndex: 30,
              elevation: 30,
              ...SHADOW_MD,
            }}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ disabled: loading, busy: loading }}
            testID="login-submit-button"
          >
            {loading ? (
              <ActivityIndicator color={palette.paper} />
            ) : (
              <View pointerEvents="none" style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: FONT.display,
                    fontSize: 15,
                    fontWeight: "900",
                    color: palette.paper,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  Sign in
                </Text>
                <Ionicons name="arrow-forward" size={18} color={palette.paper} style={{ marginLeft: 8 }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Forgot password link */}
          <TouchableOpacity
            style={{ alignSelf: "flex-end", paddingVertical: 14, marginTop: 4 }}
            onPress={openResetDialog}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
            testID="login-forgot-password-link"
          >
            <Text
              style={{
                fontFamily: FONT.display,
                fontSize: 11,
                fontWeight: "900",
                color: c.textBody,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              Forgot password? →
            </Text>
          </TouchableOpacity>

          {/* Personas */}
          <View style={{ marginTop: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
              <View style={{ flex: 1, height: BORDER.base, backgroundColor: palette.ink }} />
              <Text
                style={{
                  paddingHorizontal: 12,
                  fontFamily: FONT.display,
                  fontSize: 11,
                  fontWeight: "900",
                  color: c.text,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                }}
              >
                Demo personas
              </Text>
              <View style={{ flex: 1, height: BORDER.base, backgroundColor: palette.ink }} />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {personas.map((p) => (
                <TouchableOpacity
                  key={p.role}
                  style={{
                    flexGrow: 1,
                    flexBasis: 96,
                    minWidth: 92,
                    alignItems: "center",
                    minHeight: 90,
                    paddingVertical: 12,
                    paddingHorizontal: 6,
                    borderWidth: BORDER.base,
                    borderColor: palette.ink,
                    backgroundColor: c.surface,
                    ...SHADOW_SM,
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
                      backgroundColor: p.color,
                      borderWidth: BORDER.base,
                      borderColor: palette.ink,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons name={p.icon} size={20} color={p.color === palette.mustard500 ? palette.ink : palette.paper} />
                  </View>
                  <Text
                    style={{
                      fontFamily: FONT.display,
                      fontSize: 10,
                      fontWeight: "900",
                      color: c.text,
                      letterSpacing: 0.2,
                      textAlign: "center",
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text
              style={{
                fontFamily: FONT.mono,
                fontSize: 10,
                color: c.textMuted,
                textAlign: "center",
                marginTop: 12,
                letterSpacing: 0.4,
              }}
            >
              Tap a persona, then sign in.
            </Text>
          </View>

          {/* Sign-up */}
          <TouchableOpacity
            style={{ alignItems: "center", paddingVertical: 16, marginTop: 16 }}
            onPress={() => router.push("/(auth)/register")}
            accessibilityRole="button"
            accessibilityLabel="Go to sign up"
            testID="login-signup-link"
          >
            <Text
              style={{
                fontFamily: FONT.body,
                color: c.textBody,
                fontSize: 13,
                lineHeight: 18,
                textAlign: "center",
              }}
            >
              New tenant?
            </Text>
            <Text
              style={{
                marginTop: 2,
                fontFamily: FONT.display,
                fontSize: 12,
                fontWeight: "900",
                color: palette.cobalt500,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                textAlign: "center",
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Create account →
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Forgot-password modal */}
      <Modal
        visible={resetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !resetSubmitting && setResetOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: c.overlay, justifyContent: "center", paddingHorizontal: 24 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => !resetSubmitting && setResetOpen(false)}
          />
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
                fontSize: 20,
                fontWeight: "900",
                color: c.text,
                letterSpacing: 0,
                textTransform: "uppercase",
              }}
            >
              Reset your password
            </Text>
            <View style={{ height: BORDER.base, backgroundColor: palette.cobalt500, width: 40, marginVertical: 10 }} />
            <Text style={{ fontFamily: FONT.body, fontSize: 13, color: c.textBody, lineHeight: 18 }}>
              Enter your email — we'll send you a reset link.
            </Text>
            <Text
              style={{
                fontFamily: FONT.display,
                fontSize: 11,
                fontWeight: "900",
                color: palette.ink,
                marginTop: 16,
                marginBottom: 6,
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}
            >
              ◼ Email
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: BORDER.base,
                borderColor: palette.ink,
                paddingHorizontal: 14,
                backgroundColor: c.background,
                ...SHADOW_SM,
              }}
            >
              <Ionicons name="mail" size={18} color={palette.ink} />
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingLeft: 10,
                  color: c.text,
                  fontFamily: FONT.body,
                  fontSize: 15,
                }}
                placeholder="you@example.com"
                placeholderTextColor={c.textMuted}
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Email for password reset"
                testID="forgot-password-email-input"
              />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 18, gap: 10 }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                  backgroundColor: c.surface,
                  ...SHADOW_SM,
                  opacity: resetSubmitting ? 0.5 : 1,
                }}
                onPress={() => {
                  setResetOpen(false);
                  setResetEmail("");
                }}
                disabled={resetSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Cancel password reset"
              >
                <Text style={{ color: palette.ink, fontFamily: FONT.display, fontSize: 12, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  backgroundColor: palette.cobalt500,
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                  ...SHADOW_SM,
                  flexDirection: "row",
                  alignItems: "center",
                  opacity: resetSubmitting ? 0.7 : 1,
                }}
                onPress={handleResetSubmit}
                disabled={resetSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Send reset link"
                testID="forgot-password-submit"
              >
                {resetSubmitting ? (
                  <ActivityIndicator color={palette.paper} size="small" />
                ) : (
                  <Text style={{ color: palette.paper, fontFamily: FONT.display, fontSize: 12, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" }}>
                    Send reset link
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: FONT.display,
        fontSize: 11,
        fontWeight: "900",
        color: palette.ink,
        marginBottom: 6,
        letterSpacing: 0.8,
        textTransform: "uppercase",
      }}
    >
      ◼ {children}
    </Text>
  );
}

interface BrutalInputProps {
  iconName: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  testID?: string;
  accessibilityLabel?: string;
  trailing?: React.ReactNode;
}

function BrutalInput({
  iconName,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  testID,
  accessibilityLabel,
  trailing,
}: BrutalInputProps) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: BORDER.base,
        borderColor: palette.ink,
        borderRadius: RADIUS.xs,
        paddingHorizontal: 14,
        backgroundColor: c.surface,
        marginBottom: 16,
        ...SHADOW_SM,
      }}
    >
      <Ionicons name={iconName} size={18} color={palette.ink} />
      <TextInput
        style={{
          flex: 1,
          paddingVertical: 14,
          paddingLeft: 12,
          color: c.text,
          fontFamily: FONT.body,
          fontSize: 15,
        }}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        autoComplete="off"
        textContentType="none"
        secureTextEntry={secureTextEntry}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      />
      {trailing}
    </View>
  );
}
