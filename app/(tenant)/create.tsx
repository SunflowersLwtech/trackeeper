import React, { useMemo, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { createRequest } from "@/services/requests";
import { RequestCategory } from "@/types";
import { validateRequestForm } from "@/utils/validation";
import { showSuccess, showError } from "@/utils/toast";
import { suggestPriority, getPriorityColor, getPriorityLabel } from "@/utils/priority";
import { useColors } from "@/hooks/useColors";
import { withOpacity } from "@/utils/color";

const CATEGORIES: { value: RequestCategory; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { value: "Plumbing", icon: "water-outline", description: "Leaks, drains, water" },
  { value: "Electrical", icon: "flash-outline", description: "Power, lighting, sockets" },
  { value: "General", icon: "build-outline", description: "Locks, doors, fixtures" },
];

interface ExampleCase {
  title: string;
  description: string;
  category: RequestCategory;
  icon: keyof typeof Ionicons.glyphMap;
}

const EXAMPLE_CASES: ExampleCase[] = [
  {
    title: "Bathroom sink leaking under cabinet",
    description:
      "Started this morning — water is dripping steadily from the U-bend and pooling inside the cabinet. I've placed a bucket but it fills every 30 minutes. No flooding yet but the wood is starting to swell.",
    category: "Plumbing",
    icon: "water-outline",
  },
  {
    title: "Living room socket sparked when plugging in",
    description:
      "A small spark and burning smell came from the wall outlet next to the TV when I plugged in a charger. I've unplugged everything and switched off that breaker. Safety concern — please send someone today if possible.",
    category: "Electrical",
    icon: "flash-outline",
  },
  {
    title: "Front door lock won't turn from outside",
    description:
      "The key goes in but won't rotate to unlock — happens on every attempt since yesterday. From inside the latch works fine. I'm currently entering through the back door; cannot lock up properly when leaving.",
    category: "General",
    icon: "build-outline",
  },
];

export default function CreateRequestScreen() {
  const { user } = useAuth();
  const c = useColors();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RequestCategory | "">("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Live priority preview based on the user's input.
  const preview = useMemo(() => {
    if (!category || !title.trim() || !description.trim()) return null;
    return suggestPriority(title, description, category as RequestCategory);
  }, [title, description, category]);

  const previewColor = preview ? getPriorityColor(preview.priority) : c.textTertiary;

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
    const errors = validateRequestForm({ title, description, category });
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
        tenantId: user.uid,
        tenantName: user.name,
        tenantUnit: user.unitNumber,
        imageUri: imageUri ?? undefined,
      });
      setTitle("");
      setDescription("");
      setCategory("");
      setImageUri(null);
      setFieldErrors({});
      showSuccess("Submitted!", "Your manager has been notified — you can chat with the assigned maintainer once the request is picked up.");
      router.back();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit request";
      showError("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        {/* Example cases — tap to auto-fill a real-world scenario */}
        <View style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="sparkles-outline" size={14} color={c.primary} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: c.primary, marginLeft: 6, letterSpacing: 0.3 }}>
              EXAMPLES
            </Text>
            <Text style={{ fontSize: 11, color: c.textMuted, marginLeft: 8 }}>
              Tap to use as a starting point
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {EXAMPLE_CASES.map((ex) => (
              <TouchableOpacity
                key={ex.title}
                style={{
                  width: 200,
                  marginRight: 10,
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.borderLight,
                  backgroundColor: c.surface,
                }}
                onPress={() => {
                  setTitle(ex.title);
                  setDescription(ex.description);
                  setCategory(ex.category);
                  setFieldErrors({});
                }}
                accessibilityRole="button"
                accessibilityLabel={`Use example: ${ex.title}`}
                testID={`create-request-example-${ex.category.toLowerCase()}`}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      backgroundColor: withOpacity(c.primary, 0.12),
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 6,
                    }}
                  >
                    <Ionicons name={ex.icon} size={14} color={c.primary} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: c.textTertiary, letterSpacing: 0.3 }}>
                    {ex.category.toUpperCase()}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: "700", color: c.text, marginBottom: 4 }} numberOfLines={1}>
                  {ex.title}
                </Text>
                <Text style={{ fontSize: 11, color: c.textTertiary }} numberOfLines={3}>
                  {ex.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Title */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 6 }}>What's wrong?</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: fieldErrors.title ? c.error : c.border,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 14,
              color: c.text,
              fontSize: 15,
              backgroundColor: c.background,
            }}
            placeholder="Short summary, e.g. Bathroom leak"
            placeholderTextColor={c.textMuted}
            value={title}
            onChangeText={(t) => { setTitle(t); setFieldErrors((e) => { const { title: _t, ...rest } = e; return rest; }); }}
            accessibilityLabel="Request title"
            testID="create-request-title-input"
          />
          {fieldErrors.title && (
            <Text style={{ fontSize: 11, marginTop: 4, color: c.error }}>{fieldErrors.title}</Text>
          )}
        </View>

        {/* Category — card-style picker */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 8 }}>Category</Text>
          <View style={{ flexDirection: "row" }}>
            {CATEGORIES.map((cat) => {
              const selected = category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 8,
                    marginRight: cat.value === "General" ? 0 : 8,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: selected ? c.primary : c.border,
                    backgroundColor: selected ? c.primaryBg : c.background,
                    alignItems: "center",
                  }}
                  onPress={() => { setCategory(cat.value); setFieldErrors((e) => { const { category: _c, ...rest } = e; return rest; }); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Category: ${cat.value}`}
                  accessibilityState={{ selected }}
                  testID={`create-request-category-${cat.value.toLowerCase()}`}
                >
                  <Ionicons name={cat.icon} size={22} color={selected ? c.primary : c.textTertiary} />
                  <Text style={{ marginTop: 4, fontSize: 13, fontWeight: selected ? "700" : "500", color: selected ? c.primary : c.textSecondary }}>
                    {cat.value}
                  </Text>
                  <Text style={{ fontSize: 9, color: c.textMuted, marginTop: 2, textAlign: "center" }}>
                    {cat.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {fieldErrors.category && (
            <Text style={{ fontSize: 11, marginTop: 4, color: c.error }}>{fieldErrors.category}</Text>
          )}
        </View>

        {/* Description */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 6 }}>
            Tell us more
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: fieldErrors.description ? c.error : c.border,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: c.text,
              fontSize: 14,
              minHeight: 110,
              textAlignVertical: "top",
              backgroundColor: c.background,
            }}
            placeholder="When did it start? How bad is it? Any safety concern?"
            placeholderTextColor={c.textMuted}
            value={description}
            onChangeText={(t) => { setDescription(t); setFieldErrors((e) => { const { description: _d, ...rest } = e; return rest; }); }}
            multiline
            numberOfLines={5}
            accessibilityLabel="Request description"
            testID="create-request-description-input"
          />
          {fieldErrors.description && (
            <Text style={{ fontSize: 11, marginTop: 4, color: c.error }}>{fieldErrors.description}</Text>
          )}
        </View>

        {/* Live priority preview */}
        {preview && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderRadius: 14,
              backgroundColor: withOpacity(previewColor, 0.08),
              borderWidth: 1,
              borderColor: withOpacity(previewColor, 0.3),
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: withOpacity(previewColor, 0.18),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="flag" size={18} color={previewColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: c.textTertiary }}>
                AI suggested priority
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "800", color: previewColor, marginTop: 2 }}>
                {getPriorityLabel(preview.priority)} · {preview.reason}
              </Text>
              <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}>
                Manager will review and adjust if needed.
              </Text>
            </View>
          </View>
        )}

        {/* Image */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 8 }}>
            Photo (optional but helpful)
          </Text>
          {imageUri ? (
            <View style={{ marginBottom: 8 }}>
              <Image source={{ uri: imageUri }} style={{ width: "100%", height: 200, borderRadius: 14 }} resizeMode="cover" />
              <TouchableOpacity
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: c.overlay,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() => setImageUri(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                testID="create-request-remove-photo"
              >
                <Ionicons name="close" size={18} color={c.background} />
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              style={{ flex: 1, marginRight: 8, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center" }}
              onPress={takePhoto}
              accessibilityRole="button"
              accessibilityLabel="Take photo with camera"
              testID="create-request-camera-button"
            >
              <Ionicons name="camera-outline" size={18} color={c.textSecondary} />
              <Text style={{ marginLeft: 6, color: c.textSecondary, fontSize: 13, fontWeight: "600" }}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center" }}
              onPress={pickImage}
              accessibilityRole="button"
              accessibilityLabel="Choose photo from gallery"
              testID="create-request-gallery-button"
            >
              <Ionicons name="image-outline" size={18} color={c.textSecondary} />
              <Text style={{ marginLeft: 6, color: c.textSecondary, fontSize: 13, fontWeight: "600" }}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={{
            backgroundColor: loading ? c.primaryLight : c.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            shadowColor: c.primary,
            shadowOpacity: 0.18,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
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
            <Text style={{ color: c.background, fontSize: 15, fontWeight: "700" }}>Submit request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
