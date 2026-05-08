import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Message } from "@/types";
import { useColors } from "@/hooks/useColors";
import { formatTime } from "@/utils/time";
import { MessageStatusIcon } from "./MessageStatusIcon";

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  /** Whether to show the sender name (hidden for consecutive messages from same sender) */
  showName?: boolean;
}

export const ChatBubble = React.memo(function ChatBubble({
  message,
  isOwn,
  showName = true,
}: ChatBubbleProps) {
  const c = useColors();
  const time = message.createdAt?.toDate
    ? formatTime(message.createdAt.toDate())
    : "";

  // Read-receipt logic: read by anyone other than the sender → "read".
  const readBy = message.readBy ?? [];
  const isRead = readBy.some((uid) => uid !== message.senderId);

  const hasImage = !!message.imageUrl;
  // When the message has an image and the only "text" is our 📷 placeholder, hide the text row.
  const trimmedText = message.text.trim();
  const isPlaceholder = hasImage && trimmedText === "📷";
  const hasText = trimmedText.length > 0 && !isPlaceholder;

  return (
    <View style={[styles.wrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
      {/* Avatar for other's messages */}
      {!isOwn && showName && (
        <View style={[styles.avatar, { backgroundColor: c.primaryBadgeBg }]}>
          <Text style={[styles.avatarText, { color: c.primary }]}>
            {message.senderName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      {!isOwn && !showName && <View style={styles.avatarSpacer} />}

      <View style={[styles.bubbleColumn, isOwn ? styles.bubbleColumnOwn : styles.bubbleColumnOther]}>
        {/* Sender name */}
        {!isOwn && showName && (
          <Text style={[styles.senderName, { color: c.textMuted }]}>
            {message.senderName}
          </Text>
        )}

        {/* Bubble */}
        <View
          style={[
            styles.bubble,
            isOwn
              ? {
                  backgroundColor: c.primary,
                  borderBottomRightRadius: 4,
                }
              : {
                  backgroundColor: c.surfaceAlt,
                  borderBottomLeftRadius: 4,
                },
            hasImage && hasText ? styles.bubbleWithImage : null,
            hasImage && !hasText ? styles.bubbleImageOnly : null,
          ]}
        >
          {/* Image attachment */}
          {hasImage && (
            <Image
              source={{ uri: message.imageUrl }}
              style={[styles.image, !hasText && styles.imageNoTextRadius]}
              resizeMode="cover"
              accessibilityLabel="Chat image attachment"
            />
          )}
          {hasText && (
            <Text
              style={[
                styles.messageText,
                hasImage && styles.messageTextWithImage,
                { color: isOwn ? "#fff" : c.text },
              ]}
            >
              {message.text}
            </Text>
          )}
        </View>

        {/* Time + read receipt */}
        <View style={[styles.metaRow, isOwn ? styles.metaRowOwn : styles.metaRowOther]}>
          <Text style={[styles.time, { color: c.textMuted }]}>{time}</Text>
          {isOwn && (
            <View style={styles.statusIcon}>
              <MessageStatusIcon read={isRead} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  wrapperOwn: {
    justifyContent: "flex-end",
  },
  wrapperOther: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 2,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "700",
  },
  avatarSpacer: {
    width: 36, // avatar width + marginRight
  },
  bubbleColumn: {
    maxWidth: "75%",
  },
  bubbleColumnOwn: {
    alignItems: "flex-end",
  },
  bubbleColumnOther: {
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    overflow: "hidden",
  },
  bubbleWithImage: {
    paddingTop: 4,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  bubbleImageOnly: {
    padding: 4,
  },
  image: {
    width: 220,
    maxWidth: "100%",
    height: 200,
    borderRadius: 14,
    marginBottom: 6,
  },
  imageNoTextRadius: {
    marginBottom: 0,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextWithImage: {
    paddingHorizontal: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  metaRowOwn: {
    marginRight: 4,
    justifyContent: "flex-end",
  },
  metaRowOther: {
    marginLeft: 4,
    justifyContent: "flex-start",
  },
  time: {
    fontSize: 10,
  },
  statusIcon: {
    marginLeft: 4,
    flexDirection: "row",
    alignItems: "center",
  },
});
