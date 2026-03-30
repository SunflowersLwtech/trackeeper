import React from "react";
import { View, Text } from "react-native";
import { Message } from "@/types";

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  const time = message.createdAt?.toDate
    ? formatTime(message.createdAt.toDate())
    : "";

  return (
    <View
      className={`mb-2 max-w-[80%] ${isOwn ? "self-end" : "self-start"}`}
    >
      {!isOwn && (
        <Text className="text-xs mb-1 ml-1" style={{ color: "#9ca3af" }}>
          {message.senderName}
        </Text>
      )}
      <View
        className="px-4 py-3 rounded-2xl"
        style={{
          backgroundColor: isOwn ? "#3b82f6" : "#f3f4f6",
          borderBottomRightRadius: isOwn ? 4 : 16,
          borderBottomLeftRadius: isOwn ? 16 : 4,
        }}
      >
        <Text
          className="text-base"
          style={{ color: isOwn ? "#fff" : "#111827" }}
        >
          {message.text}
        </Text>
      </View>
      <Text
        className={`text-xs mt-1 ${isOwn ? "text-right mr-1" : "ml-1"}`}
        style={{ color: "#9ca3af" }}
      >
        {time}
      </Text>
    </View>
  );
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}
