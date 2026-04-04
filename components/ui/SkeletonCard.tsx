import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

/** A single pulsing skeleton card that mimics RequestCard layout. */
function SkeletonCardInner() {
  const c = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
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
          borderColor: c.borderLight,
          backgroundColor: c.surface,
          opacity,
        },
      ]}
    >
      {/* Title row */}
      <View style={styles.row}>
        <View style={[styles.bar, styles.titleBar, { backgroundColor: c.borderLight }]} />
        <View style={[styles.bar, styles.badge, { backgroundColor: c.borderLight }]} />
      </View>
      {/* Description lines */}
      <View style={[styles.bar, styles.descLine1, { backgroundColor: c.borderLight }]} />
      <View style={[styles.bar, styles.descLine2, { backgroundColor: c.borderLight }]} />
      {/* Footer row */}
      <View style={styles.row}>
        <View style={[styles.bar, styles.categoryBar, { backgroundColor: c.borderLight }]} />
        <View style={[styles.bar, styles.timeBar, { backgroundColor: c.borderLight }]} />
      </View>
    </Animated.View>
  );
}

export const SkeletonCard = React.memo(SkeletonCardInner);

/** Renders N skeleton cards as a loading placeholder. */
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
    paddingTop: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bar: {
    borderRadius: 6,
  },
  titleBar: {
    height: 14,
    width: "60%",
    marginBottom: 12,
  },
  badge: {
    height: 22,
    width: 64,
    marginBottom: 12,
    borderRadius: 11,
  },
  descLine1: {
    height: 10,
    width: "90%",
    marginBottom: 6,
  },
  descLine2: {
    height: 10,
    width: "70%",
    marginBottom: 14,
  },
  categoryBar: {
    height: 24,
    width: 72,
    borderRadius: 6,
  },
  timeBar: {
    height: 10,
    width: 40,
  },
});
