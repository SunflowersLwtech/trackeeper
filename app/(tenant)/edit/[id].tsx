import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useRequest } from "@/hooks/useRequest";
import { updateRequest } from "@/services/requests";
import { RequestCategory, RequestPriority } from "@/types";
import { validateRequestForm } from "@/utils/validation";
import { showSuccess, showError } from "@/utils/toast";
import { getPriorityColor } from "@/utils/priority";

const CATEGORIES: RequestCategory[] = ["Plumbing", "Electrical", "General"];
const PRIORITIES: { value: RequestPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export default function EditRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request, loading: requestLoading } = useRequest(id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RequestCategory | "">("");
  const [priority, setPriority] = useState<RequestPriority>("medium");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      setTitle(request.title);
      setDescription(request.description);
      setCategory(request.category);
      setPriority(request.priority ?? "medium");
    }
  }, [request]);

  const handleSave = async () => {
    const errors = validateRequestForm({ title, description, category, priority });
    if (errors.length > 0) {
      showError("Validation Error", errors[0].message);
      return;
    }
    if (!id) return;

    setLoading(true);
    try {
      await updateRequest(id, {
        title: title.trim(),
        description: description.trim(),
        category: category as RequestCategory,
        priority,
      });
      showSuccess("Request updated");
      router.back();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update";
      showError("Error", message);
    } finally {
      setLoading(false);
    }
  };

  if (requestLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!request || request.status !== "submitted") {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text style={{ color: "#6b7280" }}>This request cannot be edited</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Stack.Screen options={{ headerShown: true, title: "Edit Request" }} />
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
        {/* Title */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-1" style={{ color: "#374151" }}>Title</Text>
          <TextInput
            className="border rounded-xl px-4 py-3 text-base"
            style={{ borderColor: "#d1d5db", color: "#111827" }}
            value={title}
            onChangeText={setTitle}
            testID="edit-request-title-input"
          />
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-2" style={{ color: "#374151" }}>Category</Text>
          <View className="flex-row">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                className="mr-2 px-4 py-2 rounded-xl border"
                style={{
                  borderColor: category === cat ? "#3b82f6" : "#d1d5db",
                  backgroundColor: category === cat ? "#eff6ff" : "#fff",
                }}
                onPress={() => setCategory(cat)}
                testID={`edit-request-category-${cat.toLowerCase()}`}
              >
                <Text
                  className="text-sm"
                  style={{ color: category === cat ? "#3b82f6" : "#374151" }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Priority */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-2" style={{ color: "#374151" }}>Priority</Text>
          <View className="flex-row">
            {PRIORITIES.map((p) => {
              const color = getPriorityColor(p.value);
              const selected = priority === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  className="mr-2 flex-row items-center px-4 py-2 rounded-xl border"
                  style={{
                    borderColor: selected ? color : "#d1d5db",
                    backgroundColor: selected ? color + "15" : "#fff",
                  }}
                  onPress={() => setPriority(p.value)}
                  testID={`edit-request-priority-${p.value}`}
                >
                  <View
                    className="w-2.5 h-2.5 rounded-full mr-2"
                    style={{ backgroundColor: color }}
                  />
                  <Text className="text-sm" style={{ color: selected ? color : "#374151" }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View className="mb-6">
          <Text className="text-sm font-medium mb-1" style={{ color: "#374151" }}>Description</Text>
          <TextInput
            className="border rounded-xl px-4 py-3 text-base"
            style={{
              borderColor: "#d1d5db",
              color: "#111827",
              height: 120,
              textAlignVertical: "top",
            }}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            testID="edit-request-description-input"
          />
        </View>

        {/* Save */}
        <TouchableOpacity
          className="rounded-xl py-4 items-center"
          style={{ backgroundColor: loading ? "#93c5fd" : "#3b82f6" }}
          onPress={handleSave}
          disabled={loading}
          testID="edit-request-save-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
