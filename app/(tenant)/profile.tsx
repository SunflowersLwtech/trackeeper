import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/hooks/useAuth";

export default function TenantProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <View className="flex-1 bg-white px-6 pt-12">
      <View className="items-center mb-8">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: "#eff6ff" }}
        >
          <Text className="text-3xl font-bold" style={{ color: "#3b82f6" }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </Text>
        </View>
        <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
          {user?.name}
        </Text>
        <Text className="text-sm" style={{ color: "#6b7280" }}>{user?.email}</Text>
        {user?.unitNumber && (
          <Text className="text-sm mt-1" style={{ color: "#6b7280" }}>
            Unit: {user.unitNumber}
          </Text>
        )}
        <View
          className="mt-2 px-3 py-1 rounded-full"
          style={{ backgroundColor: "#dbeafe" }}
        >
          <Text className="text-xs font-medium" style={{ color: "#1d4ed8" }}>
            {user?.role?.toUpperCase()}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        className="rounded-xl py-4 items-center"
        style={{ backgroundColor: "#ef4444" }}
        onPress={signOut}
      >
        <Text className="text-white text-base font-semibold">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
