import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Message } from "@/types";
import { useColors } from "@/hooks/useColors";
import { formatTime } from "@/utils/time";

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
          ]}
        >
          <Text style={[styles.messageText, { color: isOwn ? "#fff" : c.text }]}>
            {message.text}
          </Text>
        </View>

        {/* Time */}
        <Text
          style={[
            styles.time,
            { color: c.textMuted },
            isOwn ? styles.timeOwn : styles.timeOther,
          ]}
        >
          {time}
        </Text>
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
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  time: {
    fontSize: 10,
    marginTop: 2,
  },
  timeOwn: {
    marginRight: 4,
  },
  timeOther: {
    marginLeft: 4,
  },
});
