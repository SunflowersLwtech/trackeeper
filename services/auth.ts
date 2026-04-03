import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  deleteUser,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { User } from "@/types";

/** Sign in with email and password. Returns the Firebase user. */
export async function signIn(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Register a new tenant account. Creates Firebase Auth credentials and Firestore profile.
 * Cleans up the Auth account if Firestore write fails (e.g., rules rejection).
 * Only "tenant" role is allowed for public self-registration.
 */
export async function signUp(
  email: string,
  password: string,
  name: string,
  role: "tenant",
  unitNumber?: string,
): Promise<User> {
  // Public registration is tenant-only. Firestore rules enforce this server-side.
  // Manager/maintainer profiles must be provisioned via Cloud Functions or Admin SDK.
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user: User = {
    uid: credential.user.uid,
    email,
    name,
    role,
    unitNumber: unitNumber || undefined,
  };
  try {
    await setDoc(doc(db, "users", credential.user.uid), user);
  } catch (error) {
    // If Firestore rejects the profile (e.g., non-tenant role), clean up the Auth account
    await deleteUser(credential.user).catch(() => {});
    throw error;
  }
  return user;
}

/** Sign out the current user. */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/** Fetch user profile from Firestore. Returns null if not found. */
export async function getUserProfile(uid: string): Promise<User | null> {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as User;
}

/** Update user profile fields (name, unitNumber). Merge-writes to Firestore. */
export async function updateUserProfile(
  uid: string,
  fields: Partial<Pick<User, "name" | "unitNumber">>,
): Promise<void> {
  await setDoc(doc(db, "users", uid), fields, { merge: true });
}

/** Subscribe to Firebase auth state changes. Returns unsubscribe function. */
export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
