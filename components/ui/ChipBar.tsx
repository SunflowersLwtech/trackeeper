import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, RADIUS, BORDER, SHADOW_SM } from "@/constants/Brutalism";

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
  const resolvedActive = activeColor ?? palette.cobalt500;
  const resolvedActiveText = activeTextColor ?? palette.paper;

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
                ? { backgroundColor: resolvedActive, ...SHADOW_SM }
                : { backgroundColor: c.surface },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isActive ? resolvedActiveText : c.text,
                },
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
    paddingVertical: 8,
    alignItems: "center",
  },
  chip: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    alignSelf: "center",
  },
  chipText: {
    fontFamily: FONT.display,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
