import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { BORDER, RADIUS, SHADOW_MD } from "@/constants/Brutalism";

/** A pulsing skeleton card matching the brutalist RequestCard. */
function SkeletonCardInner() {
  const c = useColors();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: c.surface,
          opacity,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.bar, styles.titleBar]} />
        <View style={[styles.bar, styles.badge]} />
      </View>
      <View style={[styles.bar, styles.descLine1]} />
      <View style={[styles.bar, styles.descLine2]} />
      <View style={styles.row}>
        <View style={[styles.bar, styles.categoryBar]} />
        <View style={[styles.bar, styles.timeBar]} />
      </View>
    </Animated.View>
  );
}

export const SkeletonCard = React.memo(SkeletonCardInner);

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    borderRadius: RADIUS.sm,
    padding: 16,
    marginBottom: 14,
    ...SHADOW_MD,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bar: {
    backgroundColor: palette.ink200,
  },
  titleBar: {
    height: 16,
    width: "55%",
    marginBottom: 12,
  },
  badge: {
    height: 22,
    width: 78,
    marginBottom: 12,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
  },
  descLine1: {
    height: 10,
    width: "92%",
    marginBottom: 6,
  },
  descLine2: {
    height: 10,
    width: "70%",
    marginBottom: 14,
  },
  categoryBar: {
    height: 22,
    width: 86,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
  },
  timeBar: {
    height: 10,
    width: 48,
  },
});
