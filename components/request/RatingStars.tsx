import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface RatingStarsProps {
  rating: number;
  onRate?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

export function RatingStars({ rating, onRate, size = 28, readonly = false }: RatingStarsProps) {
  const c = useColors();

  return (
    <View className="flex-row items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => !readonly && onRate?.(star)}
          disabled={readonly}
          activeOpacity={readonly ? 1 : 0.6}
          style={{ paddingHorizontal: 2 }}
          accessibilityRole={readonly ? "text" : "button"}
          accessibilityLabel={`${star} star${star > 1 ? "s" : ""}${star <= rating ? ", selected" : ""}`}
          accessibilityHint={readonly ? undefined : `Rate ${star} out of 5`}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? c.warning : c.border}
          />
        </TouchableOpacity>
      ))}
      {readonly && rating > 0 && (
        <Text className="ml-2 text-sm font-medium" style={{ color: c.textTertiary }}>
          {rating}/5
        </Text>
      )}
    </View>
  );
}
