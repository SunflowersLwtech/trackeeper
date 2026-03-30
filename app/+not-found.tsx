import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center bg-white p-5">
        <Text className="text-xl font-bold" style={{ color: "#111827" }}>
          This screen doesn&apos;t exist.
        </Text>
        <Link href="/" className="mt-4 py-4">
          <Text style={{ color: "#3b82f6" }}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}
