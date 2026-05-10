import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  deleteUser,
  sendPasswordResetEmail,
  sendEmailVerification,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { User } from "@/types";
import { friendlyErrorMessage } from "@/utils/errorMessages";
import { withoutUndefined } from "@/utils/firestorePayload";

export class TenantAccountInactiveError extends Error {
  status: "pending_approval" | "suspended" | "rejected";
  rejectionReason?: string;
  constructor(
    status: "pending_approval" | "suspended" | "rejected",
    rejectionReason?: string,
  ) {
    super(
      status === "pending_approval"
        ? "Your account is pending manager approval."
        : status === "suspended"
          ? "Your account has been suspended."
          : "Your registration was rejected.",
    );
    this.status = status;
    this.rejectionReason = rejectionReason;
  }
}

/** Sign in with email and password. Throws TenantAccountInactiveError if account is not active. */
export async function signIn(email: string, password: string): Promise<FirebaseUser> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    // Lookup profile to enforce status gate
    const profile = await getUserProfile(credential.user.uid);
    if (profile && profile.status && profile.status !== "active") {
      // Sign out so the AuthContext does not consider this user logged in
      await firebaseSignOut(auth).catch(() => {});
      throw new TenantAccountInactiveError(profile.status, profile.rejectionReason);
    }
    return credential.user;
  } catch (error) {
    if (error instanceof TenantAccountInactiveError) throw error;
    await firebaseSignOut(auth).catch(() => {});
    throw new Error(friendlyErrorMessage(error, "Unable to sign in. Try again."));
  }
}

/**
 * Register a new tenant account. Tenants start in pending_approval state and
 * cannot create requests until a manager approves them.
 */
export async function signUp(
  email: string,
  password: string,
  name: string,
  role: "tenant",
  unitNumber?: string,
  phone?: string,
): Promise<User> {
  let credential: Awaited<ReturnType<typeof createUserWithEmailAndPassword>>;
  try {
    credential = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error, "Registration failed. Try again."));
  }
  const user: User = {
    uid: credential.user.uid,
    email,
    name,
    role,
    status: "pending_approval",
    ...(unitNumber ? { unitNumber } : {}),
    ...(phone ? { phone } : {}),
  };
  try {
    await setDoc(doc(db, "users", credential.user.uid), withoutUndefined({
      ...user,
      createdAt: serverTimestamp(),
    }));
  } catch (error) {
    await deleteUser(credential.user).catch(() => {});
    throw new Error(friendlyErrorMessage(error, "Account was created, but profile setup failed. Try again."));
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

/** Update user profile fields (name, unitNumber, phone, hourlyRate). Merge-writes to Firestore. */
export async function updateUserProfile(
  uid: string,
  fields: Partial<Pick<User, "name" | "unitNumber" | "phone" | "hourlyRate" | "specialties">>,
): Promise<void> {
  await setDoc(doc(db, "users", uid), withoutUndefined(fields), { merge: true });
}

/** Subscribe to Firebase auth state changes. Returns unsubscribe function. */
export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Send a password-reset email. Resolves silently for both existing and
 * non-existing emails so callers cannot use this to enumerate accounts.
 * Errors other than user-not-found are re-thrown for the UI to surface.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code ?? "";
    // Treat "no such user" as success so we don't leak account existence.
    if (code === "auth/user-not-found" || code === "auth/invalid-email") {
      return;
    }
    throw new Error(friendlyErrorMessage(error, "Could not send reset email. Try again."));
  }
}

/**
 * Send the currently signed-in user a verification email. No-op if the user is
 * already verified, throws if no user is signed in.
 */
export async function sendCurrentUserEmailVerification(): Promise<boolean> {
  const current = auth.currentUser;
  if (!current) {
    throw new Error("Not signed in");
  }
  if (current.emailVerified) {
    return false;
  }
  try {
    await sendEmailVerification(current);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error, "Could not send verification email. Try again."));
  }
  return true;
}
