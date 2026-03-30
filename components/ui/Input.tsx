import React from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium mb-1" style={{ color: "#374151" }}>
        {label}
      </Text>
      <TextInput
        className="border rounded-xl px-4 py-3 text-base"
        style={{
          borderColor: error ? "#ef4444" : "#d1d5db",
          color: "#111827",
        }}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error ? (
        <Text className="text-xs mt-1" style={{ color: "#ef4444" }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
