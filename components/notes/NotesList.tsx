import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Note } from "@/types";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_SM } from "@/constants/Brutalism";
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
      <View style={{ paddingVertical: 16, alignItems: "center" }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", letterSpacing: 0.6, color: palette.tomato500 }}>
          ◼ Failed to load notes
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ paddingVertical: 16, alignItems: "center" }}>
        <ActivityIndicator size="small" color={palette.ink} />
      </View>
    );
  }

  if (notes.length === 0) {
    return (
      <View style={{ paddingVertical: 16, alignItems: "center" }}>
        <Text
          style={{
            fontFamily: FONT.display,
            fontSize: 11,
            fontWeight: "900",
            letterSpacing: 0.8,
            color: c.textMuted,
            textTransform: "uppercase",
          }}
        >
          No internal notes yet
        </Text>
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
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 10,
              borderRadius: RADIUS.xs,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              backgroundColor: palette.mustard50,
              ...SHADOW_SM,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: FONT.display,
                  fontSize: 11,
                  fontWeight: "900",
                  letterSpacing: 0.5,
                  color: palette.ink,
                  textTransform: "uppercase",
                }}
              >
                {note.managerName}
              </Text>
                <Text
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 10,
                    color: c.textMuted,
                    letterSpacing: 0.3,
                  }}
                >
                {time}
              </Text>
            </View>
            <Text style={{ fontFamily: FONT.body, fontSize: 13, color: palette.ink, lineHeight: 18 }}>
              {note.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
