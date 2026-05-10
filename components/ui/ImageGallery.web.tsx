import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Text,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_SM } from "@/constants/Brutalism";

interface ImageGalleryProps {
  uris: string[];
  layout?: "horizontal" | "grid-2" | "grid-3";
  thumbSize?: number;
  maxThumbs?: number;
  gridTileSize?: number;
  testIDPrefix?: string;
}

/**
 * Web-only ImageGallery. The native version uses react-native-image-viewing,
 * but that package's dist has only `.android.js` / `.ios.js` variants and
 * Metro can't resolve it on web. This shim renders a Modal + ScrollView
 * with arrow-key navigation — adequate for the QA + tenant-side flow.
 */
export function ImageGallery({
  uris,
  layout = "horizontal",
  thumbSize = 96,
  maxThumbs,
  gridTileSize,
  testIDPrefix = "image",
}: ImageGalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const onThumbPress = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  const next = useCallback(() => setIndex((i) => (i + 1) % uris.length), [uris.length]);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + uris.length) % uris.length),
    [uris.length],
  );

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev]);

  if (!uris || uris.length === 0) return null;

  const cap = maxThumbs ?? uris.length;
  const visible = uris.slice(0, cap);
  const hidden = Math.max(0, uris.length - cap);

  const renderThumb = (uri: string, i: number, square: number) => {
    const isLast = i === visible.length - 1 && hidden > 0;
    return (
      <TouchableOpacity
        key={`${uri}-${i}`}
        onPress={() => onThumbPress(i)}
        accessibilityRole="button"
        accessibilityLabel={`View image ${i + 1} of ${uris.length}`}
        testID={`${testIDPrefix}-thumb-${i}`}
        style={[styles.tile, { width: square, height: square }]}
      >
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
        {isLast && (
          <View style={styles.moreOverlay}>
            <Text style={styles.moreText}>+{hidden}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  let body: React.ReactNode = null;
  if (layout === "horizontal") {
    const thumbs = visible.map((uri, i) => renderThumb(uri, i, thumbSize));
    body = visible.length <= 1 ? (
      <View style={styles.row}>{thumbs}</View>
    ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {thumbs}
      </ScrollView>
    );
  } else {
    const cols = layout === "grid-2" ? 2 : 3;
    body = (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {visible.map((uri, i) => renderThumb(uri, i, gridTileSize ?? (cols === 2 ? 140 : 110)))}
      </View>
    );
  }

  return (
    <View testID={`${testIDPrefix}-gallery`}>
      {body}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.lightboxBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.lightboxHeader} pointerEvents="box-none">
            <Text style={styles.lightboxCount}>
              {index + 1} / {uris.length}
            </Text>
            <TouchableOpacity
              style={styles.lightboxClose}
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close gallery"
              testID={`${testIDPrefix}-close`}
            >
              <Ionicons name="close" size={26} color={palette.paper} />
            </TouchableOpacity>
          </View>
          <Pressable style={styles.lightboxBody} onPress={(e) => e.stopPropagation()}>
            <Image source={{ uri: uris[index] }} style={styles.lightboxImage} resizeMode="contain" />
          </Pressable>
          {uris.length > 1 && (
            <View style={styles.lightboxControls} pointerEvents="box-none">
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); prev(); }}
                style={styles.lightboxArrow}
                accessibilityLabel="Previous image"
                testID={`${testIDPrefix}-prev`}
              >
                <Ionicons name="chevron-back" size={32} color={palette.paper} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); next(); }}
                style={styles.lightboxArrow}
                accessibilityLabel="Next image"
                testID={`${testIDPrefix}-next`}
              >
                <Ionicons name="chevron-forward" size={32} color={palette.paper} />
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  tile: {
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    backgroundColor: palette.paper,
    overflow: "hidden",
    ...SHADOW_SM,
  },
  image: { width: "100%", height: "100%" },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,10,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: {
    fontFamily: FONT.display,
    fontSize: 22,
    fontWeight: "900",
    color: palette.paper,
    letterSpacing: -0.6,
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10,10,10,0.95)",
    justifyContent: "center",
  },
  lightboxHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 24,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  lightboxCount: {
    fontFamily: FONT.display,
    fontSize: 14,
    fontWeight: "900",
    color: palette.paper,
    letterSpacing: 0.4,
  },
  lightboxClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 60 },
  lightboxImage: { width: "100%", height: "100%" },
  lightboxControls: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  lightboxArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
