import "../global.css";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import Toast from "react-native-toast-message";
import { toastConfig } from "@/components/ui/Toast";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppErrorBoundary } from "@/components/ErrorBoundary";
import { VerifyEmailBanner } from "@/components/ui/VerifyEmailBanner";
import { WebContainer } from "@/components/ui/WebContainer";
import { useNotifications } from "@/hooks/useNotifications";
import { shouldShowOnboarding } from "@/services/onboarding";
import { addNotificationResponseListener } from "@/services/notifications";
import Colors from "@/constants/Colors";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.background }}>
      <ActivityIndicator size="large" color={Colors.light.primary} />
    </View>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  useNotifications();

  React.useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  // OS push tap → deep link into the right detail screen.
  React.useEffect(() => {
    if (!user) return;
    const sub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as
        | { ticketId?: string; messageId?: string }
        | undefined;
      const ticketId = data?.ticketId;
      if (!ticketId) return;
      const role = user.role;
      const target =
        role === "manager"
          ? `/(manager)/${ticketId}`
          : role === "maintainer"
            ? `/(maintainer)/${ticketId}`
            : `/(tenant)/${ticketId}`;
      router.push(target as never);
    });
    return () => sub.remove();
  }, [user, router]);

  React.useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }
    if (user && inAuthGroup) {
      // Just signed in — onboarding-eligible users go to the carousel first.
      if (shouldShowOnboarding(user)) {
        router.replace("/onboarding");
      } else if (user.role === "manager") {
        router.replace("/(manager)");
      } else if (user.role === "maintainer") {
        router.replace("/(maintainer)");
      } else {
        router.replace("/(tenant)");
      }
      return;
    }
    // Existing session that hasn't seen the current onboarding version.
    if (user && !inOnboarding && shouldShowOnboarding(user)) {
      router.replace("/onboarding");
    }
  }, [user, loading, segments, router]);

  if (loading) return <LoadingScreen />;

  const inAuthGroup = segments[0] === "(auth)";
  // Mobile-app width on web: cap the viewport at 480px (mobile-class) so login,
  // onboarding and the role tabs all read like a native app rather than a
  // stretched desktop site. Native (iOS/Android) renders WebContainer as a
  // pass-through.
  return (
    <WebContainer maxWidth={480}>
      <View style={{ flex: 1 }}>
        {user && !inAuthGroup ? <VerifyEmailBanner /> : null}
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
      </View>
    </WebContainer>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
        <AuthProvider>
          <RootNavigator />
          <Toast config={toastConfig} />
        </AuthProvider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}
