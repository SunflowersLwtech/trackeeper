import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_SM } from "@/constants/Brutalism";

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

  const ready = !!text.trim() && !submitting;

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
      <TextInput
        style={{
          flex: 1,
          borderWidth: BORDER.base,
          borderColor: palette.ink,
          borderRadius: RADIUS.xs,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontFamily: FONT.body,
          fontSize: 14,
          color: c.text,
          backgroundColor: c.surface,
          maxHeight: 90,
          ...SHADOW_SM,
        }}
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
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: BORDER.base,
          borderColor: palette.ink,
          backgroundColor: ready ? palette.mustard500 : c.surfaceAlt,
          ...(ready ? SHADOW_SM : {}),
        }}
        onPress={handleSubmit}
        disabled={!ready}
        accessibilityRole="button"
        accessibilityLabel="Submit note"
        accessibilityState={{ disabled: !ready, busy: submitting }}
        testID="submit-note-button"
      >
        {submitting ? (
          <ActivityIndicator color={palette.ink} size="small" />
        ) : (
          <Text
            style={{
              fontFamily: FONT.display,
              fontSize: 12,
              fontWeight: "900",
              letterSpacing: 0.6,
              color: palette.ink,
              textTransform: "uppercase",
            }}
          >
            Note
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
