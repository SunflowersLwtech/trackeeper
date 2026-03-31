import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { User, UserRole } from "@/types";

export async function signIn(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signUp(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  unitNumber?: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user: User = {
    uid: credential.user.uid,
    email,
    name,
    role,
    unitNumber: unitNumber || undefined,
  };
  await setDoc(doc(db, "users", credential.user.uid), user);
  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as User;
}

export async function updateUserProfile(
  uid: string,
  fields: Partial<Pick<User, "name" | "unitNumber">>,
): Promise<void> {
  await setDoc(doc(db, "users", uid), fields, { merge: true });
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
