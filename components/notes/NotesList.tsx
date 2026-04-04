import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Note } from "@/types";
import { useColors } from "@/hooks/useColors";
import { formatDateTime } from "@/utils/time";

interface NotesListProps {
  notes: Note[];
  loading: boolean;
  error?: Error | null;
}

export function NotesList({ notes, loading, error }: NotesListProps) {
  const c = useColors();

  if (error) {
    return (
      <View className="py-4 items-center">
        <Text className="text-xs" style={{ color: c.error }}>Failed to load notes</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color={c.primary} />
      </View>
    );
  }

  if (notes.length === 0) {
    return (
      <View className="py-4 items-center">
        <Text className="text-xs" style={{ color: c.textMuted }}>No internal notes yet</Text>
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
            style={{ borderColor: c.borderLight, backgroundColor: c.warningBg }}
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs font-semibold" style={{ color: c.warningTextDark }}>
                {note.managerName}
              </Text>
              <Text className="text-xs" style={{ color: c.textMuted }}>{time}</Text>
            </View>
            <Text className="text-sm" style={{ color: c.textSecondary }}>{note.text}</Text>
          </View>
        );
      })}
    </View>
  );
}
