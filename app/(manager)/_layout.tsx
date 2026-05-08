import { Tabs, Redirect } from "expo-router";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { usePendingTenants } from "@/hooks/usePendingTenants";
import { NotificationBell } from "@/components/ui/NotificationBell";

function ApprovalsIcon({ color, size }: { color: string; size: number }) {
  const { tenants } = usePendingTenants();
  const c = useColors();
  return (
    <View>
      <Ionicons name="people-circle-outline" size={size} color={color} />
      {tenants.length > 0 && (
        <View
          style={{
            position: "absolute",
            top: -2,
            right: -6,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 4,
            borderRadius: 8,
            backgroundColor: c.error,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: c.background, fontSize: 9, fontWeight: "800" }}>
            {tenants.length > 99 ? "99+" : tenants.length}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function ManagerLayout() {
  const { user } = useAuth();
  const c = useColors();
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== "manager") return <Redirect href="/(tenant)" />;

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
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: "Approvals",
          tabBarIcon: ({ color, size }) => <ApprovalsIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Staff",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
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
