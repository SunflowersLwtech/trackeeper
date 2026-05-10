import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useMaintainerRequests } from "@/hooks/useMaintainerRequests";
import { resetOnboarding } from "@/services/onboarding";
import { router } from "expo-router";
import { showError } from "@/utils/toast";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_MD } from "@/constants/Brutalism";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { WebContainer } from "@/components/ui/WebContainer";
import { TutorialAction } from "@/components/profile/TutorialAction";

export default function MaintainerProfileScreen() {
  const c = useColors();
  const { user, signOut } = useAuth();
  const { confirm, confirmProps } = useConfirm();
  const { requests } = useMaintainerRequests(user?.uid);

  const assignedCount = requests.filter((r) => r.status === "assigned").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const onHoldCount = requests.filter((r) => r.status === "on_hold").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;

  const ratedRequests = requests.filter((r) => r.rating);
  const avgRating =
    ratedRequests.length > 0
      ? (
          ratedRequests.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
          ratedRequests.length
        ).toFixed(1)
      : null;

  const stats = [
    { label: "Assigned", count: assignedCount, color: palette.cobalt500 },
    { label: "In Progress", count: inProgressCount, color: palette.mustard500 },
    { label: "On Hold", count: onHoldCount, color: palette.plum500 },
    { label: "Completed", count: completedCount, color: palette.lime500 },
    { label: "Total", count: requests.length, color: palette.ink },
  ];

  return (
    <WebContainer>
      <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}>
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <View
            style={{
              width: 96,
              height: 96,
              backgroundColor: palette.tomato500,
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
          <Text style={{ marginTop: 4, fontFamily: FONT.mono, fontSize: 12, color: c.textBody, letterSpacing: 0.3 }}>
            {user?.email}
          </Text>
          <View
            style={{
              marginTop: 12,
              paddingHorizontal: 12,
              paddingVertical: 4,
              backgroundColor: palette.tomato500,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
            }}
          >
            <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: palette.paper, letterSpacing: 1.4 }}>
              MAINTAINER
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: c.surface,
            borderWidth: BORDER.heavy,
            borderColor: palette.ink,
            ...SHADOW_MD,
            marginBottom: 18,
          }}
        >
          <View style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: palette.ink }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 12, fontWeight: "900", color: palette.paper, letterSpacing: 1, textTransform: "uppercase" }}>
              ◼ Work overview
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", padding: 14 }}>
            {stats.map((s) => (
              <StatCell key={s.label} value={s.count} label={s.label} color={s.color} />
            ))}
            {avgRating && <StatCell value={avgRating} label="Avg rating" color={palette.mustard500} />}
          </View>
        </View>

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

        <TouchableOpacity
          style={{
            backgroundColor: palette.tomato500,
            borderWidth: BORDER.heavy,
            borderColor: palette.ink,
            paddingVertical: 16,
            alignItems: "center",
            ...SHADOW_MD,
          }}
          onPress={() => confirm("Sign Out", "Are you sure you want to sign out?", signOut, { destructive: true })}
          testID="profile-signout-button"
        >
          <Text style={{ color: palette.paper, fontFamily: FONT.display, fontSize: 14, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" }}>
            Sign out
          </Text>
        </TouchableOpacity>
        <ConfirmModal {...confirmProps} />
      </ScrollView>
    </WebContainer>
  );
}

function StatCell({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <View style={{ width: "50%", marginBottom: 12, paddingRight: 8 }}>
      <Text style={{ fontFamily: FONT.display, fontSize: 26, fontWeight: "900", color, letterSpacing: 0 }}>
        {value}
      </Text>
      <Text style={{ fontFamily: FONT.display, fontSize: 10, fontWeight: "900", color: palette.ink, marginTop: 2, letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </Text>
    </View>
  );
}
