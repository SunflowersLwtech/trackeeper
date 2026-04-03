import React from "react";
import { View, ActivityIndicator, Text } from "react-native";

interface ListFooterProps {
  loadingMore: boolean;
  hasMore: boolean;
  itemCount: number;
}

export function ListFooter({ loadingMore, hasMore, itemCount }: ListFooterProps) {
  if (loadingMore) {
    return (
      <View style={{ paddingVertical: 16, alignItems: "center" }}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }
  if (!hasMore && itemCount > 0) {
    return (
      <View style={{ paddingVertical: 16, alignItems: "center" }}>
        <Text style={{ color: "#9ca3af", fontSize: 12 }}>No more items</Text>
      </View>
    );
  }
  return null;
}
