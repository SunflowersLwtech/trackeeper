import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_SM } from "@/constants/Brutalism";
import { Message, MessageReplyTo } from "@/types";
import { MAX_IMAGES_PER_MESSAGE, assertWithinImageLimit } from "@/utils/images";

interface ChatInputProps {
  /** Send handler — receives trimmed text and (optionally) picked image URIs. */
  onSend: (
    text: string,
    imageUris?: string[],
    options?: { replyTo?: MessageReplyTo },
  ) => void | Promise<void>;
  /** Edit handler — when set, the input is in "edit" mode for this message. */
  onSubmitEdit?: (newText: string) => void | Promise<void>;
  disabled?: boolean;
  onTypingChange?: (typing: boolean) => void;
  /** Current reply target (rendered as a banner above the input). */
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  /** Current message being edited. */
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
}

export function ChatInput({
  onSend,
  onSubmitEdit,
  disabled,
  onTypingChange,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
}: ChatInputProps) {
  const c = useColors();
  const [text, setText] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);

  // Pre-fill text when entering edit mode.
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      setImageUris([]);
    }
  }, [editingMessage]);

  const isEditing = !!editingMessage;
  const canSend =
    !disabled &&
    !sending &&
    (text.trim().length > 0 || (!isEditing && imageUris.length > 0));

  const handleTextChange = (next: string) => {
    setText(next);
    if (onTypingChange) onTypingChange(next.trim().length > 0);
  };

  const pickImages = async () => {
    if (picking || sending || isEditing) return;
    setPicking(true);
    try {
      const remaining = MAX_IMAGES_PER_MESSAGE - imageUris.length;
      if (remaining <= 0) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.85,
      });
      if (result.canceled) return;
      const newUris = result.assets.map((a) => a.uri).filter(Boolean);
      try {
        assertWithinImageLimit(newUris.length, imageUris.length, MAX_IMAGES_PER_MESSAGE);
      } catch {
        // ignore — picker capped to remaining anyway
      }
      setImageUris((prev) => [...prev, ...newUris].slice(0, MAX_IMAGES_PER_MESSAGE));
    } finally {
      setPicking(false);
    }
  };

  const removeImage = (idx: number) => {
    if (sending) return;
    setImageUris((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    if (!canSend) return;
    const trimmed = text.trim();
    setSending(true);
    try {
      if (isEditing && onSubmitEdit) {
        await onSubmitEdit(trimmed);
        setText("");
      } else {
        await onSend(
          trimmed,
          imageUris.length > 0 ? imageUris : undefined,
          replyingTo
            ? {
                replyTo: {
                  messageId: replyingTo.id,
                  senderId: replyingTo.senderId,
                  textPreview: replyingTo.text || "Photo",
                  type:
                    (replyingTo.imageUrls && replyingTo.imageUrls.length > 0) ||
                    !!replyingTo.imageUrl
                      ? "image"
                      : "text",
                },
              }
            : undefined,
        );
        setText("");
        setImageUris([]);
        if (onTypingChange) onTypingChange(false);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.outer}>
      {/* Reply banner */}
      {replyingTo && !isEditing && (
        <View style={styles.banner}>
          <View style={styles.bannerStripe} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerLabel}>
              REPLYING TO {replyingTo.senderName.toUpperCase()}
            </Text>
            <Text style={styles.bannerPreview} numberOfLines={1}>
              {replyingTo.text || "Photo"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCancelReply}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Cancel reply"
            testID="chat-cancel-reply"
          >
            <Ionicons name="close-circle" size={22} color={palette.ink} />
          </TouchableOpacity>
        </View>
      )}

      {/* Edit banner */}
      {isEditing && (
        <View style={[styles.banner, { backgroundColor: palette.mustard50 }]}>
          <Ionicons name="create" size={16} color={palette.ink} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.bannerLabel}>EDITING MESSAGE…</Text>
            <Text style={styles.bannerPreview} numberOfLines={1}>
              Tap send to save changes
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCancelEdit}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Cancel edit"
            testID="chat-cancel-edit"
          >
            <Ionicons name="close-circle" size={22} color={palette.ink} />
          </TouchableOpacity>
        </View>
      )}

      {/* Image preview row */}
      {imageUris.length > 0 && !isEditing && (
        <View style={styles.previewRow}>
          {imageUris.map((uri, idx) => (
            <View key={`${uri}-${idx}`} style={styles.previewWrapper}>
              <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" accessibilityLabel="Selected image preview" />
              <TouchableOpacity
                onPress={() => removeImage(idx)}
                style={styles.removeBadge}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Remove image ${idx + 1}`}
                testID={`chat-image-remove-${idx}`}
              >
                <Ionicons name="close" size={12} color={palette.paper} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.container}>
        {!isEditing && (
          <TouchableOpacity
            style={[styles.attachButton, { backgroundColor: c.surfaceAlt }]}
            onPress={pickImages}
            disabled={picking || sending || disabled || imageUris.length >= MAX_IMAGES_PER_MESSAGE}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Attach images"
            testID="chat-attach-button"
          >
            {picking ? (
              <ActivityIndicator size="small" color={palette.ink} />
            ) : (
              <Ionicons name="image" size={20} color={palette.ink} />
            )}
          </TouchableOpacity>
        )}

        <View style={[styles.inputWrapper, { backgroundColor: c.surface }]}>
          <TextInput
            style={[styles.input, { color: c.text }]}
            placeholder={isEditing ? "Edit message..." : "Type a message..."}
            placeholderTextColor={c.textMuted}
            value={text}
            onChangeText={handleTextChange}
            multiline
            editable={!disabled && !sending}
            accessibilityLabel="Message input"
            testID="chat-message-input"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? palette.cobalt500 : palette.ink200 },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? "Save edit" : "Send message"}
          testID="chat-send-button"
        >
          {sending ? (
            <ActivityIndicator size="small" color={palette.paper} />
          ) : (
            <Ionicons
              name={isEditing ? "checkmark" : "arrow-up"}
              size={20}
              color={palette.paper}
            />
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
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: palette.cream100,
    borderTopWidth: BORDER.base,
    borderTopColor: palette.ink,
    gap: 6,
  },
  bannerStripe: {
    width: 3,
    alignSelf: "stretch",
    backgroundColor: palette.cobalt500,
    marginRight: 8,
  },
  bannerLabel: {
    fontFamily: FONT.display,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: palette.ink600,
    textTransform: "uppercase",
  },
  bannerPreview: {
    fontFamily: FONT.body,
    fontSize: 12,
    color: palette.ink,
    marginTop: 2,
  },
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: BORDER.base,
    borderTopColor: palette.ink,
  },
  previewWrapper: {
    width: 76,
    height: 76,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    overflow: "hidden",
    ...SHADOW_SM,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    backgroundColor: palette.tomato500,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: BORDER.base,
    borderTopColor: palette.ink,
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.xs,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    ...SHADOW_SM,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: RADIUS.xs,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 120,
  },
  input: {
    fontFamily: FONT.body,
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.xs,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW_SM,
  },
});
