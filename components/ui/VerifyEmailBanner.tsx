import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "@/config/firebase";
import { sendCurrentUserEmailVerification } from "@/services/auth";
import { showSuccess, showError, showInfo } from "@/utils/toast";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_SM } from "@/constants/Brutalism";

/**
 * Global "please verify your email" banner. Shown to any signed-in user whose
 * Firebase auth.currentUser.emailVerified === false, until they verify or
 * dismiss it for the current session.
 */
export function VerifyEmailBanner() {
  // Account for the iOS status bar / Dynamic Island so the banner sits below
  // the clock + signal icons. Pixel/Android also has a status bar inset.
  const insets = useSafeAreaInsets();
  const [needsVerify, setNeedsVerify] = useState<boolean>(
    () => auth.currentUser != null && !auth.currentUser.emailVerified,
  );
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);

  // Re-evaluate when auth state changes (sign-in, profile reload, etc.)
  useEffect(() => {
    return auth.onIdTokenChanged((u) => {
      setNeedsVerify(u != null && !u.emailVerified);
    });
  }, []);

  if (!needsVerify || dismissed) return null;

  const onResend = async () => {
    setResending(true);
    try {
      const sent = await sendCurrentUserEmailVerification();
      if (!sent) {
        // Already verified — pull a fresh token and let the banner unmount.
        await auth.currentUser?.reload().catch(() => {});
        setNeedsVerify(auth.currentUser != null && !auth.currentUser.emailVerified);
        showInfo("Already verified", "Welcome — your email is confirmed.");
        return;
      }
      showSuccess("Sent", "Check your inbox");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not send";
      showError("Couldn't send", msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <View
      testID="verify-email-banner"
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingTop: 10 + insets.top,
        paddingBottom: 10,
        backgroundColor: palette.mustard50,
        borderBottomWidth: BORDER.base,
        borderBottomColor: palette.ink,
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
        <Ionicons name="mail-unread" size={16} color={palette.ink} />
      </View>
      <Text
        // flexShrink lets the Resend / close buttons keep their full width on
        // narrow screens — text gets truncated with ellipsis instead of pushing
        // the buttons off-screen (Pixel 7 width ~412dp originally clipped the X).
        numberOfLines={2}
        ellipsizeMode="tail"
        style={{
          flex: 1,
          flexShrink: 1,
          minWidth: 0,
          marginLeft: 10,
          marginRight: 8,
          fontFamily: FONT.body,
          fontSize: 12,
          color: palette.ink,
          lineHeight: 16,
        }}
      >
        Verify your email to keep your account active.
      </Text>
      <TouchableOpacity
        style={{
          flexShrink: 0,
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: palette.cobalt500,
          borderWidth: BORDER.base,
          borderColor: palette.ink,
          ...SHADOW_SM,
          opacity: resending ? 0.7 : 1,
        }}
        onPress={onResend}
        disabled={resending}
        accessibilityRole="button"
        accessibilityLabel="Resend verification email"
        testID="verify-email-resend"
      >
        {resending ? (
          <ActivityIndicator size="small" color={palette.paper} />
        ) : (
          <Text
            style={{
              fontFamily: FONT.display,
              fontSize: 10,
              fontWeight: "900",
              color: palette.paper,
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            Resend
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          flexShrink: 0,
          marginLeft: 6,
          width: 28,
          height: 28,
          alignItems: "center",
          justifyContent: "center",
        }}
        onPress={() => setDismissed(true)}
        accessibilityRole="button"
        accessibilityLabel="Dismiss verification banner"
        testID="verify-email-dismiss"
      >
        <Ionicons name="close" size={18} color={palette.ink} />
      </TouchableOpacity>
    </View>
  );
}
