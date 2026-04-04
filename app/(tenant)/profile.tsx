import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useTenantRequests } from "@/hooks/useRequests";
import { updateUserProfile } from "@/services/auth";
import { showSuccess, showError } from "@/utils/toast";
import { useColors } from "@/hooks/useColors";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function TenantProfileScreen() {
  const { user, signOut } = useAuth();
  const c = useColors();
  const { confirm, confirmProps } = useConfirm();
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
    <View className="flex-1 px-6 pt-8" style={{ backgroundColor: c.background }}>
      {/* Avatar */}
      <View className="items-center mb-6">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: c.primaryBg }}
        >
          <Text className="text-3xl font-bold" style={{ color: c.primary }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </Text>
        </View>
        {!editing ? (
          <>
            <Text className="text-xl font-semibold" style={{ color: c.text }}>
              {user?.name}
            </Text>
            <Text className="text-sm" style={{ color: c.textTertiary }}>{user?.email}</Text>
            {user?.unitNumber && (
              <Text className="text-sm mt-1" style={{ color: c.textTertiary }}>
                Unit: {user.unitNumber}
              </Text>
            )}
            <View className="mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: c.primaryBadgeBg }}>
              <Text className="text-xs font-medium" style={{ color: c.primaryDark }}>TENANT</Text>
            </View>
          </>
        ) : (
          <View className="w-full mt-2">
            <TextInput
              className="border rounded-xl px-4 py-3 text-base mb-3"
              style={{ borderColor: c.border, color: c.text }}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={c.textMuted}
              testID="profile-name-input"
            />
            <TextInput
              className="border rounded-xl px-4 py-3 text-base mb-3"
              style={{ borderColor: c.border, color: c.text }}
              value={unitNumber}
              onChangeText={setUnitNumber}
              placeholder="Unit Number"
              placeholderTextColor={c.textMuted}
              testID="profile-unit-input"
            />
          </View>
        )}
      </View>

      {/* Stats */}
      <View
        className="flex-row rounded-xl p-4 mb-4"
        style={{ backgroundColor: c.surface }}
      >
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold" style={{ color: c.text }}>{stats.total}</Text>
          <Text className="text-xs" style={{ color: c.textTertiary }}>Total</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold" style={{ color: c.warning }}>{stats.open}</Text>
          <Text className="text-xs" style={{ color: c.textTertiary }}>Open</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold" style={{ color: c.success }}>{stats.completed}</Text>
          <Text className="text-xs" style={{ color: c.textTertiary }}>Completed</Text>
        </View>
      </View>

      {/* Edit / Save */}
      {editing ? (
        <View className="flex-row mb-3">
          <TouchableOpacity
            className="flex-1 rounded-xl py-3 items-center mr-2 border"
            style={{ borderColor: c.border }}
            onPress={() => setEditing(false)}
            testID="profile-cancel-button"
          >
            <Text className="text-sm font-semibold" style={{ color: c.textTertiary }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 rounded-xl py-3 items-center"
            style={{ backgroundColor: saving ? c.primaryLight : c.primary }}
            onPress={handleSave}
            disabled={saving}
            testID="profile-save-button"
          >
            {saving ? (
              <ActivityIndicator color={c.background} size="small" />
            ) : (
              <Text className="text-sm font-semibold" style={{ color: c.background }}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          className="rounded-xl py-3 items-center mb-3 border"
          style={{ borderColor: c.border }}
          onPress={() => setEditing(true)}
          testID="profile-edit-button"
        >
          <Text className="text-sm font-semibold" style={{ color: c.textSecondary }}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      {/* Sign Out */}
      <TouchableOpacity
        className="rounded-xl py-4 items-center"
        style={{ backgroundColor: c.error }}
        onPress={() => confirm("Sign Out", "Are you sure you want to sign out?", signOut, { destructive: true })}
        testID="profile-signout-button"
      >
        <Text className="text-base font-semibold" style={{ color: c.background }}>Sign Out</Text>
      </TouchableOpacity>
      <ConfirmModal {...confirmProps} />
    </View>
  );
}
