import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function NotFoundScreen() {
  const c = useColors();
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center p-5" style={{ backgroundColor: c.background }}>
        <Text className="text-xl font-bold" style={{ color: c.text }}>
          This screen doesn&apos;t exist.
        </Text>
        <Link href="/" className="mt-4 py-4">
          <Text style={{ color: c.primary }}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}
