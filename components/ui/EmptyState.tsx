import React from "react";
import { View, Text } from "react-native";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD } from "@/constants/Brutalism";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  const c = useColors();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderWidth: BORDER.heavy,
          borderColor: palette.ink,
          borderRadius: RADIUS.sm,
          backgroundColor: c.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
          ...SHADOW_MD,
        }}
      >
        <Text
          style={{
            fontFamily: FONT.display,
            fontSize: 36,
            fontWeight: "900",
            color: palette.ink,
            letterSpacing: -1,
          }}
        >
          ∅
        </Text>
      </View>
      <Text
        style={{
          fontFamily: FONT.display,
          fontSize: 18,
          fontWeight: "900",
          color: c.text,
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            fontFamily: FONT.body,
            fontSize: 13,
            marginTop: 8,
            textAlign: "center",
            color: c.textBody,
            maxWidth: 280,
            lineHeight: 18,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
