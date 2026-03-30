import React from "react";
import { View, Text } from "react-native";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-20 px-8">
      <Text className="text-lg font-medium text-center" style={{ color: "#9ca3af" }}>
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-sm mt-2 text-center" style={{ color: "#d1d5db" }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
