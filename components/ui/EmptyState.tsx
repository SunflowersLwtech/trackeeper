import React from "react";
import { View, Text } from "react-native";
import { useColors } from "@/hooks/useColors";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  const c = useColors();

  return (
    <View className="flex-1 items-center justify-center py-20 px-8">
      <Text className="text-lg font-medium text-center" style={{ color: c.textMuted }}>
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-sm mt-2 text-center" style={{ color: c.border }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
