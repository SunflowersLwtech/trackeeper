import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const c = useColors();
  const [text, setText] = useState("");

  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <View style={[styles.container, { borderTopColor: c.borderLight, backgroundColor: c.background }]}>
      <View style={[styles.inputWrapper, { backgroundColor: c.surfaceAlt, borderColor: c.borderLight }]}>
        <TextInput
          style={[styles.input, { color: c.text }]}
          placeholder="Type a message..."
          placeholderTextColor={c.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          editable={!disabled}
          accessibilityLabel="Message input"
          accessibilityHint="Type a message to send"
          testID="chat-message-input"
        />
      </View>
      <TouchableOpacity
        style={[styles.sendButton, { backgroundColor: canSend ? c.primary : c.border }]}
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !canSend }}
        testID="chat-send-button"
      >
        <Ionicons name="arrow-up" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 120,
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 100,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
});
