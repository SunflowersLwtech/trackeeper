import React from "react";
import { View, Platform } from "react-native";

interface WebContainerProps {
  children: React.ReactNode;
}

/**
 * Constrains content to a max width on web for readability.
 * On native, renders children without modification.
 */
export function WebContainer({ children }: WebContainerProps) {
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{ flex: 1, width: "100%", maxWidth: 600 }}>
        {children}
      </View>
    </View>
  );
}
