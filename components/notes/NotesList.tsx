import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Note } from "@/types";

interface NotesListProps {
  notes: Note[];
  loading: boolean;
}

export function NotesList({ notes, loading }: NotesListProps) {
  if (loading) {
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  if (notes.length === 0) {
    return (
      <View className="py-4 items-center">
        <Text className="text-xs" style={{ color: "#9ca3af" }}>No internal notes yet</Text>
      </View>
    );
  }

  return (
    <View>
      {notes.map((note) => {
        const time = note.createdAt?.toDate
          ? formatDateTime(note.createdAt.toDate())
          : "";
        return (
          <View
            key={note.id}
            className="px-3 py-2.5 mb-2 rounded-lg border"
            style={{ borderColor: "#e5e7eb", backgroundColor: "#fffbeb" }}
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs font-semibold" style={{ color: "#92400e" }}>
                {note.managerName}
              </Text>
              <Text className="text-xs" style={{ color: "#9ca3af" }}>{time}</Text>
            </View>
            <Text className="text-sm" style={{ color: "#374151" }}>{note.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

function formatDateTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  const d = date.getDate();
  const mo = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}/${mo} ${h}:${m}`;
}
