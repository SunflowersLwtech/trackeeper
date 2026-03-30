import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { Message } from "@/types";

const MESSAGES_LIMIT = 50;

function getMessagesRef(requestId: string) {
  return collection(db, "requests", requestId, "messages");
}

export async function sendMessage(
  requestId: string,
  senderId: string,
  senderName: string,
  text: string,
): Promise<string> {
  const docRef = await addDoc(getMessagesRef(requestId), {
    senderId,
    senderName,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

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
