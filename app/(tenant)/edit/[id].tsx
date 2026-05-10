import React, { useMemo, useState, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useRequest } from "@/hooks/useRequest";
import { updateRequest } from "@/services/requests";
import { RequestCategory } from "@/types";
import { validateRequestForm } from "@/utils/validation";
import { showSuccess, showError } from "@/utils/toast";
import { getPriorityColor, getPriorityLabel, suggestPriority } from "@/utils/priority";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";

const CATEGORIES: RequestCategory[] = ["Plumbing", "Electrical", "General"];

export default function EditRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request, loading: requestLoading } = useRequest(id);
  const c = useColors();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RequestCategory | "">("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      setTitle(request.title);
      setDescription(request.description);
      setCategory(request.category);
    }
  }, [request]);

  const preview = useMemo(() => {
    if (!request || !category || !title.trim() || !description.trim()) return null;
    return suggestPriority(
      title,
      description,
      category as RequestCategory,
      request.prioritySuggestion?.factors ?? request.priorityFactors ?? [],
    );
  }, [request, title, description, category]);

  const handleSave = async () => {
    const errors = validateRequestForm({ title, description, category });
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={palette.cobalt500} />
      </View>
    );
  }

  if (!request || request.status !== "submitted") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background, padding: 24 }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: "900", color: c.textBody, letterSpacing: 0.4, textTransform: "uppercase", textAlign: "center" }}>
          This request cannot be edited
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Stack.Screen options={{ headerShown: true, title: "Edit Request" }} />
      <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        <BrutalLabel>Title</BrutalLabel>
        <TextInput
          style={{
            borderWidth: BORDER.base,
            borderColor: palette.ink,
            paddingHorizontal: 14,
            paddingVertical: 14,
            fontFamily: FONT.body,
            fontSize: 15,
            color: c.text,
            backgroundColor: c.surface,
            marginBottom: 18,
            ...SHADOW_SM,
          }}
          value={title}
          onChangeText={setTitle}
          testID="edit-request-title-input"
        />

        <BrutalLabel>Category</BrutalLabel>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 18 }}>
          {CATEGORIES.map((cat) => {
            const selected = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                  backgroundColor: selected ? palette.cobalt500 : c.surface,
                  ...(selected ? SHADOW_SM : {}),
                }}
                onPress={() => setCategory(cat)}
                testID={`edit-request-category-${cat.toLowerCase()}`}
              >
                <Text
                  style={{
                    fontFamily: FONT.display,
                    fontSize: 12,
                    fontWeight: "900",
                    color: selected ? palette.paper : palette.ink,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {preview && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              backgroundColor: getPriorityColor(preview.priority),
              marginBottom: 18,
              ...SHADOW_SM,
            }}
          >
            <Ionicons name="git-network-outline" size={18} color={preview.priority === "high" ? palette.paper : palette.ink} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={{
                  fontFamily: FONT.display,
                  fontSize: 10,
                  fontWeight: "900",
                  color: preview.priority === "high" ? palette.paper : palette.ink,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                System triage
              </Text>
              <Text
                style={{
                  fontFamily: FONT.body,
                  fontSize: 12,
                  color: preview.priority === "high" ? palette.paper : palette.ink,
                  marginTop: 2,
                }}
              >
                {getPriorityLabel(preview.priority)} - {preview.reason}
              </Text>
            </View>
          </View>
        )}

        <BrutalLabel>Description</BrutalLabel>
        <TextInput
          style={{
            borderWidth: BORDER.base,
            borderColor: palette.ink,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: FONT.body,
            fontSize: 14,
            color: c.text,
            backgroundColor: c.surface,
            height: 130,
            textAlignVertical: "top",
            marginBottom: 26,
            ...SHADOW_SM,
          }}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          testID="edit-request-description-input"
        />

        <TouchableOpacity
          style={{
            backgroundColor: loading ? palette.cobalt300 : palette.cobalt500,
            borderWidth: BORDER.heavy,
            borderColor: palette.ink,
            paddingVertical: 18,
            alignItems: "center",
            ...SHADOW_MD,
          }}
          onPress={handleSave}
          disabled={loading}
          testID="edit-request-save-button"
        >
          {loading ? (
            <ActivityIndicator color={palette.paper} />
          ) : (
            <Text
              style={{
                fontFamily: FONT.display,
                fontSize: 14,
                fontWeight: "900",
                color: palette.paper,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BrutalLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: FONT.display,
        fontSize: 11,
        fontWeight: "900",
        color: palette.ink,
        marginBottom: 8,
        letterSpacing: 0.8,
        textTransform: "uppercase",
      }}
    >
      ◼ {children}
    </Text>
  );
}
