import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, Text } from "react-native";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD } from "@/constants/Brutalism";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const c = useColors();
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [rotate]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.background,
      }}
    >
      <Animated.View
        style={{
          width: 64,
          height: 64,
          borderWidth: BORDER.heavy,
          borderColor: palette.ink,
          borderRadius: RADIUS.sm,
          backgroundColor: palette.cobalt500,
          ...SHADOW_MD,
          transform: [{ rotate: spin }],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            backgroundColor: palette.mustard500,
            borderWidth: BORDER.base,
            borderColor: palette.ink,
          }}
        />
      </Animated.View>
      <Text
        style={{
          fontFamily: FONT.display,
          fontSize: 12,
          fontWeight: "900",
          letterSpacing: 1.4,
          color: c.text,
          marginTop: 20,
          textTransform: "uppercase",
        }}
      >
        {message ?? "Loading"}
      </Text>
    </View>
  );
}
