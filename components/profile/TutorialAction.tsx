import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { BORDER, FONT, RADIUS, SHADOW_SM } from "@/constants/Brutalism";

interface TutorialActionProps {
  onPress: () => void;
  disabled?: boolean;
}

export function TutorialAction({ onPress, disabled }: TutorialActionProps) {
  const c = useColors();

  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: c.surface,
        borderWidth: BORDER.base,
        borderColor: palette.ink,
        borderRadius: RADIUS.xs,
        paddingHorizontal: 14,
        paddingVertical: 12,
        opacity: disabled ? 0.6 : 1,
        ...SHADOW_SM,
      }}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Replay app tutorial"
      testID="profile-show-tutorial-button"
    >
      <View
        style={{
          width: 34,
          height: 34,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.cobalt500,
          borderWidth: BORDER.base,
          borderColor: palette.ink,
          marginRight: 12,
        }}
      >
        <Ionicons name="help-buoy" size={18} color={palette.paper} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontFamily: FONT.display,
            fontSize: 12,
            fontWeight: "900",
            color: c.text,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
          numberOfLines={1}
        >
          Tutorial
        </Text>
        <Text
          style={{
            marginTop: 2,
            fontFamily: FONT.body,
            fontSize: 12,
            color: c.textBody,
            lineHeight: 16,
          }}
          numberOfLines={2}
        >
          Replay the guided app tour
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.ink} />
    </TouchableOpacity>
  );
}
