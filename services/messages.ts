import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  writeBatch,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { Message } from "@/types";

const MESSAGES_LIMIT = 100;
const MAX_MESSAGE_LENGTH = 2000;

function getMessagesRef(requestId: string) {
  return collection(db, "requests", requestId, "messages");
}

function getMessageDoc(requestId: string, messageId: string) {
  return doc(db, "requests", requestId, "messages", messageId);
}

/** Send a chat message. Initialises readBy with the sender so they don't notify themselves. */
export async function sendMessage(
  requestId: string,
  senderId: string,
  senderName: string,
  text: string,
  imageUrl?: string,
): Promise<string> {
  const trimmed = text.trim();
  if (trimmed.length === 0 && !imageUrl) {
    throw new Error("Message cannot be empty");
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
  }
  // Firestore rule requires text.size() > 0 — fall back to a single-char placeholder
  // when the user is sending an image with no caption.
  const storedText = trimmed.length > 0 ? trimmed : "📷";
  const docRef = await addDoc(getMessagesRef(requestId), {
    senderId,
    senderName,
    text: storedText,
    readBy: [senderId],
    createdAt: serverTimestamp(),
    ...(imageUrl ? { imageUrl } : {}),
  });
  return docRef.id;
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
