/**
 * scripts/bootstrap-demo.ts
 * --------------------------------------------------------------------------
 * One-shot bootstrap to create three primary demo accounts on Firebase:
 *   alice@demo.trackeeper.app   (tenant, active)
 *   manager@demo.trackeeper.app (manager, active)
 *   david@demo.trackeeper.app   (maintainer, active)
 *
 * Used together with `firestore.rules.bootstrap` (permissive). After this
 * script finishes, run `firebase deploy --only firestore:rules` to restore
 * the strict rules.
 *
 * Idempotent — re-running just refreshes profiles for existing accounts.
 *
 * Usage:
 *   firebase deploy --only firestore:rules --rules firestore.rules.bootstrap
 *   npx ts-node --transpile-only scripts/bootstrap-demo.ts
 *   firebase deploy --only firestore:rules
 * --------------------------------------------------------------------------
 */
import "dotenv/config";

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth, db, FIREBASE_API_KEY } from "./firebase-node";

const DEMO_PASSWORD = "Demo1234!";

interface Spec {
  email: string;
  name: string;
  role: "tenant" | "manager" | "maintainer";
  hourlyRate?: number;
  specialties?: string[];
  unitNumber?: string;
  phone?: string;
}

const ACCOUNTS: Spec[] = [
  {
    email: "manager@demo.trackeeper.app",
    name: "Manager Demo",
    role: "manager",
  },
  {
    email: "alice@demo.trackeeper.app",
    name: "Alice Tan",
    role: "tenant",
    unitNumber: "Block A · Unit 7-12",
    phone: "+60 12-345 6789",
  },
  {
    email: "david@demo.trackeeper.app",
    name: "David Tan",
    role: "maintainer",
    hourlyRate: 80,
    specialties: ["Plumbing"],
    phone: "+60 11-998 5500",
  },
];

interface SignUpResult {
  uid: string;
  alreadyExists: boolean;
}

async function authRestSignUp(email: string, password: string): Promise<SignUpResult> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    },
  );
  if (res.ok) {
    const data = (await res.json()) as { localId: string };
    return { uid: data.localId, alreadyExists: false };
  }
  const errBody = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  const code = errBody.error?.message ?? "UNKNOWN";
  if (code === "EMAIL_EXISTS") {
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: false }),
      },
    );
    if (!signInRes.ok) {
      const e = (await signInRes.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(`Cannot recover existing ${email}: ${e.error?.message}`);
    }
    const data = (await signInRes.json()) as { localId: string };
    return { uid: data.localId, alreadyExists: true };
  }
  throw new Error(`signUp failed for ${email}: ${code}`);
}

async function writeProfile(uid: string, spec: Spec): Promise<void> {
  // Sign in as this user so the client SDK has the right auth context.
  await signInWithEmailAndPassword(auth, spec.email, DEMO_PASSWORD);

  const profile: Record<string, unknown> = {
    uid,
    email: spec.email,
    name: spec.name,
    role: spec.role,
    status: "active",
    createdAt: serverTimestamp(),
  };
  if (spec.phone) profile.phone = spec.phone;
  if (spec.unitNumber) profile.unitNumber = spec.unitNumber;
  if (spec.hourlyRate != null) profile.hourlyRate = spec.hourlyRate;
  if (spec.specialties) profile.specialties = spec.specialties;

  await setDoc(doc(db, "users", uid), profile);
  await firebaseSignOut(auth);
}

async function main(): Promise<void> {
  console.log("──── Bootstrap demo accounts ────");
  console.log("");
  console.log("⚠  Requires firestore.rules.bootstrap deployed first (permissive).");
  console.log("");

  for (const spec of ACCOUNTS) {
    const result = await authRestSignUp(spec.email, DEMO_PASSWORD);
    console.log(
      `  · ${spec.email.padEnd(40)} role=${spec.role.padEnd(12)} ${result.alreadyExists ? "↻ existed" : "+ created"} uid=${result.uid}`,
    );
    await writeProfile(result.uid, spec);
  }

  console.log("");
  console.log("✔ Bootstrap complete.");
  console.log("");
  console.log("Now redeploy strict rules:");
  console.log("  firebase deploy --only firestore:rules");
}

main().catch((err) => {
  console.error("");
  console.error("✖ Bootstrap failed:", err.message ?? err);
  process.exit(1);
});
