import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { Note } from "@/types";

function getNotesRef(requestId: string) {
  return collection(db, "requests", requestId, "notes");
}

/** Add a private manager note to a request. */
export async function addNote(
  requestId: string,
  managerId: string,
  managerName: string,
  text: string,
): Promise<string> {
  const docRef = await addDoc(getNotesRef(requestId), {
    managerId,
    managerName,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Subscribe to real-time manager notes for a request. Manager-only. */
export function subscribeToNotes(
  requestId: string,
  callback: (notes: Note[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(getNotesRef(requestId), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const notes = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Note[];
      callback(notes);
    },
    (error) => onError?.(error),
  );
}
