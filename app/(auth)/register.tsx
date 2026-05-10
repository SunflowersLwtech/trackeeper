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
import { friendlyErrorMessage } from "@/utils/errorMessages";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";

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
      await signOut().catch(() => {});
      showSuccess("Registration submitted!", "Awaiting manager approval.");
      router.replace("/(auth)/pending");
    } catch (error: unknown) {
      const message = friendlyErrorMessage(error, "Registration failed. Try again.");
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
        {/* Brutalist hero */}
        <View
          style={{
            backgroundColor: palette.tomato500,
            paddingTop: Platform.OS === "ios" ? 60 : 40,
            paddingBottom: 36,
            paddingHorizontal: 24,
            borderBottomWidth: BORDER.heavy,
            borderBottomColor: palette.ink,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              marginBottom: 18,
              width: 42,
              height: 42,
              backgroundColor: palette.paper,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              alignItems: "center",
              justifyContent: "center",
              ...SHADOW_SM,
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={palette.ink} />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: FONT.display,
              fontSize: 32,
              fontWeight: "900",
              color: palette.paper,
              letterSpacing: -1.4,
              lineHeight: 34,
              textTransform: "uppercase",
            }}
          >
            Create your{"\n"}tenant account
          </Text>
          <View
            style={{
              marginTop: 14,
              padding: 10,
              backgroundColor: palette.paper,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              alignSelf: "flex-start",
              ...SHADOW_SM,
            }}
          >
            <Text
              style={{
                fontFamily: FONT.body,
                fontSize: 12,
                color: palette.ink,
                lineHeight: 16,
                maxWidth: 320,
              }}
            >
              Your manager must approve before you can submit requests.
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 28 }}>
          <Field label="Full name" icon="person" value={name} onChangeText={setName} placeholder="e.g. Wei Liu" testID="register-name-input" colors={c} />
          <Field label="Email" icon="mail" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" testID="register-email-input" colors={c} />

          {/* Password (custom for show/hide) */}
          <View style={{ marginBottom: 16 }}>
            <FieldLabel>Password</FieldLabel>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: BORDER.base,
                borderColor: palette.ink,
                paddingHorizontal: 14,
                backgroundColor: c.surface,
                ...SHADOW_SM,
              }}
            >
              <Ionicons name="lock-closed" size={18} color={palette.ink} />
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingLeft: 10,
                  color: c.text,
                  fontFamily: FONT.body,
                  fontSize: 15,
                }}
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
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} color={palette.ink} />
              </TouchableOpacity>
            </View>
          </View>

          <Field label="Phone (optional)" icon="call" value={phone} onChangeText={setPhone} placeholder="+60 12 345 6789" keyboardType="phone-pad" testID="register-phone-input" colors={c} />
          <Field label="Unit number" icon="home" value={unitNumber} onChangeText={setUnitNumber} placeholder="e.g. A-12-03" testID="register-unit-number-input" colors={c} />

          {/* Verification notice */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              padding: 14,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              backgroundColor: palette.mustard50,
              marginBottom: 22,
              ...SHADOW_SM,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                backgroundColor: palette.mustard500,
                borderWidth: 1.5,
                borderColor: palette.ink,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="shield-checkmark" size={18} color={palette.ink} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{
                  fontFamily: FONT.display,
                  fontSize: 11,
                  fontWeight: "900",
                  color: palette.ink,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                Verification required
              </Text>
              <Text style={{ fontFamily: FONT.body, fontSize: 12, color: palette.ink, marginTop: 4, lineHeight: 16 }}>
                Managers / maintainers are provisioned by your administrator. Tenants self-register and must be approved before submitting requests.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: loading ? palette.cobalt300 : palette.cobalt500,
              borderWidth: BORDER.heavy,
              borderColor: palette.ink,
              paddingVertical: 18,
              alignItems: "center",
              ...SHADOW_MD,
            }}
            onPress={handleRegister}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            accessibilityState={{ disabled: loading, busy: loading }}
            testID="register-submit-button"
          >
            {loading ? (
              <ActivityIndicator color={palette.paper} />
            ) : (
              <Text
                style={{
                  color: palette.paper,
                  fontFamily: FONT.display,
                  fontSize: 15,
                  fontWeight: "900",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Submit for approval
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: "center", paddingVertical: 18 }}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go to sign in"
            testID="register-signin-link"
          >
            <Text style={{ fontFamily: FONT.body, color: c.textBody, fontSize: 13 }}>
              Already have an account?{" "}
              <Text
                style={{
                  fontFamily: FONT.display,
                  color: palette.cobalt500,
                  fontWeight: "900",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Sign in →
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    <View style={{ marginBottom: 16 }}>
      <FieldLabel>{label}</FieldLabel>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: BORDER.base,
          borderColor: palette.ink,
          paddingHorizontal: 14,
          backgroundColor: c.surface,
          ...SHADOW_SM,
        }}
      >
        <Ionicons name={icon} size={18} color={palette.ink} />
        <TextInput
          style={{
            flex: 1,
            paddingVertical: 14,
            paddingLeft: 10,
            color: c.text,
            fontFamily: FONT.body,
            fontSize: 15,
          }}
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
