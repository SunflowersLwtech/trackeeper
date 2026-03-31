import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useTenantRequests } from "@/hooks/useRequests";
import { updateUserProfile } from "@/services/auth";
import { showSuccess, showError } from "@/utils/toast";

export default function TenantProfileScreen() {
  const { user, signOut } = useAuth();
  const { requests } = useTenantRequests(user?.uid);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [unitNumber, setUnitNumber] = useState(user?.unitNumber ?? "");
  const [saving, setSaving] = useState(false);

  const stats = {
    total: requests.length,
    open: requests.filter((r) => r.status !== "completed" && r.status !== "cancelled").length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { name: name.trim(), unitNumber: unitNumber.trim() });
      showSuccess("Profile updated");
      setEditing(false);
    } catch {
      showError("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-8">
      {/* Avatar */}
      <View className="items-center mb-6">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: "#eff6ff" }}
        >
          <Text className="text-3xl font-bold" style={{ color: "#3b82f6" }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </Text>
        </View>
        {!editing ? (
          <>
            <Text className="text-xl font-semibold" style={{ color: "#111827" }}>
              {user?.name}
            </Text>
            <Text className="text-sm" style={{ color: "#6b7280" }}>{user?.email}</Text>
            {user?.unitNumber && (
              <Text className="text-sm mt-1" style={{ color: "#6b7280" }}>
                Unit: {user.unitNumber}
              </Text>
            )}
            <View className="mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: "#dbeafe" }}>
              <Text className="text-xs font-medium" style={{ color: "#1d4ed8" }}>TENANT</Text>
            </View>
          </>
        ) : (
          <View className="w-full mt-2">
            <TextInput
              className="border rounded-xl px-4 py-3 text-base mb-3"
              style={{ borderColor: "#d1d5db", color: "#111827" }}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              className="border rounded-xl px-4 py-3 text-base mb-3"
              style={{ borderColor: "#d1d5db", color: "#111827" }}
              value={unitNumber}
              onChangeText={setUnitNumber}
              placeholder="Unit Number"
              placeholderTextColor="#9ca3af"
            />
          </View>
        )}
      </View>

      {/* Stats */}
      <View
        className="flex-row rounded-xl p-4 mb-4"
        style={{ backgroundColor: "#f9fafb" }}
      >
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold" style={{ color: "#111827" }}>{stats.total}</Text>
          <Text className="text-xs" style={{ color: "#6b7280" }}>Total</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold" style={{ color: "#f59e0b" }}>{stats.open}</Text>
          <Text className="text-xs" style={{ color: "#6b7280" }}>Open</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold" style={{ color: "#22c55e" }}>{stats.completed}</Text>
          <Text className="text-xs" style={{ color: "#6b7280" }}>Completed</Text>
        </View>
      </View>

      {/* Edit / Save */}
      {editing ? (
        <View className="flex-row mb-3">
          <TouchableOpacity
            className="flex-1 rounded-xl py-3 items-center mr-2 border"
            style={{ borderColor: "#d1d5db" }}
            onPress={() => setEditing(false)}
          >
            <Text className="text-sm font-semibold" style={{ color: "#6b7280" }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 rounded-xl py-3 items-center"
            style={{ backgroundColor: saving ? "#93c5fd" : "#3b82f6" }}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white text-sm font-semibold">Save</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          className="rounded-xl py-3 items-center mb-3 border"
          style={{ borderColor: "#d1d5db" }}
          onPress={() => setEditing(true)}
        >
          <Text className="text-sm font-semibold" style={{ color: "#374151" }}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      {/* Sign Out */}
      <TouchableOpacity
        className="rounded-xl py-4 items-center"
        style={{ backgroundColor: "#ef4444" }}
        onPress={signOut}
      >
        <Text className="text-white text-base font-semibold">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
