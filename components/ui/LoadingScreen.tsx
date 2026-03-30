import React from "react";
import { View, ActivityIndicator, Text } from "react-native";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#3b82f6" />
      {message ? (
        <Text className="text-sm mt-3" style={{ color: "#6b7280" }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
