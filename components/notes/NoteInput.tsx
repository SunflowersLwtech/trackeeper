import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";

interface NoteInputProps {
  onSubmit: (text: string) => Promise<void>;
}

export function NoteInput({ onSubmit }: NoteInputProps) {
  const c = useColors();
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
        style={{ borderColor: c.border, color: c.text, maxHeight: 80 }}
        placeholder="Add internal note..."
        placeholderTextColor={c.textMuted}
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
        style={{ backgroundColor: text.trim() && !submitting ? c.warning : c.borderLight }}
        onPress={handleSubmit}
        disabled={!text.trim() || submitting}
        accessibilityRole="button"
        accessibilityLabel="Submit note"
        accessibilityState={{ disabled: !text.trim() || submitting, busy: submitting }}
        testID="submit-note-button"
      >
        {submitting ? (
          <ActivityIndicator color={c.background} size="small" />
        ) : (
          <Text className="text-xs font-semibold" style={{ color: text.trim() ? c.background : c.textMuted }}>
            Note
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
