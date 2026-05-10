import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER } from "@/constants/Brutalism";

export interface TabItem<T extends string = string> {
  label: string;
  value: T;
  activeColor?: string;
  badge?: string | number;
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onSelect: (value: T) => void;
}

export function TabBar<T extends string>({ tabs, active, onSelect }: TabBarProps<T>) {
  const c = useColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.surface,
          borderBottomWidth: BORDER.base,
          borderBottomColor: palette.ink,
        },
      ]}
    >
      {tabs.map((tab, idx) => {
        const isActive = active === tab.value;
        const color = tab.activeColor ?? palette.cobalt500;
        return (
          <TouchableOpacity
            key={tab.value}
            style={[
              styles.tab,
              {
                backgroundColor: isActive ? color : "transparent",
                borderRightWidth: idx < tabs.length - 1 ? BORDER.base : 0,
                borderRightColor: palette.ink,
              },
            ]}
            onPress={() => onSelect(tab.value)}
            accessibilityRole="tab"
            accessibilityLabel={tab.badge ? `${tab.label}, ${tab.badge}` : tab.label}
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? palette.paper : c.text },
              ]}
            >
              {tab.label}
              {tab.badge != null ? `  ${tab.badge}` : ""}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: FONT.display,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
