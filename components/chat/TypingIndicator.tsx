import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface TypingIndicatorProps {
  /** Optional names of users currently typing (e.g. ["Alice"], ["Alice", "Bob"]). */
  names?: string[];
}

const DOT_COUNT = 3;
const DOT_DURATION = 600;

/**
 * Animated three-dot pulsing indicator for "X is typing…" state.
 * Each dot fades in/out on a staggered cycle for a smooth wave.
 */
export const TypingIndicator = React.memo(function TypingIndicator({
  names,
}: TypingIndicatorProps) {
  const c = useColors();

  // One Animated.Value per dot, all created once.
  const dotsRef = useRef<Animated.Value[]>([]);
  if (dotsRef.current.length === 0) {
    dotsRef.current = Array.from({ length: DOT_COUNT }, () => new Animated.Value(0.3));
  }

  useEffect(() => {
    const animations = dotsRef.current.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * (DOT_DURATION / DOT_COUNT)),
          Animated.timing(value, {
            toValue: 1,
            duration: DOT_DURATION,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: DOT_DURATION,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  const label = (() => {
    if (!names || names.length === 0) return "Typing";
    if (names.length === 1) return `${names[0]} is typing`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
    return `${names[0]} and ${names.length - 1} others are typing`;
  })();

  return (
    <View
      style={[styles.wrapper, { backgroundColor: c.surfaceAlt }]}
      accessibilityLabel={`${label}…`}
      accessibilityRole="text"
      testID="chat-typing-indicator"
    >
      <Text style={[styles.label, { color: c.textTertiary }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.dots}>
        {dotsRef.current.map((value, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: c.textTertiary, opacity: value },
            ]}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginHorizontal: 8,
    marginBottom: 4,
    maxWidth: "80%",
  },
  label: {
    fontSize: 12,
    fontStyle: "italic",
    marginRight: 6,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1.5,
  },
});
