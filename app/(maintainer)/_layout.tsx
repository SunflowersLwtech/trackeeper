import { Tabs, Redirect } from "expo-router";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { NotificationBell } from "@/components/ui/NotificationBell";

export default function MaintainerLayout() {
  const { user } = useAuth();
  const c = useColors();
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === "tenant") return <Redirect href="/(tenant)" />;
  if (user.role === "manager") return <Redirect href="/(manager)" />;

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
          title: "My Tasks",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
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
    </Tabs>
  );
}
