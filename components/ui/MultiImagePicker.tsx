import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_SM } from "@/constants/Brutalism";
import {
  MAX_IMAGES_PER_REQUEST,
  assertWithinImageLimit,
} from "@/utils/images";

export type ImageEntryStatus = "ready" | "uploading" | "failed";

export interface ImageEntry {
  uri: string;
  status?: ImageEntryStatus;
  /** 0–1 progress for the in-progress overlay. */
  progress?: number;
}

interface MultiImagePickerProps {
  /** Either bare uris (treated as "ready") or rich entries. */
  value: string[] | ImageEntry[];
  onChange: (uris: string[]) => void;
  max?: number;
  accessibilityLabelPrefix?: string;
  /** Optional retry callback fired when the user taps a failed thumbnail. */
  onRetry?: (index: number) => void;
}

/**
 * 3-col grid of image thumbnails with a trailing "+" tile, X-chip remove
 * affordance, in-progress / failed overlays, and an "N/MAX" counter.
 *
 * Internally uses expo-image-picker's multi-select API with selectionLimit set
 * to the remaining capacity so the user cannot pick more than allowed.
 */
export function MultiImagePicker({
  value,
  onChange,
  max = MAX_IMAGES_PER_REQUEST,
  accessibilityLabelPrefix = "image",
  onRetry,
}: MultiImagePickerProps) {
  const [picking, setPicking] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);

  const entries: ImageEntry[] = (value as Array<string | ImageEntry>).map((v) =>
    typeof v === "string" ? { uri: v, status: "ready" as const } : v,
  );

  const remaining = Math.max(0, max - entries.length);
  const showAddButton = remaining > 0;
  const tileSize = gridWidth > 0
    ? Math.min(128, Math.max(88, Math.floor((gridWidth - 16) / 3)))
    : 104;

  const onAdd = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.85,
      });
      if (result.canceled) return;
      const uris = result.assets.map((a) => a.uri).filter(Boolean);
      try {
        assertWithinImageLimit(uris.length, entries.length, max);
      } catch (e) {
        Alert.alert("Cannot add", e instanceof Error ? e.message : String(e));
        return;
      }
      onChange([...entries.map((e) => e.uri), ...uris]);
    } finally {
      setPicking(false);
    }
  };

  const onRemove = (index: number) => {
    const next = entries.filter((_, i) => i !== index).map((e) => e.uri);
    onChange(next);
  };

  return (
    <View testID="multi-image-picker">
      <View
        style={styles.grid}
        onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
      >
        {entries.map((entry, idx) => (
          <Thumbnail
            key={`${entry.uri}-${idx}`}
            entry={entry}
            index={idx}
            tileSize={tileSize}
            label={`${accessibilityLabelPrefix} ${idx + 1}`}
            onRemove={() => onRemove(idx)}
            onRetry={onRetry ? () => onRetry(idx) : undefined}
          />
        ))}
        {showAddButton && (
          <TouchableOpacity
            style={[styles.tile, styles.addTile, { width: tileSize, height: tileSize }]}
            onPress={onAdd}
            disabled={picking}
            accessibilityRole="button"
            accessibilityLabel={`Add ${accessibilityLabelPrefix}, ${remaining} remaining`}
            testID="multi-image-add"
          >
            {picking ? (
              <ActivityIndicator color={palette.ink} />
            ) : (
              <>
                <Ionicons name="add" size={32} color={palette.ink} />
                <Text style={styles.addCaption}>{remaining} LEFT</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.counter} testID="multi-image-counter">
        {entries.length} / {max}
      </Text>
    </View>
  );
}

interface ThumbnailProps {
  entry: ImageEntry;
  index: number;
  tileSize: number;
  label: string;
  onRemove: () => void;
  onRetry?: () => void;
}

function Thumbnail({ entry, index, tileSize, label, onRemove, onRetry }: ThumbnailProps) {
  const isUploading = entry.status === "uploading";
  const isFailed = entry.status === "failed";
  const pct = Math.max(0, Math.min(1, entry.progress ?? 0));

  return (
    <View style={[styles.tile, { width: tileSize, height: tileSize }]} testID={`multi-image-thumbnail-${index}`}>
      <Image source={{ uri: entry.uri }} style={styles.image} resizeMode="cover" />

      {isUploading && (
        <View style={[StyleSheet.absoluteFillObject, styles.overlay]}>
          <ActivityIndicator color={palette.paper} size="large" />
          <Text style={styles.overlayPct}>{Math.round(pct * 100)}%</Text>
        </View>
      )}

      {isFailed && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFillObject, styles.overlayFailed]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={`Retry uploading ${label}`}
        >
          <Ionicons name="warning" size={28} color={palette.paper} />
          <Text style={styles.overlayPct}>TAP TO RETRY</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.removeBadge}
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}`}
        testID={`multi-image-remove-${index}`}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="close" size={14} color={palette.paper} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tile: {
    borderRadius: 8,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    backgroundColor: palette.paper,
    overflow: "hidden",
    position: "relative",
    ...SHADOW_SM,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  removeBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(10,10,10,0.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: palette.paper,
  },
  addTile: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.cream100,
  },
  addCaption: {
    marginTop: 2,
    textAlign: "center",
    paddingHorizontal: 2,
    fontFamily: FONT.display,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: palette.ink600,
    textTransform: "uppercase",
  },
  overlay: {
    backgroundColor: "rgba(10,10,10,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayFailed: {
    backgroundColor: "rgba(255,77,46,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayPct: {
    marginTop: 4,
    fontFamily: FONT.display,
    fontSize: 10,
    fontWeight: "900",
    color: palette.paper,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  counter: {
    marginTop: 8,
    fontFamily: FONT.mono,
    fontSize: 11,
    color: palette.ink500,
    letterSpacing: 0.4,
    textAlign: "right",
  },
});

MultiImagePicker.displayName = "MultiImagePicker";
