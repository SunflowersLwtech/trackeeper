import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface RatingStarsProps {
  rating: number;
  onRate?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

export function RatingStars({ rating, onRate, size = 28, readonly = false }: RatingStarsProps) {
  return (
    <View className="flex-row items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => !readonly && onRate?.(star)}
          disabled={readonly}
          activeOpacity={readonly ? 1 : 0.6}
          style={{ paddingHorizontal: 2 }}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? "#f59e0b" : "#d1d5db"}
          />
        </TouchableOpacity>
      ))}
      {readonly && rating > 0 && (
        <Text className="ml-2 text-sm font-medium" style={{ color: "#6b7280" }}>
          {rating}/5
        </Text>
      )}
    </View>
  );
}
