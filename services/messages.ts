import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { Message, MessageReplyTo } from "@/types";

const MESSAGES_LIMIT = 100;
const MAX_MESSAGE_LENGTH = 2000;

/** Industry-standard edit window (WhatsApp / iMessage = 15 min). */
export const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;

/** Allow-list of emoji reactions — limit keeps schema small. */
export const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;
export type AllowedReaction = (typeof ALLOWED_REACTIONS)[number];

/** Truncate the cached reply preview so we don't bloat docs. */
const REPLY_PREVIEW_MAX_CHARS = 80;

function getMessagesRef(requestId: string) {
  return collection(db, "requests", requestId, "messages");
}

function getMessageDoc(requestId: string, messageId: string) {
  return doc(db, "requests", requestId, "messages", messageId);
}

export interface SendMessageOptions {
  imageUrls?: string[];
  /** Optional reply target — must live in this same request thread. */
  replyTo?: MessageReplyTo;
}

/**
 * Send a chat message. Accepts either a single image (`imageUrl`) for legacy
 * call sites or an array of images (`imageUrls`). The new canonical field is
 * `imageUrls` — `imageUrl` is kept until existing screens are migrated.
 *
 * `options.replyTo` records a quoted preview of the original message — the
 * text is cached at send time so deletion of the original doesn't break the UI.
 */
export async function sendMessage(
  requestId: string,
  senderId: string,
  senderName: string,
  text: string,
  imageUrlOrUrls?: string | string[],
  options: SendMessageOptions = {},
): Promise<string> {
  const trimmed = text.trim();
  // Normalise to imageUrls array — accept both shapes (back-compat).
  const imageUrls = Array.isArray(imageUrlOrUrls)
    ? imageUrlOrUrls.filter((u) => typeof u === "string" && u.length > 0)
    : (imageUrlOrUrls ? [imageUrlOrUrls] : []);
  const optionsImageUrls = options.imageUrls ?? [];
  const finalImageUrls = optionsImageUrls.length > 0 ? optionsImageUrls : imageUrls;

  if (trimmed.length === 0 && finalImageUrls.length === 0) {
    throw new Error("Message cannot be empty");
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
  }
  // Firestore rule requires text.size() > 0 — fall back to a single-char placeholder
  // when the user is sending image(s) with no caption.
  const storedText = trimmed.length > 0 ? trimmed : "📷";

  const payload: Record<string, unknown> = {
    senderId,
    senderName,
    text: storedText,
    readBy: [senderId],
    createdAt: serverTimestamp(),
  };
  if (finalImageUrls.length > 0) payload.imageUrls = finalImageUrls;
  if (options.replyTo) {
    payload.replyTo = {
      messageId: options.replyTo.messageId,
      senderId: options.replyTo.senderId,
      textPreview: options.replyTo.textPreview.slice(0, REPLY_PREVIEW_MAX_CHARS),
      type: options.replyTo.type,
    };
  }

  const docRef = await addDoc(getMessagesRef(requestId), payload);
  return docRef.id;
}

/**
 * Build a `replyTo` payload from a source message — handles preview generation
 * and image fallback. Use from the UI when the user picks "Reply" on a message.
 */
export function buildReplyTo(source: Message): MessageReplyTo {
  const hasImage = (source.imageUrls && source.imageUrls.length > 0) || !!source.imageUrl;
  const preview = source.text === "📷" && hasImage ? "Photo" : source.text;
  return {
    messageId: source.id,
    senderId: source.senderId,
    textPreview: preview.slice(0, REPLY_PREVIEW_MAX_CHARS),
    type: hasImage && source.text === "📷" ? "image" : "text",
  };
}

/**
 * Edit an already-sent message. Only the original sender within the
 * MESSAGE_EDIT_WINDOW_MS is allowed by client logic — rules enforce too.
 * Sets `editedAt`. Reply/quote previews on other messages remain unchanged
 * by design (original content is preserved in the cached preview).
 */
export async function editMessage(
  requestId: string,
  messageId: string,
  userId: string,
  newText: string,
): Promise<void> {
  const trimmed = newText.trim();
  if (trimmed.length === 0) {
    throw new Error("Message cannot be empty");
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
  }
  const ref = getMessageDoc(requestId, messageId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Message not found");
  const data = snap.data() as Message;
  if (data.senderId !== userId) {
    throw new Error("You can only edit your own messages");
  }
  if (data.deletedAt) {
    throw new Error("Cannot edit a deleted message");
  }
  const createdMs = (data.createdAt as Timestamp | undefined)?.toMillis() ?? 0;
  if (createdMs > 0 && Date.now() - createdMs > MESSAGE_EDIT_WINDOW_MS) {
    throw new Error("Edit window has expired (15 minutes)");
  }
  await updateDoc(ref, {
    text: trimmed,
    editedAt: serverTimestamp(),
  });
}

/**
 * Soft-delete a message — flags `deletedAt` + `deletedBy` so the UI can show
 * "This message was deleted". Only the sender (or a manager, enforced at the
 * rules layer) may delete. Reactions and replyTo references survive so the
 * thread stays coherent.
 */
export async function softDeleteMessage(
  requestId: string,
  messageId: string,
  userId: string,
): Promise<void> {
  const ref = getMessageDoc(requestId, messageId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Message not found");
  const data = snap.data() as Message;
  if (data.deletedAt) return; // already deleted, idempotent
  await updateDoc(ref, {
    deletedAt: serverTimestamp(),
    deletedBy: userId,
    // Preserve original text for audit but UI should hide it via deletedAt flag.
  });
}

/**
 * Toggle a reaction emoji for a user. If the user has already reacted with
 * this emoji it is removed; otherwise it is added. Restricted to the 6
 * allow-listed emoji.
 */
export async function toggleReaction(
  requestId: string,
  messageId: string,
  userId: string,
  emoji: AllowedReaction,
): Promise<void> {
  if (!ALLOWED_REACTIONS.includes(emoji)) {
    throw new Error(`Reaction "${emoji}" is not allowed`);
  }
  const ref = getMessageDoc(requestId, messageId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Message not found");
  const data = snap.data() as Message;
  const reactions = data.reactions ?? {};
  const has = (reactions[emoji] ?? []).includes(userId);
  await updateDoc(ref, {
    [`reactions.${emoji}`]: has ? arrayRemove(userId) : arrayUnion(userId),
  });
}

/** Subscribe to real-time chat messages for a request (newest 100). */
export function subscribeToMessages(
  requestId: string,
  callback: (messages: Message[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    getMessagesRef(requestId),
    orderBy("createdAt", "desc"),
    limit(MESSAGES_LIMIT),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Message[];
      callback(messages);
    },
    (error) => onError?.(error),
  );
}

/** Append a single user to the readBy array of a single message. */
export async function markMessageRead(
  requestId: string,
  messageId: string,
  userId: string,
): Promise<void> {
  await updateDoc(getMessageDoc(requestId, messageId), {
    readBy: arrayUnion(userId),
  });
}

/** Batch mark all unread messages in a thread as read by userId. */
export async function markAllMessagesRead(
  requestId: string,
  messages: Message[],
  userId: string,
): Promise<void> {
  const unread = messages.filter(
    (m) => m.senderId !== userId && (!m.readBy || !m.readBy.includes(userId)),
  );
  if (unread.length === 0) return;
  const batch = writeBatch(db);
  for (const m of unread) {
    batch.update(getMessageDoc(requestId, m.id), { readBy: arrayUnion(userId) });
  }
  await batch.commit();
}
