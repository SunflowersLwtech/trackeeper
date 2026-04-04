import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useColors } from "@/hooks/useColors";

interface ListFooterProps {
  loadingMore: boolean;
  hasMore: boolean;
  itemCount: number;
}

export function ListFooter({ loadingMore, hasMore, itemCount }: ListFooterProps) {
  const c = useColors();

  if (loadingMore) {
    return (
      <View style={{ paddingVertical: 16, alignItems: "center" }}>
        <ActivityIndicator size="small" color={c.primary} />
      </View>
    );
  }
  if (!hasMore && itemCount > 0) {
    return (
      <View style={{ paddingVertical: 16, alignItems: "center" }}>
        <Text style={{ color: c.textMuted, fontSize: 12 }}>No more items</Text>
      </View>
    );
  }
  return null;
}
