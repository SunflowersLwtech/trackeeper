import React, { useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_SM } from "@/constants/Brutalism";

interface ImageGalleryProps {
  uris: string[];
  /** Layout for the thumbnails before lightbox opens. */
  layout?: "horizontal" | "grid-2" | "grid-3";
  /** Pixel size for horizontal thumbnails (square). Default 96. */
  thumbSize?: number;
  /** Optional cap — extra images collapsed into "+N" overlay on the last tile. */
  maxThumbs?: number;
  /** Override fixed grid tile size for constrained surfaces like chat bubbles. */
  gridTileSize?: number;
  testIDPrefix?: string;
}

/**
 * Horizontal or grid thumbnails that open a full-screen pinch-zoom lightbox
 * on tap. Backed by `react-native-image-viewing` (RN-friendly, no reanimated
 * peer conflict).
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

  if (!uris || uris.length === 0) return null;

  const cap = maxThumbs ?? uris.length;
  const visible = uris.slice(0, cap);
  const hidden = Math.max(0, uris.length - cap);

  const onThumbPress = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {thumbs}
      </ScrollView>
    );
  } else {
    const cols = layout === "grid-2" ? 2 : 3;
    const gap = 8;
    body = (
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap,
        }}
        onLayout={() => {}}
      >
        {visible.map((uri, i) => renderThumb(uri, i, gridTileSize ?? gridTile(cols)))}
      </View>
    );
  }

  return (
    <View testID={`${testIDPrefix}-gallery`}>
      {body}
      <ImageViewing
        images={uris.map((u) => ({ uri: u }))}
        imageIndex={index}
        visible={open}
        onRequestClose={() => setOpen(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        HeaderComponent={({ imageIndex }) => (
          <View style={styles.lightboxHeader}>
            <Text style={styles.lightboxCount}>
              {imageIndex + 1} / {uris.length}
            </Text>
            <TouchableOpacity
              style={styles.lightboxClose}
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close gallery"
            >
              <Ionicons name="close" size={26} color={palette.paper} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

// Grid tile: percentage of width via flexBasis is awkward inline — fall back
// to a fixed width that respects parent at runtime via `gap`.
function gridTile(cols: 2 | 3): number {
  // Caller wraps in flex; fall back to ~140 / ~110 — tuned for chat bubble width.
  return cols === 2 ? 140 : 110;
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
  image: {
    width: "100%",
    height: "100%",
  },
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
  lightboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
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
    backgroundColor: "rgba(10,10,10,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
