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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MultiImagePicker } from "@/components/ui/MultiImagePicker";
import { useAuth } from "@/hooks/useAuth";
import { createRequest } from "@/services/requests";
import { RequestCategory, TriageFactor } from "@/types";
import { friendlyErrorMessage } from "@/utils/errorMessages";
import { validateRequestForm } from "@/utils/validation";
import { showSuccess, showError } from "@/utils/toast";
import {
  suggestPriority,
  getPriorityColor,
  getPriorityLabel,
  TRIAGE_FACTOR_DESCRIPTIONS,
  TRIAGE_FACTOR_LABELS,
} from "@/utils/priority";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";

const CATEGORIES: { value: RequestCategory; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { value: "Plumbing", icon: "water-outline", description: "Leaks, drains, water" },
  { value: "Electrical", icon: "flash-outline", description: "Power, lighting, sockets" },
  { value: "General", icon: "build-outline", description: "Locks, doors, fixtures" },
];

interface ExampleCase {
  title: string;
  description: string;
  category: RequestCategory;
  triageFactors: TriageFactor[];
  icon: keyof typeof Ionicons.glyphMap;
}

const TRIAGE_FACTORS: { value: TriageFactor; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "safety_hazard", icon: "warning-outline" },
  { value: "active_damage", icon: "water-outline" },
  { value: "essential_service_down", icon: "power-outline" },
  { value: "access_security", icon: "lock-closed-outline" },
  { value: "worsening", icon: "trending-up-outline" },
];

const EXAMPLE_CASES: ExampleCase[] = [
  {
    title: "Bathroom sink leaking under cabinet",
    description:
      "Started this morning — water is dripping steadily from the U-bend and pooling inside the cabinet. I've placed a bucket but it fills every 30 minutes. No flooding yet but the wood is starting to swell.",
    category: "Plumbing",
    triageFactors: ["active_damage", "worsening"],
    icon: "water-outline",
  },
  {
    title: "Living room socket sparked when plugging in",
    description:
      "A small spark and burning smell came from the wall outlet next to the TV when I plugged in a charger. I've unplugged everything and switched off that breaker. Safety concern — please send someone today if possible.",
    category: "Electrical",
    triageFactors: ["safety_hazard"],
    icon: "flash-outline",
  },
  {
    title: "Front door lock won't turn from outside",
    description:
      "The key goes in but won't rotate to unlock — happens on every attempt since yesterday. From inside the latch works fine. I'm currently entering through the back door; cannot lock up properly when leaving.",
    category: "General",
    triageFactors: ["access_security"],
    icon: "build-outline",
  },
];

export default function CreateRequestScreen() {
  const { user } = useAuth();
  const c = useColors();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RequestCategory | "">("");
  const [triageFactors, setTriageFactors] = useState<TriageFactor[]>([]);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Live priority preview from the risk checklist and request text.
  const preview = useMemo(() => {
    if (!category || !title.trim() || !description.trim()) return null;
    return suggestPriority(title, description, category as RequestCategory, triageFactors);
  }, [title, description, category, triageFactors]);

  const previewColor = preview ? getPriorityColor(preview.priority) : palette.ink;
  const previewTextLight = preview?.priority === "high"; // tomato → light text

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
        imageUris,
        triageFactors,
      });
      setTitle("");
      setDescription("");
      setCategory("");
      setTriageFactors([]);
      setImageUris([]);
      setFieldErrors({});
      showSuccess("Submitted!", "Your manager has been notified — you can chat with the assigned maintainer once the request is picked up.");
      router.back();
    } catch (error: unknown) {
      const message = friendlyErrorMessage(error, "Failed to submit request. Try again.");
      showError("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        {/* Example cases — tap to auto-fill */}
        <View style={{ marginBottom: 22 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: palette.mustard500, borderWidth: BORDER.base, borderColor: palette.ink }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 10, fontWeight: "900", color: palette.ink, letterSpacing: 0.8 }}>
                EXAMPLES
              </Text>
            </View>
            <Text style={{ fontFamily: FONT.body, fontSize: 11, color: c.textBody, marginLeft: 10 }}>
              Tap to use as starting point
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {EXAMPLE_CASES.map((ex) => (
              <TouchableOpacity
                key={ex.title}
                style={{
                  width: 220,
                  marginRight: 12,
                  padding: 14,
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                  backgroundColor: c.surface,
                  ...SHADOW_SM,
                }}
                onPress={() => {
                  setTitle(ex.title);
                  setDescription(ex.description);
                  setCategory(ex.category);
                  setTriageFactors(ex.triageFactors);
                  setFieldErrors({});
                }}
                accessibilityRole="button"
                accessibilityLabel={`Use example: ${ex.title}`}
                testID={`create-request-example-${ex.category.toLowerCase()}`}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      backgroundColor: palette.cobalt500,
                      borderWidth: 1.5,
                      borderColor: palette.ink,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    <Ionicons name={ex.icon} size={14} color={palette.paper} />
                  </View>
                  <Text style={{ fontFamily: FONT.display, fontSize: 10, fontWeight: "900", color: palette.ink, letterSpacing: 0.6 }}>
                    {ex.category.toUpperCase()}
                  </Text>
                </View>
                <Text style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: "900", color: c.text, marginBottom: 6, letterSpacing: 0 }} numberOfLines={1}>
                  {ex.title}
                </Text>
                <Text style={{ fontFamily: FONT.body, fontSize: 11, color: c.textBody, lineHeight: 14 }} numberOfLines={3}>
                  {ex.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Title */}
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: palette.ink, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" }}>
            ◼ What's wrong?
          </Text>
          <TextInput
            style={{
              borderWidth: BORDER.base,
              borderColor: fieldErrors.title ? palette.tomato500 : palette.ink,
              paddingHorizontal: 14,
              paddingVertical: 14,
              color: c.text,
              fontFamily: FONT.body,
              fontSize: 15,
              backgroundColor: c.surface,
              ...SHADOW_SM,
            }}
            placeholder="Short summary, e.g. Bathroom leak"
            placeholderTextColor={c.textMuted}
            value={title}
            onChangeText={(t) => { setTitle(t); setFieldErrors((e) => { const { title: _t, ...rest } = e; return rest; }); }}
            accessibilityLabel="Request title"
            testID="create-request-title-input"
          />
          {fieldErrors.title && (
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, marginTop: 6, color: palette.tomato500 }}>{fieldErrors.title}</Text>
          )}
        </View>

        {/* Category — brutalist card picker */}
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: palette.ink, marginBottom: 8, letterSpacing: 0.8, textTransform: "uppercase" }}>
            ◼ Category
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {CATEGORIES.map((cat) => {
              const selected = category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    paddingHorizontal: 8,
                    borderWidth: BORDER.base,
                    borderColor: palette.ink,
                    backgroundColor: selected ? palette.cobalt500 : c.surface,
                    alignItems: "center",
                    ...(selected ? SHADOW_MD : SHADOW_SM),
                  }}
                  onPress={() => { setCategory(cat.value); setFieldErrors((e) => { const { category: _c, ...rest } = e; return rest; }); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Category: ${cat.value}`}
                  accessibilityState={{ selected }}
                  testID={`create-request-category-${cat.value.toLowerCase()}`}
                >
                  <Ionicons name={cat.icon} size={24} color={selected ? palette.paper : palette.ink} />
                  <Text
                    style={{
                      marginTop: 6,
                      fontFamily: FONT.display,
                      fontSize: 13,
                      fontWeight: "900",
                      color: selected ? palette.paper : palette.ink,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                    }}
                  >
                    {cat.value}
                  </Text>
                  <Text
                    style={{
                      fontFamily: FONT.body,
                      fontSize: 10,
                      color: selected ? palette.paper : c.textBody,
                      marginTop: 3,
                      textAlign: "center",
                      opacity: selected ? 0.9 : 1,
                    }}
                  >
                    {cat.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {fieldErrors.category && (
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, marginTop: 6, color: palette.tomato500 }}>{fieldErrors.category}</Text>
          )}
        </View>

        {/* Risk checklist */}
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: palette.ink, marginBottom: 8, letterSpacing: 0.8, textTransform: "uppercase" }}>
            ◼ Risk checklist
          </Text>
          <Text style={{ fontFamily: FONT.body, fontSize: 12, color: c.textBody, lineHeight: 17, marginBottom: 10 }}>
            Select only what applies. This drives the system triage and manager SLA queue.
          </Text>
          <View style={{ gap: 8 }}>
            {TRIAGE_FACTORS.map((factor) => {
              const selected = triageFactors.includes(factor.value);
              return (
                <TouchableOpacity
                  key={factor.value}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    borderWidth: BORDER.base,
                    borderColor: palette.ink,
                    backgroundColor: selected ? palette.mustard500 : c.surface,
                    ...SHADOW_SM,
                  }}
                  onPress={() => {
                    setTriageFactors((current) =>
                      current.includes(factor.value)
                        ? current.filter((value) => value !== factor.value)
                        : [...current, factor.value],
                    );
                  }}
                  accessibilityRole="checkbox"
                  accessibilityLabel={TRIAGE_FACTOR_LABELS[factor.value]}
                  accessibilityState={{ checked: selected }}
                  testID={`create-request-triage-${factor.value}`}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: selected ? palette.ink : palette.paper,
                      borderWidth: BORDER.base,
                      borderColor: palette.ink,
                      marginRight: 10,
                    }}
                  >
                    <Ionicons name={factor.icon} size={16} color={selected ? palette.paper : palette.ink} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: palette.ink, letterSpacing: 0.4, textTransform: "uppercase" }}>
                      {TRIAGE_FACTOR_LABELS[factor.value]}
                    </Text>
                    <Text style={{ fontFamily: FONT.body, fontSize: 11, color: palette.ink, lineHeight: 15, marginTop: 2 }} numberOfLines={2}>
                      {TRIAGE_FACTOR_DESCRIPTIONS[factor.value]}
                    </Text>
                  </View>
                  <Ionicons name={selected ? "checkbox" : "square-outline"} size={20} color={palette.ink} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View style={{ marginBottom: 18 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: palette.ink, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" }}>
            ◼ Tell us more
          </Text>
          <TextInput
            style={{
              borderWidth: BORDER.base,
              borderColor: fieldErrors.description ? palette.tomato500 : palette.ink,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: c.text,
              fontFamily: FONT.body,
              fontSize: 14,
              minHeight: 130,
              textAlignVertical: "top",
              backgroundColor: c.surface,
              ...SHADOW_SM,
            }}
            placeholder="When did it start? How bad is it? Any safety concern?"
            placeholderTextColor={c.textMuted}
            value={description}
            onChangeText={(t) => { setDescription(t); setFieldErrors((e) => { const { description: _d, ...rest } = e; return rest; }); }}
            multiline
            numberOfLines={6}
            accessibilityLabel="Request description"
            testID="create-request-description-input"
          />
          {fieldErrors.description && (
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, marginTop: 6, color: palette.tomato500 }}>{fieldErrors.description}</Text>
          )}
        </View>

        {/* Live priority preview */}
        {preview && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              backgroundColor: previewColor,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              ...SHADOW_MD,
              marginBottom: 18,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                backgroundColor: palette.paper,
                borderWidth: BORDER.base,
                borderColor: palette.ink,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="flag" size={20} color={previewColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text
                style={{
                  fontFamily: FONT.display,
                  fontSize: 10,
                  fontWeight: "900",
                  color: previewTextLight ? palette.paper : palette.ink,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  opacity: 0.85,
                }}
              >
                ◼ System triage
              </Text>
              <Text
                style={{
                  fontFamily: FONT.display,
                  fontSize: 16,
                  fontWeight: "900",
                  color: previewTextLight ? palette.paper : palette.ink,
                  marginTop: 3,
                  letterSpacing: 0.2,
                }}
              >
                {getPriorityLabel(preview.priority).toUpperCase()} · {preview.reason}
              </Text>
            </View>
          </View>
        )}

        {/* Photos — multi-image picker */}
        <View style={{ marginBottom: 26 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: palette.ink, marginBottom: 10, letterSpacing: 0.8, textTransform: "uppercase" }}>
            ◼ Photos (optional)
          </Text>
          <MultiImagePicker
            value={imageUris}
            onChange={setImageUris}
            accessibilityLabelPrefix="request photo"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={{
            backgroundColor: loading ? palette.cobalt300 : palette.cobalt500,
            borderWidth: BORDER.heavy,
            borderColor: palette.ink,
            paddingVertical: 18,
            alignItems: "center",
            ...SHADOW_MD,
          }}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Submit request"
          accessibilityState={{ disabled: loading, busy: loading }}
          testID="create-request-submit-button"
        >
          {loading ? (
            <ActivityIndicator color={palette.paper} />
          ) : (
            <Text
              style={{
                color: palette.paper,
                fontFamily: FONT.display,
                fontSize: 15,
                fontWeight: "900",
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              Submit request →
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
