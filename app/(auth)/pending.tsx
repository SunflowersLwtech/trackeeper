import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "@/config/firebase";
import { signIn, getUserProfile, TenantAccountInactiveError, signOut } from "@/services/auth";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";
import { showInfo, showError } from "@/utils/toast";

export default function PendingApprovalScreen() {
  const c = useColors();
  const [checking, setChecking] = useState(false);
  const tickerAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compactHeight = height - insets.top - insets.bottom < 700;

  useEffect(() => {
    Animated.loop(
      Animated.timing(tickerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [tickerAnim]);

  const checkAgain = async () => {
    setChecking(true);
    try {
      const fbUser = auth.currentUser;
      if (!fbUser) {
        showInfo("Not signed in", "Please sign in again to check your status.");
        router.replace("/(auth)/login");
        return;
      }
      const profile = await getUserProfile(fbUser.uid);
      if (profile?.status === "active") {
        showInfo("You're approved!", "Welcome to TracKeeper.");
        router.replace("/(tenant)");
      } else if (profile?.status === "rejected") {
        showError("Application rejected", profile.rejectionReason || "Please contact your manager.");
      } else {
        showInfo("Still pending", "Your manager has not approved your account yet.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not check status";
      showError("Error", message);
    } finally {
      setChecking(false);
    }
  };

  const goToLogin = async () => {
    await signOut().catch(() => {});
    router.replace("/(auth)/login");
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.background,
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 28,
          paddingTop: Math.max(24, insets.top + 18),
          paddingBottom: Math.max(28, insets.bottom + 24),
        }}
      >
        {/* Brutalist tag */}
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: palette.mustard500,
            borderWidth: BORDER.base,
            borderColor: palette.ink,
            marginBottom: compactHeight ? 18 : 28,
            ...SHADOW_SM,
          }}
        >
          <Text
            style={{
              fontFamily: FONT.display,
              fontSize: 11,
              fontWeight: "900",
              color: palette.ink,
              letterSpacing: 1.6,
              textTransform: "uppercase",
            }}
          >
            ◼ Status · Pending
          </Text>
        </View>

        {/* Hourglass card */}
        <View
          style={{
            width: compactHeight ? 112 : 140,
            height: compactHeight ? 112 : 140,
            backgroundColor: palette.mustard500,
            borderWidth: BORDER.heavy,
            borderColor: palette.ink,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: compactHeight ? 22 : 32,
            ...SHADOW_MD,
          }}
        >
          <Ionicons name="hourglass" size={compactHeight ? 52 : 64} color={palette.ink} />
        </View>

        <Text
          style={{
            fontFamily: FONT.display,
            fontSize: 28,
            fontWeight: "900",
            color: c.text,
            textAlign: "center",
            letterSpacing: 0,
            lineHeight: 32,
            textTransform: "uppercase",
          }}
        >
          Awaiting{"\n"}manager approval
        </Text>
        <Text
          style={{
            fontFamily: FONT.body,
            fontSize: 14,
            color: c.textBody,
            textAlign: "center",
            marginTop: 14,
            lineHeight: 20,
            maxWidth: 400,
          }}
        >
          Your registration was submitted. The property manager will review and approve your account shortly. You'll be able to sign in once approved.
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginTop: compactHeight ? 20 : 28,
            padding: 14,
            borderWidth: BORDER.base,
            borderColor: palette.ink,
            backgroundColor: c.surface,
            ...SHADOW_SM,
            maxWidth: 420,
          }}
        >
          <Ionicons name="information-circle" size={20} color={palette.cobalt500} />
          <Text style={{ marginLeft: 10, fontFamily: FONT.body, fontSize: 12, color: c.textBody, flex: 1, lineHeight: 16 }}>
            Return here anytime by signing in. Once approved, your account unlocks automatically.
          </Text>
        </View>

        <TouchableOpacity
          style={{
            marginTop: compactHeight ? 22 : 32,
            paddingVertical: 16,
            paddingHorizontal: 28,
            borderWidth: BORDER.heavy,
            borderColor: palette.ink,
            backgroundColor: checking ? palette.cobalt300 : palette.cobalt500,
            flexDirection: "row",
            alignItems: "center",
            ...SHADOW_MD,
          }}
          onPress={checkAgain}
          disabled={checking}
          accessibilityRole="button"
          accessibilityLabel="Check approval status"
          testID="pending-check-button"
        >
          {checking ? (
            <ActivityIndicator color={palette.paper} />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color={palette.paper} />
              <Text
                style={{
                  color: palette.paper,
                  fontFamily: FONT.display,
                  fontSize: 14,
                  fontWeight: "900",
                  marginLeft: 10,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Check status
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 18, padding: 10 }}
          onPress={goToLogin}
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          testID="pending-login-button"
        >
          <Text
            style={{
              fontFamily: FONT.display,
              color: c.textBody,
              fontSize: 12,
              fontWeight: "900",
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            ← Back to sign in
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/** Helper used by the LoginScreen when it detects pending status. */
export async function tryAutoSignIn(email: string, password: string) {
  try {
    await signIn(email, password);
  } catch (e) {
    if (e instanceof TenantAccountInactiveError && e.status === "pending_approval") {
      router.replace("/(auth)/pending");
    } else {
      throw e;
    }
  }
}
