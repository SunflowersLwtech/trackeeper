import React from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export interface ActiveFilter {
  key: string;
  label: string;
  color?: string;
  /** If provided, tapping the pill resets this filter */
  onClear: () => void;
}

interface FilterToolbarProps {
  search: string;
  onSearchChange: (text: string) => void;
  searchPlaceholder?: string;
  onFilterPress: () => void;
  /** Active filter pills shown below the search bar */
  activeFilters: ActiveFilter[];
  /** Total number of active (non-default) filters for the badge */
  filterCount: number;
}

/**
 * Compact toolbar: search bar + filter button.
 * Active filters displayed as dismissible pills.
 * All detailed filter selection happens in a BottomSheet (managed by parent).
 */
export function FilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  onFilterPress,
  activeFilters,
  filterCount,
}: FilterToolbarProps) {
  const c = useColors();

  return (
    <View style={styles.wrapper}>
      {/* Search + filter button row */}
      <View style={styles.row}>
        <View style={[styles.searchBox, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Ionicons name="search-outline" size={18} color={c.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder={searchPlaceholder}
            placeholderTextColor={c.textMuted}
            value={search}
            onChangeText={onSearchChange}
            accessibilityLabel="Search"
            accessibilityRole="search"
            testID="filter-search-input"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange("")} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: filterCount > 0 ? c.primary : c.surfaceAlt }]}
          onPress={onFilterPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Filters, ${filterCount} active`}
          testID="filter-button"
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={filterCount > 0 ? "#fff" : c.textBody}
          />
          {filterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: "#fff" }]}>
              <Text style={[styles.filterBadgeText, { color: c.primary }]}>{filterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active filter pills */}
      {activeFilters.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
          style={styles.pillsRow}
        >
          {activeFilters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, { backgroundColor: f.color ? `${f.color}15` : c.surfaceAlt, borderColor: f.color ?? c.borderLight }]}
              onPress={f.onClear}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Remove filter: ${f.label}`}
            >
              <Text style={[styles.pillText, { color: f.color ?? c.textBody }]}>{f.label}</Text>
              <Ionicons name="close" size={12} color={f.color ?? c.textMuted} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  pillsRow: {
    flexGrow: 0,
    flexShrink: 0,
  },
  pillsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
