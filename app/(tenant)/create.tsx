import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { createRequest } from "@/services/requests";
import { RequestCategory, RequestPriority } from "@/types";
import { validateRequestForm } from "@/utils/validation";
import { showSuccess, showError } from "@/utils/toast";
import { getPriorityColor } from "@/utils/priority";
import { useColors } from "@/hooks/useColors";
import { withOpacity } from "@/utils/color";

const CATEGORIES: RequestCategory[] = ["Plumbing", "Electrical", "General"];
const PRIORITIES: { value: RequestPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export default function CreateRequestScreen() {
  const { user } = useAuth();
  const c = useColors();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RequestCategory | "">("");
  const [priority, setPriority] = useState<RequestPriority>("medium");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showError("Permission needed", "Camera access is required to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    const errors = validateRequestForm({ title, description, category, priority });
    if (errors.length > 0) {
      const errorMap: Record<string, string> = {};
      errors.forEach((e) => { errorMap[e.field] = e.message; });
      setFieldErrors(errorMap);
      showError("Validation Error", errors[0].message);
      return;
    }
    setFieldErrors({});
    if (!user) return;

    setLoading(true);
    try {
      await createRequest({
        title: title.trim(),
        description: description.trim(),
        category: category as RequestCategory,
        priority,
        tenantId: user.uid,
        tenantName: user.name,
        imageUri: imageUri ?? undefined,
      });
      // Reset form state before navigating back so re-opening the screen is clean
      setTitle("");
      setDescription("");
      setCategory("");
      setPriority("medium");
      setImageUri(null);
      setFieldErrors({});
      showSuccess("Your request has been submitted!");
      router.back();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit request";
      showError("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView className="flex-1" style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 24 }}>
        {/* Title */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-1" style={{ color: c.textSecondary }}>Title</Text>
          <TextInput
            className="border rounded-xl px-4 py-3 text-base"
            style={{ borderColor: fieldErrors.title ? c.error : c.border, color: c.text }}
            placeholder="Brief description of the issue"
            placeholderTextColor={c.textMuted}
            value={title}
            onChangeText={(t) => { setTitle(t); setFieldErrors((e) => { const { title: _, ...rest } = e; return rest; }); }}
            accessibilityLabel="Request title"
            testID="create-request-title-input"
          />
          {fieldErrors.title && (
            <Text className="text-xs mt-1" style={{ color: c.error }}>{fieldErrors.title}</Text>
          )}
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-2" style={{ color: c.textSecondary }}>Category</Text>
          <View className="flex-row">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                className="mr-2 px-4 py-2 rounded-xl border"
                style={{
                  borderColor: category === cat ? c.primary : c.border,
                  backgroundColor: category === cat ? c.primaryBg : c.background,
                }}
                onPress={() => { setCategory(cat); setFieldErrors((e) => { const { category: _, ...rest } = e; return rest; }); }}
                accessibilityRole="button"
                accessibilityLabel={`Category: ${cat}`}
                accessibilityState={{ selected: category === cat }}
                testID={`create-request-category-${cat.toLowerCase()}`}
              >
                <Text
                  className="text-sm"
                  style={{ color: category === cat ? c.primary : c.textSecondary }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {fieldErrors.category && (
            <Text className="text-xs mt-1" style={{ color: c.error }}>{fieldErrors.category}</Text>
          )}
        </View>

        {/* Priority */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-2" style={{ color: c.textSecondary }}>Priority</Text>
          <View className="flex-row">
            {PRIORITIES.map((p) => {
              const color = getPriorityColor(p.value);
              const selected = priority === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  className="mr-2 flex-row items-center px-4 py-2 rounded-xl border"
                  style={{
                    borderColor: selected ? color : c.border,
                    backgroundColor: selected ? withOpacity(color, 0.08) : c.background,
                  }}
                  onPress={() => setPriority(p.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Priority: ${p.label}`}
                  accessibilityState={{ selected }}
                  testID={`create-request-priority-${p.value}`}
                >
                  <View
                    className="w-2.5 h-2.5 rounded-full mr-2"
                    style={{ backgroundColor: color }}
                  />
                  <Text
                    className="text-sm"
                    style={{ color: selected ? color : c.textSecondary }}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-1" style={{ color: c.textSecondary }}>Description</Text>
          <TextInput
            className="border rounded-xl px-4 py-3 text-base"
            style={{
              borderColor: fieldErrors.description ? c.error : c.border,
              color: c.text,
              height: 120,
              textAlignVertical: "top",
            }}
            placeholder="Provide detailed information about the issue..."
            placeholderTextColor={c.textMuted}
            value={description}
            onChangeText={(t) => { setDescription(t); setFieldErrors((e) => { const { description: _, ...rest } = e; return rest; }); }}
            multiline
            numberOfLines={5}
            accessibilityLabel="Request description"
            testID="create-request-description-input"
          />
          {fieldErrors.description && (
            <Text className="text-xs mt-1" style={{ color: c.error }}>{fieldErrors.description}</Text>
          )}
        </View>

        {/* Image */}
        <View className="mb-6">
          <Text className="text-sm font-medium mb-2" style={{ color: c.textSecondary }}>Photo (optional)</Text>
          {imageUri ? (
            <View className="mb-2">
              <Image
                source={{ uri: imageUri }}
                className="w-full rounded-xl"
                style={{ height: 200 }}
                resizeMode="cover"
              />
              <TouchableOpacity
                className="absolute top-2 right-2 w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: c.overlay }}
                onPress={() => setImageUri(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                testID="create-request-remove-photo"
              >
                <Text style={{ color: c.background }} className="text-base">×</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View className="flex-row">
            <TouchableOpacity
              className="flex-1 border rounded-xl py-3 items-center mr-2"
              style={{ borderColor: c.border }}
              onPress={takePhoto}
              accessibilityRole="button"
              accessibilityLabel="Take photo with camera"
              testID="create-request-camera-button"
            >
              <Text style={{ color: c.textSecondary }}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 border rounded-xl py-3 items-center"
              style={{ borderColor: c.border }}
              onPress={pickImage}
              accessibilityRole="button"
              accessibilityLabel="Choose photo from gallery"
              testID="create-request-gallery-button"
            >
              <Text style={{ color: c.textSecondary }}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          className="rounded-xl py-4 items-center"
          style={{ backgroundColor: loading ? c.primaryLight : c.primary }}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Submit request"
          accessibilityState={{ disabled: loading, busy: loading }}
          testID="create-request-submit-button"
        >
          {loading ? (
            <ActivityIndicator color={c.background} />
          ) : (
            <Text className="text-base font-semibold" style={{ color: c.background }}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
