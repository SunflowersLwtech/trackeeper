import React from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { MaintenanceRequest, RequestStatus } from "@/types";
import { getStatusColor, getStatusLabel, STATUS_ORDER } from "@/utils/status";
import { useColors } from "@/hooks/useColors";

type FilterValue = RequestStatus | "all";

interface StatusFilterItem {
  label: string;
  value: FilterValue;
  count: number;
  color: string;
}

interface StatsBarProps {
  requests: MaintenanceRequest[];
  selected: FilterValue;
  onSelect: (value: FilterValue) => void;
}

/**
 * Merged status filter bar — each chip shows the status label plus its count.
 * Replaces the old separate StatsBar + status ChipBar combination.
 */
export function StatsBar({ requests, selected, onSelect }: StatsBarProps) {
  const c = useColors();
  const allStatuses: FilterValue[] = ["all", ...STATUS_ORDER, "on_hold", "cancelled"];

  const items: StatusFilterItem[] = allStatuses.map((value) => {
    const count =
      value === "all"
        ? requests.length
        : requests.filter((r) => r.status === value).length;
    return {
      label: value === "all" ? "All" : getStatusLabel(value as RequestStatus),
      value,
      count,
      color: value === "all" ? c.text : getStatusColor(value as RequestStatus),
    };
  });

  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item) => item.value}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => {
        const isActive = selected === item.value;
        return (
          <TouchableOpacity
            onPress={() => onSelect(item.value)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}, ${item.count} requests`}
            accessibilityState={{ selected: isActive }}
            testID={`status-filter-${item.value}`}
            style={[
              styles.chip,
              isActive
                ? { backgroundColor: item.color, borderColor: item.color }
                : { backgroundColor: c.surfaceAlt, borderColor: c.borderLight },
            ]}
          >
            <Text
              style={[
                styles.chipLabel,
                { color: isActive ? c.background : c.textBody },
                isActive && styles.chipLabelActive,
              ]}
            >
              {item.label}
            </Text>
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor: isActive ? "rgba(255,255,255,0.25)" : c.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  { color: isActive ? c.background : item.color },
                ]}
              >
                {item.count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
    lineHeight: 16,
    marginRight: 6,
  },
  chipLabelActive: {
    fontWeight: "600",
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
