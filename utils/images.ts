/**
 * Image limit + accessor helpers for multi-image support.
 *
 * Industry-standard caps drawn from WeChat (9), Telegram (10), and
 * insurance-claim apps (15). We use 9 for requests (3×3 grid) and 6 for
 * chat messages (denser inline display).
 */

import type { MaintenanceRequest, Message } from "@/types";

/** Max images attached to a single maintenance request. */
export const MAX_IMAGES_PER_REQUEST = 9;

/** Max images attached to a single chat message. */
export const MAX_IMAGES_PER_MESSAGE = 6;

/** Per-image hard cap before upload (matches storage.rules). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Compression target: long edge in pixels. */
export const IMAGE_RESIZE_LONG_EDGE = 1920;

/** Compression target: JPEG quality 0–1. */
export const IMAGE_JPEG_QUALITY = 0.7;

/** Concurrent uploads per batch (network-friendly). */
export const UPLOAD_CONCURRENCY = 3;

/**
 * Read images off a request, preferring the canonical `imageUrls` array but
 * falling back to the legacy `imageUrl` so older docs still render.
 */
export function getRequestImages(req: Pick<MaintenanceRequest, "imageUrl" | "imageUrls"> | null | undefined): string[] {
  if (!req) return [];
  if (Array.isArray(req.imageUrls) && req.imageUrls.length > 0) {
    return req.imageUrls;
  }
  if (typeof req.imageUrl === "string" && req.imageUrl.length > 0) {
    return [req.imageUrl];
  }
  return [];
}

/** Same fallback semantics as getRequestImages, for chat messages. */
export function getMessageImages(msg: Pick<Message, "imageUrl" | "imageUrls"> | null | undefined): string[] {
  if (!msg) return [];
  if (Array.isArray(msg.imageUrls) && msg.imageUrls.length > 0) {
    return msg.imageUrls;
  }
  if (typeof msg.imageUrl === "string" && msg.imageUrl.length > 0) {
    return [msg.imageUrl];
  }
  return [];
}

/**
 * Throws a user-friendly Error if the supplied list would exceed the cap.
 * Use before invoking the picker so the user can't pick more than allowed.
 */
export function assertWithinImageLimit(
  newCount: number,
  existingCount: number,
  cap: number,
): void {
  const total = newCount + existingCount;
  if (total > cap) {
    const remaining = Math.max(0, cap - existingCount);
    throw new Error(
      remaining === 0
        ? `Maximum ${cap} images reached`
        : `You can only add ${remaining} more (${cap} max)`,
    );
  }
}
