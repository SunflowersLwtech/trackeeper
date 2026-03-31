import React from "react";
import { View, Text } from "react-native";
import { BaseToast, ErrorToast, BaseToastProps } from "react-native-toast-message";

const toastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#22c55e",
        backgroundColor: "#f0fdf4",
        borderLeftWidth: 4,
        borderRadius: 12,
        marginHorizontal: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: 14,
        fontWeight: "600",
        color: "#166534",
      }}
      text2Style={{
        fontSize: 13,
        color: "#15803d",
      }}
    />
  ),
  error: (props: BaseToastProps) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: "#ef4444",
        backgroundColor: "#fef2f2",
        borderLeftWidth: 4,
        borderRadius: 12,
        marginHorizontal: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: 14,
        fontWeight: "600",
        color: "#991b1b",
      }}
      text2Style={{
        fontSize: 13,
        color: "#b91c1c",
      }}
    />
  ),
  info: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#3b82f6",
        backgroundColor: "#eff6ff",
        borderLeftWidth: 4,
        borderRadius: 12,
        marginHorizontal: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: 14,
        fontWeight: "600",
        color: "#1e40af",
      }}
      text2Style={{
        fontSize: 13,
        color: "#1d4ed8",
      }}
    />
  ),
};

export { toastConfig };
