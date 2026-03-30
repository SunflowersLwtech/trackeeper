import React from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "danger" | "outline";
}

const VARIANTS = {
  primary: { bg: "#3b82f6", bgDisabled: "#93c5fd", text: "#fff" },
  danger: { bg: "#ef4444", bgDisabled: "#fca5a5", text: "#fff" },
  outline: { bg: "transparent", bgDisabled: "transparent", text: "#3b82f6" },
};

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: ButtonProps) {
  const v = VARIANTS[variant];
  const isDisabled = loading || disabled;

  return (
    <TouchableOpacity
      className={`rounded-xl py-4 items-center ${variant === "outline" ? "border" : ""}`}
      style={{
        backgroundColor: isDisabled ? v.bgDisabled : v.bg,
        borderColor: variant === "outline" ? "#3b82f6" : undefined,
      }}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text className="text-base font-semibold" style={{ color: v.text }}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
