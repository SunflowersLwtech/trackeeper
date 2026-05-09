/**
 * Client-side image compression — resize + JPEG transcode.
 *
 * Standard mobile-app compression target (mirrors WhatsApp / Slack):
 *   • Long edge ≤ 1920 px
 *   • JPEG quality 0.7
 *   • HEIC/HEIF → JPEG transparently (Android & web cannot render HEIC)
 *
 * Returns the compressed local URI plus the resulting size in bytes when
 * known. The original file is left untouched on disk.
 *
 * Falls back to the original URI if expo-image-manipulator throws (very rare,
 * e.g. unreadable file) — the upload step will still validate and may reject.
 */
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import {
  IMAGE_JPEG_QUALITY,
  IMAGE_RESIZE_LONG_EDGE,
} from "@/utils/images";

export interface CompressedImage {
  /** Local file URI suitable for fetch/blob upload. */
  uri: string;
  /** True if the image was actually transformed (resized or transcoded). */
  modified: boolean;
}

const HEIC_PATTERN = /\.(heic|heif)(\?.*)?$/i;

/**
 * Compress one image. Resizes the long edge to 1920px (preserves aspect
 * ratio), encodes as JPEG at quality 0.7. HEIC/HEIF inputs are always
 * transcoded so they can be displayed cross-platform.
 */
export async function compressImage(uri: string): Promise<CompressedImage> {
  const isHeic = HEIC_PATTERN.test(uri);

  try {
    // expo-image-manipulator decides resize vs no-op via the actions array.
    // Passing { resize: { width: ... } } without a height preserves aspect.
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: IMAGE_RESIZE_LONG_EDGE } }],
      {
        compress: IMAGE_JPEG_QUALITY,
        format: SaveFormat.JPEG,
      },
    );
    return {
      uri: result.uri,
      modified: true,
    };
  } catch (err) {
    // Don't block upload on a compression hiccup — log + pass-through.
    // The HEIC case is the only one where pass-through is risky (renderers
    // may not handle it), so we surface a clearer error there.
    if (isHeic) {
      throw new Error("Could not transcode HEIC image. Please choose a JPEG or PNG.");
    }
    console.warn("[compressImage] fallback to original:", err);
    return { uri, modified: false };
  }
}

/**
 * Compress an array of images, in parallel with capped concurrency. Order is
 * preserved in the output. Failures bubble up — call sites should validate
 * the input list (size + count) before invoking.
 */
export async function compressImages(
  uris: string[],
  concurrency = 3,
): Promise<CompressedImage[]> {
  const out: CompressedImage[] = new Array(uris.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= uris.length) return;
      out[i] = await compressImage(uris[i]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, uris.length) }, worker);
  await Promise.all(workers);
  return out;
}
