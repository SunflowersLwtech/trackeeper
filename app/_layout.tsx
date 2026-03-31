import "../global.css";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import Toast from "react-native-toast-message";
import { toastConfig } from "@/components/ui/Toast";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

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
  }, [user, loading, segments]);

  if (loading) return <LoadingScreen />;

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
      <Toast config={toastConfig} />
    </AuthProvider>
  );
}
