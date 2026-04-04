import "../global.css";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import Toast from "react-native-toast-message";
import { toastConfig } from "@/components/ui/Toast";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppErrorBoundary } from "@/components/ErrorBoundary";
import { useNotifications } from "@/hooks/useNotifications";
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

  React.useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      if (user.role === "manager") {
        router.replace("/(manager)");
      } else if (user.role === "maintainer") {
        router.replace("/(maintainer)");
      } else {
        router.replace("/(tenant)");
      }
    }
  }, [user, loading, segments, router]);

  if (loading) return <LoadingScreen />;

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <RootNavigator />
        <Toast config={toastConfig} />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
