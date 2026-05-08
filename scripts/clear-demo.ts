/**
 * scripts/clear-demo.ts
 * --------------------------------------------------------------------------
 * Wipes all demo data created by `scripts/seed-demo.ts`. Reuses the same
 * detection rules:
 *   • requests with title starting with "[DEMO] "
 *   • users with email ending in @demo.trackeeper.local
 *
 * Required env vars (in `.env`):
 *     FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID,
 *     FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID
 *     SEED_MANAGER_EMAIL, SEED_MANAGER_PASSWORD
 *
 * Run via:  npm run seed:clear
 *
 * NOTE: Auth accounts in the Firebase Auth backing store cannot be deleted
 * from the Web SDK as a regular user — the Firestore profile docs are
 * marked "suspended" instead, and the Auth accounts simply remain dangling.
 * To fully purge, an admin can delete them manually from the Firebase
 * console (Authentication → Users).
 * --------------------------------------------------------------------------
 */
import "dotenv/config";

import { signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "./firebase-node";

const DEMO_TITLE_PREFIX = "[DEMO] ";
const DEMO_EMAIL_DOMAIN = "demo.trackeeper.local";

function fmt(label: string, value: number | string) {
  console.log(`  · ${label.padEnd(28, " ")} ${value}`);
}

function announce(section: string) {
  console.log("");
  console.log(`──── ${section} ${"─".repeat(Math.max(0, 60 - section.length))}`);
}

async function clearRequests(): Promise<{ requests: number; messages: number; notes: number }> {
  const snap = await getDocs(collection(db, "requests"));
  let requests = 0;
  let messages = 0;
  let notes = 0;
  for (const reqDoc of snap.docs) {
    const data = reqDoc.data();
    const title = (data.title as string | undefined) ?? "";
    const tenantId = (data.tenantId as string | undefined) ?? "";
    if (!title.startsWith(DEMO_TITLE_PREFIX) && !tenantId.startsWith("demo-")) {
      continue;
    }
    const messagesSnap = await getDocs(collection(db, "requests", reqDoc.id, "messages"));
    await Promise.all(
      messagesSnap.docs.map((m) => deleteDoc(doc(db, "requests", reqDoc.id, "messages", m.id))),
    );
    messages += messagesSnap.size;

    const notesSnap = await getDocs(collection(db, "requests", reqDoc.id, "notes"));
    await Promise.all(
      notesSnap.docs.map((n) => deleteDoc(doc(db, "requests", reqDoc.id, "notes", n.id))),
    );
    notes += notesSnap.size;

    await deleteDoc(doc(db, "requests", reqDoc.id));
    requests += 1;
  }
  return { requests, messages, notes };
}

async function clearUsers(): Promise<{ users: number; notifications: number }> {
  const snap = await getDocs(collection(db, "users"));
  let users = 0;
  let notifications = 0;
  for (const userDoc of snap.docs) {
    const data = userDoc.data();
    const email = (data.email as string | undefined) ?? "";
    if (!email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)) {
      continue;
    }
    const notifSnap = await getDocs(collection(db, "users", userDoc.id, "notifications"));
    await Promise.all(
      notifSnap.docs.map((n) =>
        deleteDoc(doc(db, "users", userDoc.id, "notifications", n.id)),
      ),
    );
    notifications += notifSnap.size;

    // Cannot deleteDoc on /users/{uid} — rules forbid it. Mark suspended
    // and keep moving so a fresh seed run has clean slate semantics.
    try {
      await setDoc(
        doc(db, "users", userDoc.id),
        {
          uid: userDoc.id,
          email,
          name: (data.name as string | undefined) ?? "Demo (cleared)",
          role: (data.role as string | undefined) ?? "tenant",
          status: "suspended",
        },
        { merge: true },
      );
      users += 1;
    } catch (err) {
      console.warn(`  ! could not clear demo user ${email}: ${(err as Error).message}`);
    }
  }
  return { users, notifications };
}

async function main(): Promise<void> {
  const managerEmail = process.env.SEED_MANAGER_EMAIL;
  const managerPassword = process.env.SEED_MANAGER_PASSWORD;
  if (!managerEmail || !managerPassword) {
    throw new Error(
      "SEED_MANAGER_EMAIL and SEED_MANAGER_PASSWORD must be set in .env to clear demo data.",
    );
  }

  console.log("TracKeeper demo cleaner");
  fmt("project", process.env.FIREBASE_PROJECT_ID ?? "(unknown)");
  fmt("manager", managerEmail);

  announce("Sign in as manager");
  await signInWithEmailAndPassword(auth, managerEmail, managerPassword);

  announce("Clear demo requests");
  const reqs = await clearRequests();
  fmt("requests deleted", reqs.requests);
  fmt("messages deleted", reqs.messages);
  fmt("notes deleted", reqs.notes);

  announce("Clear demo users (Firestore)");
  const usrs = await clearUsers();
  fmt("user docs suspended", usrs.users);
  fmt("notifications deleted", usrs.notifications);

  announce("Done");
  console.log(
    "Note: Firebase Auth accounts (@" +
      DEMO_EMAIL_DOMAIN +
      ") still exist. Delete them manually from the Firebase console if you want to fully purge.",
  );

  await firebaseSignOut(auth).catch(() => {});
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("");
    console.error("Cleaner failed:", err);
    process.exit(1);
  });
