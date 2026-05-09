import { Tabs, Redirect } from "expo-router";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER } from "@/constants/Brutalism";
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
          title: "My Tasks",
          tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
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
