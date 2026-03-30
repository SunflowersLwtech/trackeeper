import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text } from "react-native";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <View
      className="flex-row items-end px-4 py-3 border-t"
      style={{ borderTopColor: "#e5e7eb", backgroundColor: "#fff" }}
    >
      <TextInput
        className="flex-1 border rounded-2xl px-4 py-2 mr-2 text-base"
        style={{
          borderColor: "#d1d5db",
          color: "#111827",
          maxHeight: 100,
        }}
        placeholder="Type a message..."
        placeholderTextColor="#9ca3af"
        value={text}
        onChangeText={setText}
        multiline
        editable={!disabled}
      />
      <TouchableOpacity
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{ backgroundColor: text.trim() ? "#3b82f6" : "#d1d5db" }}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
      >
        <Text className="text-white font-bold text-base">↑</Text>
      </TouchableOpacity>
    </View>
  );
}
