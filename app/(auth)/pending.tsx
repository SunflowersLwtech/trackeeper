import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { auth } from "@/config/firebase";
import { signIn, getUserProfile, TenantAccountInactiveError, signOut } from "@/services/auth";
import { useColors } from "@/hooks/useColors";
import { showInfo, showError } from "@/utils/toast";
import { withOpacity } from "@/utils/color";

/**
 * Tenant waiting screen — shown after a successful registration but before
 * the manager has approved the account. Polls profile status on demand.
 */
export default function PendingApprovalScreen() {
  const c = useColors();
  const [checking, setChecking] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

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
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: Platform.OS === "ios" ? 70 : 50 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <Animated.View
          style={{
            transform: [{ scale: pulseAnim }],
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: withOpacity(c.warning, 0.16),
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: withOpacity(c.warning, 0.28),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="hourglass-outline" size={40} color={c.warning} />
          </View>
        </Animated.View>

        <Text style={{ fontSize: 22, fontWeight: "800", color: c.text, textAlign: "center" }}>
          Awaiting manager approval
        </Text>
        <Text style={{ fontSize: 14, color: c.textTertiary, textAlign: "center", marginTop: 12, lineHeight: 22 }}>
          Your registration was submitted successfully. The property manager will review your details and approve your account shortly. You will be able to sign in once approved.
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 24, padding: 14, borderRadius: 14, backgroundColor: c.surface }}>
          <Ionicons name="information-circle-outline" size={18} color={c.primary} />
          <Text style={{ marginLeft: 10, fontSize: 12, color: c.textSecondary, flex: 1 }}>
            You can return to this screen anytime by signing in. Once approved, your account will unlock automatically.
          </Text>
        </View>

        <TouchableOpacity
          style={{
            marginTop: 28,
            paddingVertical: 14,
            paddingHorizontal: 22,
            borderRadius: 12,
            backgroundColor: checking ? c.primaryLight : c.primary,
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={checkAgain}
          disabled={checking}
          accessibilityRole="button"
          accessibilityLabel="Check approval status"
          testID="pending-check-button"
        >
          {checking ? (
            <ActivityIndicator color={c.background} />
          ) : (
            <>
              <Ionicons name="refresh" size={16} color={c.background} />
              <Text style={{ color: c.background, fontSize: 14, fontWeight: "700", marginLeft: 8 }}>Check status</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 16, padding: 8 }}
          onPress={goToLogin}
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          testID="pending-login-button"
        >
          <Text style={{ color: c.textTertiary, fontSize: 13 }}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
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
