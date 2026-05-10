import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT } from "@/constants/Brutalism";

interface ListFooterProps {
  loadingMore: boolean;
  hasMore: boolean;
  itemCount: number;
}

export function ListFooter({ loadingMore, hasMore, itemCount }: ListFooterProps) {
  const c = useColors();

  if (loadingMore) {
    return (
      <View style={{ paddingVertical: 18, alignItems: "center" }}>
        <ActivityIndicator size="small" color={palette.ink} />
      </View>
    );
  }
  if (!hasMore && itemCount > 0) {
    return (
      <View style={{ paddingVertical: 22, alignItems: "center" }}>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: FONT.display,
            fontSize: 11,
            fontWeight: "900",
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          ◼ End of list
        </Text>
      </View>
    );
  }
  return null;
}
