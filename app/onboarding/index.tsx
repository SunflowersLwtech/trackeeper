import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ListRenderItem,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import {
  getOnboardingSlides,
  markOnboardingComplete,
  markOnboardingSkipped,
  OnboardingSlide,
} from "@/services/onboarding";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";
import { showError } from "@/utils/toast";

const ICONS_BY_KEY: Record<string, keyof typeof Ionicons.glyphMap> = {
  "onboarding/camera": "camera",
  "onboarding/timeline": "git-network",
  "onboarding/star": "star",
  "onboarding/dashboard": "grid",
  "onboarding/calendar": "calendar",
  "onboarding/wallet": "wallet",
  "onboarding/list": "list",
  "onboarding/wrench": "construct",
  "onboarding/coin": "cash",
};

const ACCENTS = [palette.cobalt500, palette.tomato500, palette.lime500];

export default function OnboardingScreen() {
  const { user } = useAuth();
  const role = user?.role ?? "tenant";
  const slides = useMemo<OnboardingSlide[]>(() => getOnboardingSlides(role), [role]);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compactHeight = height - insets.top - insets.bottom < 700;
  const slidePadding = compactHeight ? 24 : 32;
  const illustrationSize = compactHeight ? 124 : 150;
  const illustrationIconSize = compactHeight ? 66 : 78;

  const dismiss = () => {
    if (!user) return;
    router.replace(
      role === "manager" ? "/(manager)" : role === "maintainer" ? "/(maintainer)" : "/(tenant)",
    );
  };

  const onSkip = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await markOnboardingSkipped(user.uid);
      dismiss();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not skip";
      showError("Error", msg);
    } finally {
      setBusy(false);
    }
  };

  const onComplete = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await markOnboardingComplete(user.uid);
      dismiss();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not complete";
      showError("Error", msg);
    } finally {
      setBusy(false);
    }
  };

  const onNext = () => {
    if (page < slides.length - 1) {
      const next = page + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setPage(next);
    } else {
      onComplete();
    }
  };

  const renderItem: ListRenderItem<OnboardingSlide> = ({ item, index }) => {
    const accent = ACCENTS[index % ACCENTS.length];
    const icon = ICONS_BY_KEY[item.illustration] ?? "information-circle";
    return (
      <View style={{ width, padding: slidePadding, justifyContent: "center" }}>
        <View
          style={{
            width: illustrationSize,
            height: illustrationSize,
            backgroundColor: accent,
            borderWidth: BORDER.heavy,
            borderColor: palette.ink,
            alignSelf: "center",
            alignItems: "center",
            justifyContent: "center",
            ...SHADOW_MD,
            transform: [{ rotate: `${(index - 1) * 4}deg` }],
            marginBottom: compactHeight ? 24 : 32,
          }}
          testID={`onboarding-illustration-${item.key}`}
        >
          <Ionicons name={icon} size={illustrationIconSize} color={palette.paper} />
        </View>
        <Text
          style={{
            fontFamily: FONT.display,
            fontSize: 30,
            fontWeight: "900",
            color: palette.ink,
            letterSpacing: 0,
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          {item.title}
        </Text>
        <View style={{ height: BORDER.heavy, backgroundColor: accent, width: 56, alignSelf: "center", marginVertical: 16 }} />
        <Text
          style={{
            fontFamily: FONT.body,
            fontSize: 15,
            lineHeight: 22,
            color: palette.ink600,
            textAlign: "center",
            paddingHorizontal: 4,
          }}
        >
          {item.body}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.cream100 }} testID="onboarding-screen">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Skip */}
      <TouchableOpacity
        style={{
          position: "absolute",
          top: Math.max(16, insets.top + 12),
          right: 20,
          zIndex: 1,
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: palette.paper,
          borderWidth: BORDER.base,
          borderColor: palette.ink,
          ...SHADOW_SM,
        }}
        onPress={onSkip}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
        testID="onboarding-skip"
      >
        <Text
          style={{
            fontFamily: FONT.display,
            fontSize: 11,
            fontWeight: "900",
            color: palette.ink,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          Skip →
        </Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setPage(idx);
        }}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />

      {/* Footer: dots + next */}
      <View style={{ paddingHorizontal: 24, paddingBottom: Math.max(24, insets.bottom + 20) }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 18 }}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === page ? 28 : 12,
                height: 12,
                backgroundColor: i === page ? palette.ink : palette.paper,
                borderWidth: BORDER.base,
                borderColor: palette.ink,
              }}
              testID={`onboarding-dot-${i}`}
            />
          ))}
        </View>
        <TouchableOpacity
          style={{
            paddingVertical: 18,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            backgroundColor: page === slides.length - 1 ? palette.lime500 : palette.cobalt500,
            borderWidth: BORDER.heavy,
            borderColor: palette.ink,
            ...SHADOW_MD,
            opacity: busy ? 0.7 : 1,
          }}
          onPress={onNext}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={page === slides.length - 1 ? slides[page]?.cta || "Done" : "Next slide"}
          testID="onboarding-next"
        >
          {busy ? (
            <ActivityIndicator color={palette.paper} />
          ) : (
            <>
              <Text
                style={{
                  fontFamily: FONT.display,
                  fontSize: 15,
                  fontWeight: "900",
                  color: page === slides.length - 1 ? palette.ink : palette.paper,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                {page === slides.length - 1
                  ? (slides[page]?.cta ?? "Get started")
                  : "Next"}
              </Text>
              <Ionicons
                name={page === slides.length - 1 ? "checkmark" : "arrow-forward"}
                size={18}
                color={page === slides.length - 1 ? palette.ink : palette.paper}
              />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
