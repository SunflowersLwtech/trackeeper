import "../global.css";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
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

  React.useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) return <LoadingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!user && user.role === "tenant"}>
        <Stack.Screen name="(tenant)" />
      </Stack.Protected>
      <Stack.Protected guard={!!user && user.role === "manager"}>
        <Stack.Screen name="(manager)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
