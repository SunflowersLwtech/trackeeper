import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator } from "react-native";

interface NoteInputProps {
  onSubmit: (text: string) => Promise<void>;
}

export function NoteInput({ onSubmit }: NoteInputProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-row items-end px-3 py-2">
      <TextInput
        className="flex-1 border rounded-xl px-3 py-2 mr-2 text-sm"
        style={{ borderColor: "#d1d5db", color: "#111827", maxHeight: 80 }}
        placeholder="Add internal note..."
        placeholderTextColor="#9ca3af"
        value={text}
        onChangeText={setText}
        multiline
        editable={!submitting}
        accessibilityLabel="Internal note input"
        accessibilityHint="Type an internal note to add"
        testID="note-input"
      />
      <TouchableOpacity
        className="px-4 py-2.5 rounded-xl"
        style={{ backgroundColor: text.trim() && !submitting ? "#f59e0b" : "#e5e7eb" }}
        onPress={handleSubmit}
        disabled={!text.trim() || submitting}
        accessibilityRole="button"
        accessibilityLabel="Submit note"
        accessibilityState={{ disabled: !text.trim() || submitting, busy: submitting }}
        testID="submit-note-button"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text className="text-xs font-semibold" style={{ color: text.trim() ? "#fff" : "#9ca3af" }}>
            Note
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
