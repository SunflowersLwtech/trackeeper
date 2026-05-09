import { Tabs, Redirect } from "expo-router";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER } from "@/constants/Brutalism";
import { usePendingTenants } from "@/hooks/usePendingTenants";
import { NotificationBell } from "@/components/ui/NotificationBell";

function ApprovalsIcon({ color, size }: { color: string; size: number }) {
  const { tenants } = usePendingTenants();
  return (
    <View>
      <Ionicons name="people-circle" size={size} color={color} />
      {tenants.length > 0 && (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -10,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            backgroundColor: palette.tomato500,
            borderWidth: 1.5,
            borderColor: palette.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: palette.paper,
              fontFamily: FONT.display,
              fontSize: 9,
              fontWeight: "900",
            }}
          >
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
        tabBarActiveTintColor: palette.ink,
        tabBarInactiveTintColor: palette.ink400,
        tabBarStyle: {
          borderTopWidth: BORDER.heavy,
          borderTopColor: palette.ink,
          backgroundColor: c.surface,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontFamily: FONT.display,
          fontSize: 9,
          fontWeight: "900",
          letterSpacing: 0.2,
          textTransform: "uppercase",
        },
        headerStyle: {
          backgroundColor: c.background,
          borderBottomWidth: BORDER.base,
          borderBottomColor: palette.ink,
        },
        headerTintColor: palette.ink,
        headerTitleStyle: {
          fontFamily: FONT.display,
          fontSize: 20,
          fontWeight: "900",
          letterSpacing: -0.4,
          textTransform: "uppercase",
        },
        headerShadowVisible: false,
        headerRight: () => (
          <View style={{ marginRight: 14 }}>
            <NotificationBell />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
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
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="[id]" options={{ href: null }} />
    </Tabs>
  );
}
