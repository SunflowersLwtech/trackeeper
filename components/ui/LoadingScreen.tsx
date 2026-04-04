import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useColors } from "@/hooks/useColors";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const c = useColors();

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: c.background }}>
      <ActivityIndicator size="large" color={c.primary} />
      {message ? (
        <Text className="text-sm mt-3" style={{ color: c.textTertiary }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
