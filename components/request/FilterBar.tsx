import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RequestCategory } from "@/types";
import { useColors } from "@/hooks/useColors";

export type SortOption = "newest" | "oldest" | "priority";

interface FilterBarProps {
  search: string;
  onSearchChange: (text: string) => void;
  categoryFilter: RequestCategory | "all";
  onCategoryChange: (category: RequestCategory | "all") => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const CATEGORIES: { label: string; value: RequestCategory | "all"; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "All", value: "all", icon: "apps-outline" },
  { label: "Plumbing", value: "Plumbing", icon: "water-outline" },
  { label: "Electrical", value: "Electrical", icon: "flash-outline" },
  { label: "General", value: "General", icon: "build-outline" },
];

const SORTS: { label: string; value: SortOption }[] = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Priority", value: "priority" },
];

/**
 * Secondary filter bar — search + category + sort.
 * Each section has its own row to avoid cramping.
 */
export function FilterBar({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  sort,
  onSortChange,
}: FilterBarProps) {
  const c = useColors();

  return (
    <View style={styles.wrapper}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Ionicons name="search-outline" size={18} color={c.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder="Search requests..."
            placeholderTextColor={c.textMuted}
            value={search}
            onChangeText={onSearchChange}
            accessibilityLabel="Search requests"
            accessibilityRole="search"
            testID="filter-search-input"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange("")} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category + Sort in one compact row */}
      <View style={styles.filtersRow}>
        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
          style={styles.pillsScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = categoryFilter === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                onPress={() => onCategoryChange(cat.value)}
                activeOpacity={0.7}
                style={[
                  styles.pill,
                  isActive
                    ? { backgroundColor: c.violet, borderColor: c.violet }
                    : { backgroundColor: c.surfaceAlt, borderColor: c.borderLight },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Category: ${cat.label}`}
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons
                  name={cat.icon}
                  size={13}
                  color={isActive ? "#fff" : c.textTertiary}
                  style={styles.pillIcon}
                />
                <Text
                  style={[
                    styles.pillText,
                    { color: isActive ? "#fff" : c.textBody },
                    isActive && styles.pillTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sort divider + selector */}
        <View style={[styles.sortDivider, { backgroundColor: c.borderLight }]} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortContainer}
        >
          {SORTS.map((s) => {
            const isActive = sort === s.value;
            return (
              <TouchableOpacity
                key={s.value}
                onPress={() => onSortChange(s.value)}
                activeOpacity={0.7}
                style={[
                  styles.sortPill,
                  isActive
                    ? { backgroundColor: c.text, borderColor: c.text }
                    : { backgroundColor: "transparent", borderColor: c.borderLight },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Sort: ${s.label}`}
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.sortText,
                    { color: isActive ? c.background : c.textTertiary },
                    isActive && styles.sortTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
  },
  pillsContainer: {
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 2,
  },
  pillsScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  pillIcon: {
    marginRight: 4,
  },
  pillText: {
    fontSize: 12,
    lineHeight: 16,
  },
  pillTextActive: {
    fontWeight: "600",
  },
  sortDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 4,
  },
  sortContainer: {
    paddingRight: 16,
    paddingVertical: 2,
  },
  sortPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 4,
  },
  sortText: {
    fontSize: 11,
    lineHeight: 14,
  },
  sortTextActive: {
    fontWeight: "600",
  },
});
