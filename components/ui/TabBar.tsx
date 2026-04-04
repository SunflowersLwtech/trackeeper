import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

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
    <View style={[styles.container, { backgroundColor: c.surface }]}>
      {tabs.map((tab) => {
        const isActive = active === tab.value;
        const color = tab.activeColor ?? c.primary;
        return (
          <TouchableOpacity
            key={tab.value}
            style={[
              styles.tab,
              { borderBottomColor: isActive ? color : "transparent" },
            ]}
            onPress={() => onSelect(tab.value)}
            accessibilityRole="tab"
            accessibilityLabel={tab.badge ? `${tab.label}, ${tab.badge}` : tab.label}
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[styles.label, { color: isActive ? color : c.textTertiary }]}
            >
              {tab.label}
              {tab.badge != null ? ` (${tab.badge})` : ""}
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
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
});
