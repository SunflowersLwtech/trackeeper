import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useColors } from "@/hooks/useColors";
import { contrastText } from "@/utils/color";

export interface FilterOption {
  label: string;
  value: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  count?: number;
}

export interface FilterSection {
  title: string;
  key: string;
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  sections: FilterSection[];
  onReset?: () => void;
}

/**
 * Bottom sheet with filter sections.
 * Each section has a title and a list of tappable options.
 */
export function FilterSheet({ visible, onClose, sections, onReset }: FilterSheetProps) {
  const c = useColors();

  const hasActiveFilters = sections.some((s) => s.selected !== s.options[0]?.value);

  return (
    <BottomSheet visible={visible} onClose={onClose} heightFraction={0.55}>
      <View style={[styles.header, { borderBottomColor: c.borderLight }]}>
        <Text style={[styles.title, { color: c.text }]}>Filters</Text>
        {hasActiveFilters && onReset && (
          <TouchableOpacity onPress={onReset} accessibilityRole="button" accessibilityLabel="Reset all filters">
            <Text style={[styles.resetText, { color: c.primary }]}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>{section.title}</Text>
            <View style={styles.optionsGrid}>
              {section.options.map((opt) => {
                const isActive = section.selected === opt.value;
                const color = opt.color ?? c.primary;
                const textOnColor = contrastText(color);
                const badgeBg = textOnColor === "#fff" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.1)";
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.option,
                      isActive
                        ? { backgroundColor: color, borderColor: color }
                        : { backgroundColor: c.surfaceAlt, borderColor: c.borderLight },
                    ]}
                    onPress={() => {
                      section.onSelect(opt.value);
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected: isActive }}
                  >
                    {opt.icon && (
                      <Ionicons
                        name={opt.icon}
                        size={14}
                        color={isActive ? textOnColor : c.text}
                        style={styles.optionIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        { color: isActive ? textOnColor : c.text },
                        isActive && styles.optionTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                    {opt.count !== undefined && (
                      <View style={[styles.countBadge, { backgroundColor: isActive ? badgeBg : c.surface }]}>
                        <Text style={[styles.countText, { color: isActive ? textOnColor : color }]}>
                          {opt.count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Apply button */}
      <View style={[styles.footer, { borderTopColor: c.borderLight }]}>
        <TouchableOpacity
          style={[styles.applyButton, { backgroundColor: c.primary }]}
          onPress={onClose}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Apply filters"
        >
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  resetText: {
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  optionIcon: {
    marginRight: 5,
  },
  optionText: {
    fontSize: 13,
  },
  optionTextActive: {
    fontWeight: "600",
  },
  countBadge: {
    marginLeft: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  countText: {
    fontSize: 10,
    fontWeight: "700",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  applyButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  applyText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
