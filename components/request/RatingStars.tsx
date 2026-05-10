import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT } from "@/constants/Brutalism";

interface RatingStarsProps {
  rating: number;
  onRate?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

export function RatingStars({ rating, onRate, size = 30, readonly = false }: RatingStarsProps) {
  const c = useColors();

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => !readonly && onRate?.(star)}
          disabled={readonly}
          activeOpacity={readonly ? 1 : 0.7}
          style={{ paddingHorizontal: 3 }}
          accessibilityRole={readonly ? "text" : "button"}
          accessibilityLabel={`${star} star${star > 1 ? "s" : ""}${star <= rating ? ", selected" : ""}`}
          accessibilityHint={readonly ? undefined : `Rate ${star} out of 5`}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? palette.mustard500 : palette.ink300}
          />
        </TouchableOpacity>
      ))}
      {readonly && rating > 0 && (
        <Text
          style={{
            marginLeft: 10,
            fontFamily: FONT.display,
            fontSize: 14,
            fontWeight: "900",
            color: c.text,
            letterSpacing: 0.5,
          }}
        >
          {rating}/5
        </Text>
      )}
    </View>
  );
}
