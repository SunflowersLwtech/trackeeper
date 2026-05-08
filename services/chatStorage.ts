import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { storage } from "@/config/firebase";

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"] as const;

/**
 * Upload a chat image to Firebase Storage at
 * `requests/{requestId}/chat/{ts}.jpg` and resolve to the public download URL.
 *
 * Validates the file extension before uploading. Uses a resumable upload
 * (mirrors uploadRequestImage in services/requests.ts).
 */
export async function uploadChatImage(uri: string, requestId: string): Promise<string> {
  // Validate by file extension since fetch().blob() may not always return a usable
  // MIME type on every platform.
  const lower = uri.toLowerCase();
  const dotIdx = lower.lastIndexOf(".");
  const queryIdx = lower.indexOf("?", dotIdx);
  const ext = dotIdx >= 0
    ? lower.slice(dotIdx + 1, queryIdx >= 0 ? queryIdx : undefined)
    : "";
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new Error("Unsupported image format. Please choose a JPEG, PNG, or WEBP image.");
  }

  const response = await fetch(uri);
  const blob = await response.blob();
  const ts = Date.now();
  const imageRef = ref(storage, `requests/${requestId}/chat/${ts}.jpg`);
  const uploadTask = uploadBytesResumable(imageRef, blob, {
    contentType: "image/jpeg",
  });

  return new Promise<string>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null,
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}
