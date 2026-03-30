import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
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
import { RequestCategory } from "@/types";
import { validateRequestForm } from "@/utils/validation";

const CATEGORIES: RequestCategory[] = ["Plumbing", "Electrical", "General"];

export default function CreateRequestScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RequestCategory | "">("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      Alert.alert("Permission needed", "Camera access is required to take photos.");
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
      Alert.alert("Validation Error", errors[0].message);
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      await createRequest({
        title: title.trim(),
        description: description.trim(),
        category: category as RequestCategory,
        tenantId: user.uid,
        tenantName: user.name,
        imageUri: imageUri ?? undefined,
      });
      Alert.alert("Success", "Your request has been submitted!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit request";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
        {/* Title */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-1" style={{ color: "#374151" }}>Title</Text>
          <TextInput
            className="border rounded-xl px-4 py-3 text-base"
            style={{ borderColor: "#d1d5db", color: "#111827" }}
            placeholder="Brief description of the issue"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
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

        {/* Description */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-1" style={{ color: "#374151" }}>Description</Text>
          <TextInput
            className="border rounded-xl px-4 py-3 text-base"
            style={{
              borderColor: "#d1d5db",
              color: "#111827",
              height: 120,
              textAlignVertical: "top",
            }}
            placeholder="Provide detailed information about the issue..."
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
          />
        </View>

        {/* Image */}
        <View className="mb-6">
          <Text className="text-sm font-medium mb-2" style={{ color: "#374151" }}>Photo (optional)</Text>
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
                style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                onPress={() => setImageUri(null)}
              >
                <Text className="text-white text-base">×</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View className="flex-row">
            <TouchableOpacity
              className="flex-1 border rounded-xl py-3 items-center mr-2"
              style={{ borderColor: "#d1d5db" }}
              onPress={takePhoto}
            >
              <Text style={{ color: "#374151" }}>📷 Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 border rounded-xl py-3 items-center"
              style={{ borderColor: "#d1d5db" }}
              onPress={pickImage}
            >
              <Text style={{ color: "#374151" }}>🖼 Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          className="rounded-xl py-4 items-center"
          style={{ backgroundColor: loading ? "#93c5fd" : "#3b82f6" }}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">Submit Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
