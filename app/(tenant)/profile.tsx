import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useTenantRequests } from "@/hooks/useRequests";
import { updateUserProfile } from "@/services/auth";
import { resetOnboarding } from "@/services/onboarding";
import { router } from "expo-router";
import { showSuccess, showError } from "@/utils/toast";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { WebContainer } from "@/components/ui/WebContainer";
import { TutorialAction } from "@/components/profile/TutorialAction";

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
    <WebContainer>
      <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
        {/* Avatar block — bold and centered */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <View
            style={{
              width: 96,
              height: 96,
              backgroundColor: palette.cobalt500,
              borderWidth: BORDER.heavy,
              borderColor: palette.ink,
              alignItems: "center",
              justifyContent: "center",
              ...SHADOW_MD,
            }}
          >
            <Text
              style={{
                fontFamily: FONT.display,
                fontSize: 48,
                fontWeight: "900",
                color: palette.paper,
                letterSpacing: 0,
              }}
            >
              {user?.name?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          {!editing ? (
            <>
              <Text
                style={{
                  marginTop: 16,
                  fontFamily: FONT.display,
                  fontSize: 24,
                  fontWeight: "900",
                  color: c.text,
                  letterSpacing: 0,
                }}
              >
                {user?.name}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontFamily: FONT.mono,
                  fontSize: 12,
                  color: c.textBody,
                  letterSpacing: 0.3,
                }}
              >
                {user?.email}
              </Text>
              {user?.unitNumber && (
                <Text
                  style={{
                    marginTop: 4,
                    fontFamily: FONT.mono,
                    fontSize: 12,
                    color: c.textMuted,
                  }}
                >
                  UNIT · {user.unitNumber.toUpperCase()}
                </Text>
              )}
              <View
                style={{
                  marginTop: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  backgroundColor: palette.cobalt500,
                  borderWidth: BORDER.base,
                  borderColor: palette.ink,
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT.display,
                    fontSize: 11,
                    fontWeight: "900",
                    color: palette.paper,
                    letterSpacing: 1.4,
                  }}
                >
                  TENANT
                </Text>
              </View>
            </>
          ) : (
            <View style={{ width: "100%", marginTop: 16 }}>
              <BrutalField value={name} onChangeText={setName} placeholder="Name" colors={c} testID="profile-name-input" />
              <BrutalField value={unitNumber} onChangeText={setUnitNumber} placeholder="Unit Number" colors={c} testID="profile-unit-input" />
            </View>
          )}
        </View>

        {/* Stats */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: c.surface,
            borderWidth: BORDER.heavy,
            borderColor: palette.ink,
            borderRadius: RADIUS.sm,
            ...SHADOW_MD,
            marginBottom: 18,
          }}
        >
          <StatColumn label="Total" value={stats.total} color={c.text} />
          <View style={{ width: BORDER.base, backgroundColor: palette.ink }} />
          <StatColumn label="Open" value={stats.open} color={palette.tomato500} />
          <View style={{ width: BORDER.base, backgroundColor: palette.ink }} />
          <StatColumn label="Done" value={stats.completed} color={palette.lime700} />
        </View>

        {/* Edit / Save */}
        {editing ? (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
            <BrutalButton label="Cancel" onPress={() => setEditing(false)} variant="ghost" testID="profile-cancel-button" />
            <BrutalButton
              label={saving ? "Saving..." : "Save"}
              onPress={handleSave}
              disabled={saving}
              loading={saving}
              variant="primary"
              testID="profile-save-button"
            />
          </View>
        ) : (
          <BrutalButton label="Edit Profile" onPress={() => setEditing(true)} variant="ghost" testID="profile-edit-button" />
        )}

        <View style={{ height: 12 }} />

        <TutorialAction
          onPress={async () => {
            if (!user) return;
            try {
              await resetOnboarding(user.uid);
              router.replace("/onboarding");
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Failed";
              showError("Error", msg);
            }
          }}
        />

        <View style={{ height: 12 }} />

        <BrutalButton
          label="Sign out"
          onPress={() => confirm("Sign Out", "Are you sure you want to sign out?", signOut, { destructive: true })}
          variant="danger"
          testID="profile-signout-button"
        />
        <ConfirmModal {...confirmProps} />
      </ScrollView>
    </WebContainer>
  );
}

function StatColumn({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 18 }}>
      <Text
        style={{
          fontFamily: FONT.display,
          fontSize: 32,
          fontWeight: "900",
          color,
          letterSpacing: 0,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: FONT.display,
          fontSize: 10,
          fontWeight: "900",
          color: palette.ink,
          letterSpacing: 0.8,
          marginTop: 4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function BrutalField({
  value,
  onChangeText,
  placeholder,
  colors: c,
  testID,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
  testID?: string;
}) {
  return (
    <TextInput
      style={{
        borderWidth: BORDER.base,
        borderColor: palette.ink,
        borderRadius: RADIUS.xs,
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontFamily: FONT.body,
        fontSize: 15,
        color: c.text,
        backgroundColor: c.surface,
        marginBottom: 10,
        ...SHADOW_SM,
      }}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={c.textMuted}
      testID={testID}
    />
  );
}

function BrutalButton({
  label,
  onPress,
  variant,
  disabled,
  loading,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant: "primary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}) {
  const bg =
    variant === "primary" ? palette.cobalt500 : variant === "danger" ? palette.tomato500 : palette.paper;
  const fg = variant === "ghost" ? palette.ink : palette.paper;
  return (
    <TouchableOpacity
      style={{
        flex: 1,
        backgroundColor: bg,
        borderWidth: BORDER.heavy,
        borderColor: palette.ink,
        paddingVertical: 14,
        alignItems: "center",
        ...SHADOW_MD,
        opacity: disabled ? 0.6 : 1,
      }}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text
          style={{
            fontFamily: FONT.display,
            fontSize: 13,
            fontWeight: "900",
            color: fg,
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
