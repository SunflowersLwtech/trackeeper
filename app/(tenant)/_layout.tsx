import { Tabs, Redirect } from "expo-router";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { NotificationBell } from "@/components/ui/NotificationBell";

export default function TenantLayout() {
  const { user } = useAuth();
  const c = useColors();
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === "manager") return <Redirect href="/(manager)" />;
  if (user.role === "maintainer") return <Redirect href="/(maintainer)" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarStyle: { borderTopColor: c.borderLight },
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.text,
        headerShadowVisible: false,
        headerRight: () => (
          <View style={{ marginRight: 12 }}>
            <NotificationBell />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "My Requests",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "New Request",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="[id]" options={{ href: null }} />
      <Tabs.Screen name="edit/[id]" options={{ href: null }} />
    </Tabs>
  );
}
