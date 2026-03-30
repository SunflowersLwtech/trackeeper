import { Stack, Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthLayout() {
  const { user } = useAuth();

  // If already logged in, redirect to appropriate dashboard
  if (user?.role === "tenant") return <Redirect href="/(tenant)" />;
  if (user?.role === "manager") return <Redirect href="/(manager)" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
