import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { User } from "@/types";

const USERS_COLLECTION = "users";

export function subscribeToMaintainers(
  callback: (maintainers: User[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, USERS_COLLECTION),
    where("role", "==", "maintainer"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const maintainers = snapshot.docs.map((d) => ({
        ...d.data(),
        uid: d.id,
      })) as User[];
      callback(maintainers);
    },
    (error) => onError?.(error),
  );
}
