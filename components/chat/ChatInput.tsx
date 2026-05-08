import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/useColors";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

interface ChatInputProps {
  /** Send handler — receives trimmed text and (optionally) the picked image's local URI. */
  onSend: (text: string, imageUri?: string) => void | Promise<void>;
  disabled?: boolean;
  /** Called when the user starts/stops typing — used to drive the typing indicator. */
  onTypingChange?: (typing: boolean) => void;
}

export function ChatInput({ onSend, disabled, onTypingChange }: ChatInputProps) {
  const c = useColors();
  const [text, setText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);

  const canSend =
    !disabled && !sending && (text.trim().length > 0 || imageUri !== null);

  const handleTextChange = (next: string) => {
    setText(next);
    if (onTypingChange) {
      onTypingChange(next.trim().length > 0);
    }
  };

  const pickImage = async () => {
    if (picking || sending) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: true,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const fileSize = asset.fileSize ?? 0;
      if (fileSize > 0 && fileSize > MAX_IMAGE_BYTES) {
        Alert.alert("Image too large", "Please choose an image under 5 MB.");
        return;
      }
      setImageUri(asset.uri);
    } finally {
      setPicking(false);
    }
  };

  const removeImage = () => {
    if (sending) return;
    setImageUri(null);
  };

  const handleSend = async () => {
    if (!canSend) return;
    const trimmed = text.trim();
    const uri = imageUri;
    if (!trimmed && !uri) return;

    setSending(true);
    try {
      await onSend(trimmed, uri ?? undefined);
      setText("");
      setImageUri(null);
      if (onTypingChange) onTypingChange(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.outer}>
      {/* Image preview row */}
      {imageUri && (
        <View
          style={[
            styles.previewRow,
            { borderTopColor: c.borderLight, backgroundColor: c.background },
          ]}
        >
          <View style={[styles.previewWrapper, { borderColor: c.borderLight }]}>
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              resizeMode="cover"
              accessibilityLabel="Selected image preview"
            />
            <TouchableOpacity
              onPress={removeImage}
              style={[styles.removeBadge, { backgroundColor: c.error }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Remove image"
              testID="chat-image-remove"
            >
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View
        style={[
          styles.container,
          { borderTopColor: c.borderLight, backgroundColor: c.background },
        ]}
      >
        {/* Attach button */}
        <TouchableOpacity
          style={[
            styles.attachButton,
            { backgroundColor: c.surfaceAlt, borderColor: c.borderLight },
          ]}
          onPress={pickImage}
          disabled={picking || sending || disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Attach image"
          testID="chat-attach-button"
        >
          {picking ? (
            <ActivityIndicator size="small" color={c.textTertiary} />
          ) : (
            <Ionicons name="image-outline" size={20} color={c.textTertiary} />
          )}
        </TouchableOpacity>

        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: c.surfaceAlt, borderColor: c.borderLight },
          ]}
        >
          <TextInput
            style={[styles.input, { color: c.text }]}
            placeholder="Type a message..."
            placeholderTextColor={c.textMuted}
            value={text}
            onChangeText={handleTextChange}
            multiline
            editable={!disabled && !sending}
            accessibilityLabel="Message input"
            accessibilityHint="Type a message to send"
            testID="chat-message-input"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? c.primary : c.border },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          testID="chat-send-button"
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="arrow-up" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: "100%",
  },
  previewRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  previewWrapper: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  attachButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 2,
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
