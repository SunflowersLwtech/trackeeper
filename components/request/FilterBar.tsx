import React from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RequestStatus, RequestCategory } from "@/types";

const STATUS_FILTERS: Array<{ label: string; value: RequestStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Submitted", value: "submitted" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in_progress" },
  { label: "On Hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const CATEGORY_FILTERS: Array<{ label: string; value: RequestCategory | "all" }> = [
  { label: "All", value: "all" },
  { label: "Plumbing", value: "Plumbing" },
  { label: "Electrical", value: "Electrical" },
  { label: "General", value: "General" },
];

export type SortOption = "newest" | "oldest" | "priority";

const SORT_OPTIONS: Array<{ label: string; value: SortOption }> = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Priority", value: "priority" },
];

interface FilterBarProps {
  search: string;
  onSearchChange: (text: string) => void;
  statusFilter: RequestStatus | "all";
  onStatusChange: (status: RequestStatus | "all") => void;
  categoryFilter: RequestCategory | "all";
  onCategoryChange: (category: RequestCategory | "all") => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

function ChipRow<T extends string>({
  items,
  selected,
  onSelect,
}: {
  items: Array<{ label: string; value: T }>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 6 }}
    >
      {items.map((item) => (
        <TouchableOpacity
          key={item.value}
          className="mr-2 px-3 py-1.5 rounded-full border"
          style={{
            borderColor: selected === item.value ? "#3b82f6" : "#d1d5db",
            backgroundColor: selected === item.value ? "#eff6ff" : "#fff",
          }}
          onPress={() => onSelect(item.value)}
        >
          <Text
            className="text-xs"
            style={{ color: selected === item.value ? "#3b82f6" : "#6b7280" }}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export function FilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  sort,
  onSortChange,
}: FilterBarProps) {
  return (
    <View>
      {/* Search */}
      <View className="px-4 pt-3 pb-1">
        <View
          className="flex-row items-center border rounded-xl px-3 py-2"
          style={{ borderColor: "#d1d5db", backgroundColor: "#f9fafb" }}
        >
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-sm"
            style={{ color: "#111827" }}
            placeholder="Search requests..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={onSearchChange}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange("")}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status filters */}
      <ChipRow items={STATUS_FILTERS} selected={statusFilter} onSelect={onStatusChange} />

      {/* Category + Sort row */}
      <View className="flex-row items-center px-4 pb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
          {CATEGORY_FILTERS.map((item) => (
            <TouchableOpacity
              key={item.value}
              className="mr-2 px-3 py-1.5 rounded-full border"
              style={{
                borderColor: categoryFilter === item.value ? "#8b5cf6" : "#e5e7eb",
                backgroundColor: categoryFilter === item.value ? "#f5f3ff" : "#fff",
              }}
              onPress={() => onCategoryChange(item.value)}
            >
              <Text
                className="text-xs"
                style={{ color: categoryFilter === item.value ? "#8b5cf6" : "#6b7280" }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort */}
        <View className="flex-row ml-2">
          {SORT_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item.value}
              className="ml-1 px-2 py-1.5 rounded-md"
              style={{
                backgroundColor: sort === item.value ? "#111827" : "#f3f4f6",
              }}
              onPress={() => onSortChange(item.value)}
            >
              <Text
                className="text-xs"
                style={{ color: sort === item.value ? "#fff" : "#6b7280" }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}
