import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface ChipItem<T extends string = string> {
  label: string;
  value: T;
}

interface ChipBarProps<T extends string> {
  items: ChipItem<T>[];
  selected: T;
  onSelect: (value: T) => void;
  activeColor?: string;
  activeTextColor?: string;
  testIDPrefix?: string;
}

export function ChipBar<T extends string>({
  items,
  selected,
  onSelect,
  activeColor,
  activeTextColor,
  testIDPrefix,
}: ChipBarProps<T>) {
  const c = useColors();
  const resolvedActiveColor = activeColor ?? c.primary;
  const resolvedActiveTextColor = activeTextColor ?? c.background;

  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item) => item.value}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.list}
      renderItem={({ item }) => {
        const isActive = selected === item.value;
        return (
          <View
            testID={testIDPrefix ? `${testIDPrefix}-${item.value}` : undefined}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
            onStartShouldSetResponder={() => true}
            onResponderRelease={() => onSelect(item.value)}
            style={[
              styles.chip,
              isActive
                ? { backgroundColor: resolvedActiveColor, borderColor: resolvedActiveColor }
                : { backgroundColor: c.surfaceAlt, borderColor: c.borderLight },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: isActive ? resolvedActiveTextColor : c.textBody },
                isActive && styles.chipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flexGrow: 0,
    flexShrink: 0,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "center",
  },
  chip: {
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    alignSelf: "center",
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chipTextActive: {
    fontWeight: "600",
  },
});
