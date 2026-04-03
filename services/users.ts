import {
  collection,
  doc,
  setDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { User, UserRole } from "@/types";
import Constants from "expo-constants";

const USERS_COLLECTION = "users";
const extra = Constants.expoConfig?.extra ?? {};
const API_KEY = extra.FIREBASE_API_KEY as string;

/** Subscribe to real-time list of all maintainer users. Used for assignment UI. */
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

/** Subscribe to real-time list of users by role. */
export function subscribeToUsersByRole(
  role: UserRole,
  callback: (users: User[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, USERS_COLLECTION),
    where("role", "==", role),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map((d) => ({
        ...d.data(),
        uid: d.id,
      })) as User[];
      callback(users);
    },
    (error) => onError?.(error),
  );
}

/**
 * Create a staff user (maintainer or manager) via Firebase Auth REST API + Firestore.
 * Uses the REST API so the current manager session is NOT signed out.
 */
export async function createStaffUser(input: {
  email: string;
  password: string;
  name: string;
  role: "maintainer" | "manager";
  phone?: string;
}): Promise<User> {
  if (!API_KEY) {
    throw new Error("Firebase API key not configured");
  }

  // Create Auth account via REST API (does not affect current auth session)
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        returnSecureToken: false,
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json();
    const code = err?.error?.message ?? "Unknown error";
    if (code === "EMAIL_EXISTS") {
      throw new Error("An account with this email already exists");
    }
    throw new Error(`Failed to create account: ${code}`);
  }

  const data = await res.json();
  const uid = data.localId as string;

  // Write user profile to Firestore (manager has permission via updated rules)
  const user: User = {
    uid,
    email: input.email,
    name: input.name,
    role: input.role,
    ...(input.phone ? { phone: input.phone } : {}),
  };

  try {
    await setDoc(doc(db, USERS_COLLECTION, uid), user);
  } catch (error) {
    // Clean up orphaned Auth account if Firestore write fails
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localId: uid }),
      },
    ).catch(() => {});
    throw error;
  }
  return user;
}
