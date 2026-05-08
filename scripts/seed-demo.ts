/**
 * scripts/seed-demo.ts
 * --------------------------------------------------------------------------
 * Wipes any pre-existing demo data and re-creates a rich, varied dataset
 * tailored for the FYP capstone demo (Dr. Wong audience).
 *
 * Run via:
 *     npm run seed:demo
 *
 * Required env vars (in `.env` at repo root):
 *     FIREBASE_API_KEY                  Firebase Web API key
 *     FIREBASE_AUTH_DOMAIN              <project>.firebaseapp.com
 *     FIREBASE_PROJECT_ID               <project>
 *     FIREBASE_STORAGE_BUCKET           <project>.appspot.com
 *     FIREBASE_MESSAGING_SENDER_ID      Sender ID
 *     FIREBASE_APP_ID                   App ID
 *     SEED_MANAGER_EMAIL                Existing manager account email
 *     SEED_MANAGER_PASSWORD             Manager password (used to sign in)
 *
 * Idempotency: re-running this script first deletes all docs whose title
 * begins with "[DEMO]" (best-effort) and any users with the demo email
 * prefix. Auth accounts in the Firebase project itself are *not* deleted —
 * Firebase Web SDK cannot delete arbitrary Auth users from a Node script.
 * The demo email addresses are namespaced so EMAIL_EXISTS errors are
 * caught and recovered by signing in instead of re-creating.
 * --------------------------------------------------------------------------
 */
import "dotenv/config";

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  addDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db, FIREBASE_API_KEY } from "./firebase-node";
import type {
  User,
  RequestStatus,
  RequestCategory,
  RequestPriority,
  StatusChange,
  RequestCost,
  RequestPayment,
} from "../types";

// ────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ────────────────────────────────────────────────────────────────────────

const DEMO_TITLE_PREFIX = "[DEMO] ";
const DEMO_EMAIL_DOMAIN = "demo.trackeeper.app";
const DEMO_PASSWORD = "Demo1234!";

interface DemoUserSpec {
  key: string;
  name: string;
  email: string;
  phone?: string;
  unitNumber?: string;
  role: "tenant" | "maintainer";
  status?: "pending_approval" | "active";
  hourlyRate?: number;
  specialties?: RequestCategory[];
}

const TENANTS: DemoUserSpec[] = [
  {
    key: "alice",
    name: "Alice Tan",
    email: `alice@${DEMO_EMAIL_DOMAIN}`,
    phone: "+60 12-345 6789",
    unitNumber: "Block A · Unit 7-12",
    role: "tenant",
    status: "active",
  },
  {
    key: "bob",
    name: "Bob Lim",
    email: `bob@${DEMO_EMAIL_DOMAIN}`,
    phone: "+60 13-987 4321",
    unitNumber: "Block B · Unit 14-03",
    role: "tenant",
    status: "active",
  },
  {
    key: "charlie",
    name: "Charlie Wong",
    email: `charlie@${DEMO_EMAIL_DOMAIN}`,
    phone: "+60 16-222 8090",
    unitNumber: "Block A · Unit 5-08",
    role: "tenant",
    status: "pending_approval",
  },
];

const MAINTAINERS: DemoUserSpec[] = [
  {
    key: "david",
    name: "David Tan",
    email: `david@${DEMO_EMAIL_DOMAIN}`,
    phone: "+60 11-998 5500",
    role: "maintainer",
    status: "active",
    hourlyRate: 80,
    specialties: ["Plumbing"],
  },
  {
    key: "emily",
    name: "Emily Lim",
    email: `emily@${DEMO_EMAIL_DOMAIN}`,
    phone: "+60 17-411 2030",
    role: "maintainer",
    status: "active",
    hourlyRate: 95,
    specialties: ["Electrical"],
  },
  {
    key: "farah",
    name: "Farah Aziz",
    email: `farah@${DEMO_EMAIL_DOMAIN}`,
    phone: "+60 19-660 7788",
    role: "maintainer",
    status: "active",
    hourlyRate: 70,
    specialties: ["General"],
  },
];

/** All demo email addresses — used for (best-effort) clean-up. */
const ALL_DEMO_EMAILS = new Set<string>([
  ...TENANTS.map((t) => t.email),
  ...MAINTAINERS.map((m) => m.email),
]);

const DEMO_PROPERTY_ID = "demo-skygarden-condo";

// Days-ago → Timestamp helper. `daysAgo` may be fractional.
function daysAgo(days: number, hourOffset = 0): Timestamp {
  const now = Date.now();
  const ms = now - days * 86_400_000 + hourOffset * 3_600_000;
  return Timestamp.fromMillis(ms);
}

function fmt(label: string, value: number | string) {
  console.log(`  · ${label.padEnd(28, " ")} ${value}`);
}

function announce(section: string) {
  console.log("");
  console.log(`──── ${section} ${"─".repeat(Math.max(0, 60 - section.length))}`);
}

// ────────────────────────────────────────────────────────────────────────
// Firebase Auth REST API — used to create accounts without flipping the
// current signed-in session (mirrors the pattern in services/users.ts).
// ────────────────────────────────────────────────────────────────────────

interface SignUpRestResult {
  uid: string;
  alreadyExists: boolean;
}

async function authRestSignUp(email: string, password: string): Promise<SignUpRestResult> {
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
  const errBody = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  const code = errBody.error?.message ?? "UNKNOWN";
  if (code === "EMAIL_EXISTS") {
    // Sign in to recover the uid for an account that already exists.
    const uid = await authRestSignInForUid(email, password);
    return { uid, alreadyExists: true };
  }
  throw new Error(`Auth signUp failed for ${email}: ${code}`);
}

async function authRestSignInForUid(email: string, password: string): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    },
  );
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      `Cannot recover uid for existing demo account ${email}: ${errBody.error?.message ?? "UNKNOWN"}. ` +
        `Either delete it from the Firebase console or change DEMO_PASSWORD in scripts/seed-demo.ts.`,
    );
  }
  const data = (await res.json()) as { localId: string };
  return data.localId;
}

// ────────────────────────────────────────────────────────────────────────
// Cleanup
// ────────────────────────────────────────────────────────────────────────

interface CleanupCounts {
  requestsDeleted: number;
  messagesDeleted: number;
  notesDeleted: number;
  notificationsDeleted: number;
  usersDeleted: number;
}

async function deleteDemoRequestsAndChildren(): Promise<{
  requestsDeleted: number;
  messagesDeleted: number;
  notesDeleted: number;
}> {
  const requestsCol = collection(db, "requests");
  const snap = await getDocs(requestsCol);

  let requestsDeleted = 0;
  let messagesDeleted = 0;
  let notesDeleted = 0;

  // We check the title client-side — Firestore can't do a "starts-with" filter
  // efficiently across the entire collection without an index.
  for (const reqDoc of snap.docs) {
    const data = reqDoc.data();
    const title = (data.title as string | undefined) ?? "";
    const tenantId = (data.tenantId as string | undefined) ?? "";
    if (!title.startsWith(DEMO_TITLE_PREFIX) && !tenantId.startsWith("demo-")) {
      continue;
    }

    // Delete subcollections (best effort — clients can't list arbitrary
    // subcollections, but messages & notes are the only known children).
    const messagesSnap = await getDocs(collection(db, "requests", reqDoc.id, "messages"));
    await Promise.all(
      messagesSnap.docs.map((m) =>
        deleteDoc(doc(db, "requests", reqDoc.id, "messages", m.id)),
      ),
    );
    messagesDeleted += messagesSnap.size;

    const notesSnap = await getDocs(collection(db, "requests", reqDoc.id, "notes"));
    await Promise.all(
      notesSnap.docs.map((n) => deleteDoc(doc(db, "requests", reqDoc.id, "notes", n.id))),
    );
    notesDeleted += notesSnap.size;

    await deleteDoc(doc(db, "requests", reqDoc.id));
    requestsDeleted += 1;
  }

  return { requestsDeleted, messagesDeleted, notesDeleted };
}

async function deleteDemoUsers(): Promise<{ usersDeleted: number; notificationsDeleted: number }> {
  const usersCol = collection(db, "users");
  const snap = await getDocs(usersCol);

  let usersDeleted = 0;
  let notificationsDeleted = 0;

  for (const userDoc of snap.docs) {
    const data = userDoc.data();
    const email = (data.email as string | undefined) ?? "";
    if (!email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)) {
      continue;
    }

    // Wipe the user's notifications subcollection first (best effort).
    const notifSnap = await getDocs(collection(db, "users", userDoc.id, "notifications"));
    await Promise.all(
      notifSnap.docs.map((n) =>
        deleteDoc(doc(db, "users", userDoc.id, "notifications", n.id)),
      ),
    );
    notificationsDeleted += notifSnap.size;

    // Firestore rules forbid deleting the user doc itself (`allow delete: if false`).
    // Best we can do from a client SDK is overwrite to mark them inactive — the rules
    // do permit a manager to flip status to "suspended". We attempt to clear them
    // out of the way; the seed script will then recreate or reuse them.
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
      usersDeleted += 1;
    } catch (err) {
      console.warn(`  ! could not clear demo user ${email}: ${(err as Error).message}`);
    }
  }

  return { usersDeleted, notificationsDeleted };
}

async function wipeOldDemoData(): Promise<CleanupCounts> {
  const reqs = await deleteDemoRequestsAndChildren();
  const usrs = await deleteDemoUsers();
  return { ...reqs, ...usrs };
}

// ────────────────────────────────────────────────────────────────────────
// User provisioning
// ────────────────────────────────────────────────────────────────────────

/** Resolved demo users keyed by their `key` field. */
type UserMap = Record<string, User>;

async function provisionUser(spec: DemoUserSpec, isTenant: boolean): Promise<User> {
  const { uid } = await authRestSignUp(spec.email, DEMO_PASSWORD);

  const profile: User = {
    uid,
    email: spec.email,
    name: spec.name,
    role: spec.role,
    status: spec.status ?? "active",
    ...(spec.phone ? { phone: spec.phone } : {}),
    ...(spec.unitNumber ? { unitNumber: spec.unitNumber } : {}),
    ...(isTenant ? { propertyId: DEMO_PROPERTY_ID } : {}),
    ...(spec.hourlyRate !== undefined ? { hourlyRate: spec.hourlyRate } : {}),
    ...(spec.specialties ? { specialties: spec.specialties } : {}),
  };

  // setDoc with merge so a re-run can adjust fields on a previously
  // suspended doc without violating the immutable-uid/email/role rule.
  await setDoc(
    doc(db, "users", uid),
    {
      ...profile,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  return profile;
}

async function provisionAllUsers(): Promise<{ tenants: UserMap; maintainers: UserMap }> {
  const tenants: UserMap = {};
  for (const spec of TENANTS) {
    const u = await provisionUser(spec, true);
    tenants[spec.key] = u;
    fmt(`tenant ${spec.name}`, `${u.uid.substring(0, 8)}… (${u.status})`);
  }
  const maintainers: UserMap = {};
  for (const spec of MAINTAINERS) {
    const u = await provisionUser(spec, false);
    maintainers[spec.key] = u;
    fmt(
      `maintainer ${spec.name}`,
      `${u.uid.substring(0, 8)}… RM${u.hourlyRate}/h ${u.specialties?.join(",")}`,
    );
  }
  return { tenants, maintainers };
}

// ────────────────────────────────────────────────────────────────────────
// Request specifications
// ────────────────────────────────────────────────────────────────────────

interface ChatLine {
  /** which actor sent the message: "tenant" | "maintainer" | "manager" */
  from: "tenant" | "maintainer" | "manager";
  text: string;
  /** days ago */
  daysAgo: number;
  /** uids of additional readers besides the sender — they get pushed into readBy */
  readByExtra?: ("tenant" | "maintainer" | "manager")[];
}

interface ManagerNoteLine {
  text: string;
  daysAgo: number;
}

interface RequestSpec {
  /** Stable id used only for logging — Firestore generates the real id. */
  id: string;
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  prioritySource?: "auto" | "manager" | "tenant";
  priorityReason?: string;
  imageUrl?: string;

  tenantKey: TenantKey;
  maintainerKey?: MaintainerKey;

  /** The status the request currently sits in. */
  finalStatus: RequestStatus;
  /** When the tenant filed it. */
  createdDaysAgo: number;
  /** Status timeline expressed as { status, daysAgo, note? }. */
  timeline: { to: RequestStatus; daysAgo: number; by: "tenant" | "maintainer" | "manager"; note?: string }[];
  /** Optional rating (only meaningful when finalStatus === "completed"). */
  rating?: number;
  ratingComment?: string;
  /** Optional cost & payment record — added in order on completed jobs. */
  cost?: { laborHours: number; hourlyRate: number; materialCost: number };
  /** "paid" | "unpaid" — if absent and `cost` set, defaults to "unpaid". */
  paymentStatus?: "paid" | "unpaid";
  paymentMethod?: "bank_transfer" | "cash" | "card";
  paymentDaysAgo?: number;
  chat: ChatLine[];
  managerNotes?: ManagerNoteLine[];
}

type TenantKey = "alice" | "bob" | "charlie";
type MaintainerKey = "david" | "emily" | "farah";

const REQUEST_SPECS: RequestSpec[] = [
  // ─── (a) Severe water leak — completed, 5★, paid ───
  {
    id: "a-water-leak",
    title: `${DEMO_TITLE_PREFIX}Severe water leak in master bathroom`,
    description:
      "Water leaking from the ceiling above the master bathroom shower — soaking the floor and dripping onto the corridor. Suspect a burst pipe. Need urgent attention before it damages the unit below (Block A 6-12).",
    category: "Plumbing",
    priority: "high",
    prioritySource: "auto",
    priorityReason: "Detected keywords: leak, burst, urgent",
    imageUrl: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800",
    tenantKey: "alice",
    maintainerKey: "david",
    finalStatus: "completed",
    createdDaysAgo: 12,
    timeline: [
      { to: "submitted", daysAgo: 12, by: "tenant" },
      { to: "assigned", daysAgo: 11.95, by: "manager" },
      { to: "in_progress", daysAgo: 11.7, by: "maintainer" },
      { to: "completed", daysAgo: 11.5, by: "maintainer" },
    ],
    rating: 5,
    ratingComment: "Fixed within hours, very professional",
    cost: { laborHours: 3, hourlyRate: 80, materialCost: 140 },
    paymentStatus: "paid",
    paymentMethod: "bank_transfer",
    paymentDaysAgo: 11,
    chat: [
      { from: "tenant", text: "It's getting worse — please send someone ASAP, it's already pooling on the floor!", daysAgo: 12 },
      { from: "manager", text: "Sending David Tan now, ETA 30 min. Please turn off the bathroom water main if you can.", daysAgo: 11.97, readByExtra: ["tenant"] },
      { from: "maintainer", text: "On the way. Bring me to the master bathroom when I arrive.", daysAgo: 11.85, readByExtra: ["tenant", "manager"] },
      { from: "maintainer", text: "Burst joint behind the shower wall — replaced the brass fitting and re-sealed. Hot test ran 10 min, no leak. All cleaned up.", daysAgo: 11.5, readByExtra: ["tenant", "manager"] },
      { from: "tenant", text: "Thank you so much! Already feels much better. Will rate now.", daysAgo: 11.4, readByExtra: ["maintainer", "manager"] },
    ],
    managerNotes: [
      { text: "Tenant Alice was very anxious — follow up next week to make sure no secondary damage to ceiling paint.", daysAgo: 11.4 },
    ],
  },

  // ─── (b) No power in entire unit — in_progress ───
  {
    id: "b-no-power",
    title: `${DEMO_TITLE_PREFIX}No power in entire unit`,
    description:
      "Whole unit lost power around 8pm — main breaker keeps tripping when I reset it. Other units in Block B are fine. Fridge contents at risk.",
    category: "Electrical",
    priority: "high",
    prioritySource: "auto",
    priorityReason: "Detected keywords: power, breaker — safety risk",
    tenantKey: "bob",
    maintainerKey: "emily",
    finalStatus: "in_progress",
    createdDaysAgo: 1.2,
    timeline: [
      { to: "submitted", daysAgo: 1.2, by: "tenant" },
      { to: "assigned", daysAgo: 1.15, by: "manager" },
      { to: "in_progress", daysAgo: 0.9, by: "maintainer" },
    ],
    chat: [
      { from: "tenant", text: "All lights out, breaker won't hold. Already moved frozen stuff to the neighbour's freezer.", daysAgo: 1.2 },
      { from: "manager", text: "Assigning Emily — she's licensed JKE Wireman. ETA 45 min.", daysAgo: 1.15, readByExtra: ["tenant"] },
      { from: "maintainer", text: "I'm at your door. Please show me to the DB box.", daysAgo: 0.95, readByExtra: ["tenant"] },
      { from: "maintainer", text: "Shorted RCBO on the kitchen ring. Need to swap the unit — picking it up from supplier now, back within 2 hours.", daysAgo: 0.5, readByExtra: ["tenant", "manager"] },
    ],
  },

  // ─── (c) AC not cooling — assigned ───
  {
    id: "c-ac-cooling",
    title: `${DEMO_TITLE_PREFIX}Air conditioner not cooling`,
    description:
      "Living room AC (Daikin split unit) blows warm air despite being on for 30 minutes. Filters were cleaned last month. Outdoor unit is running but not very cold.",
    category: "General",
    priority: "medium",
    tenantKey: "alice",
    maintainerKey: "farah",
    finalStatus: "assigned",
    createdDaysAgo: 0.8,
    timeline: [
      { to: "submitted", daysAgo: 0.8, by: "tenant" },
      { to: "assigned", daysAgo: 0.6, by: "manager" },
    ],
    chat: [
      { from: "tenant", text: "It just stopped cooling this morning. KL heat is unbearable!", daysAgo: 0.8 },
      { from: "manager", text: "Booked Farah for tomorrow 10am — she'll bring gas gauge and check the compressor.", daysAgo: 0.55, readByExtra: ["tenant"] },
      { from: "maintainer", text: "Confirmed 10am. Please clear the area around the indoor unit.", daysAgo: 0.5, readByExtra: ["tenant", "manager"] },
    ],
  },

  // ─── (d) Slow drain — submitted (unassigned) ───
  {
    id: "d-slow-drain",
    title: `${DEMO_TITLE_PREFIX}Slow drain in kitchen sink`,
    description:
      "Kitchen sink drains very slowly, takes about 5 minutes to empty after washing dishes. No bad smell yet. Tried hot water but didn't help much.",
    category: "Plumbing",
    priority: "low",
    tenantKey: "bob",
    finalStatus: "submitted",
    createdDaysAgo: 0.3,
    timeline: [{ to: "submitted", daysAgo: 0.3, by: "tenant" }],
    chat: [
      { from: "tenant", text: "Not urgent but please schedule when convenient. Probably just grease build-up.", daysAgo: 0.3 },
    ],
  },

  // ─── (e) Door lock jammed — completed, 4★ ───
  {
    id: "e-door-lock",
    title: `${DEMO_TITLE_PREFIX}Door lock jammed`,
    description:
      "Main door lock won't turn — key goes in but won't rotate. Got locked out for 30 minutes this morning before security helped me in. Need this fixed urgently for safety.",
    category: "General",
    priority: "high",
    prioritySource: "auto",
    priorityReason: "Detected keywords: lock, locked out — security concern",
    tenantKey: "alice",
    maintainerKey: "farah",
    finalStatus: "completed",
    createdDaysAgo: 22,
    timeline: [
      { to: "submitted", daysAgo: 22, by: "tenant" },
      { to: "assigned", daysAgo: 21.9, by: "manager" },
      { to: "in_progress", daysAgo: 21.6, by: "maintainer" },
      { to: "completed", daysAgo: 21.5, by: "maintainer" },
    ],
    rating: 4,
    ratingComment: "Quick fix, lock works smoothly now. Would have given 5★ if Farah called ahead.",
    cost: { laborHours: 1.5, hourlyRate: 70, materialCost: 70 },
    paymentStatus: "paid",
    paymentMethod: "cash",
    paymentDaysAgo: 21,
    chat: [
      { from: "tenant", text: "Please rush — I'm worried about getting locked out tonight!", daysAgo: 22 },
      { from: "maintainer", text: "Replaced the lock cylinder, lubed the mechanism. Tested 10x — works smoothly now.", daysAgo: 21.5, readByExtra: ["tenant", "manager"] },
      { from: "tenant", text: "Thank you Farah!", daysAgo: 21.4, readByExtra: ["maintainer"] },
    ],
  },

  // ─── (f) Flickering lights — on_hold ───
  {
    id: "f-flickering",
    title: `${DEMO_TITLE_PREFIX}Flickering lights in living room`,
    description:
      "Ceiling lights flicker every 15-20 seconds, especially when AC starts up. Started two days ago. Could be loose connection — concerned it's a fire risk.",
    category: "Electrical",
    priority: "medium",
    tenantKey: "bob",
    maintainerKey: "emily",
    finalStatus: "on_hold",
    createdDaysAgo: 5,
    timeline: [
      { to: "submitted", daysAgo: 5, by: "tenant" },
      { to: "assigned", daysAgo: 4.8, by: "manager" },
      { to: "in_progress", daysAgo: 4.3, by: "maintainer" },
      { to: "on_hold", daysAgo: 3.6, by: "maintainer", note: "Awaiting electrical parts (Schneider 32A breaker — supplier ETA Mon)." },
    ],
    chat: [
      { from: "tenant", text: "It's getting worse, especially in the evenings.", daysAgo: 5 },
      { from: "maintainer", text: "Diagnosed — neutral wire loose at the JB. Need a Schneider 32A breaker; supplier won't have it until Monday.", daysAgo: 3.6, readByExtra: ["tenant", "manager"] },
      { from: "manager", text: "Approved waiting. Tenant — please don't run heavy appliances in the meantime.", daysAgo: 3.5, readByExtra: ["tenant", "maintainer"] },
    ],
    managerNotes: [
      { text: "Reminder: chase Schneider supplier on Monday morning. ETA was confirmed via WhatsApp.", daysAgo: 3.4 },
    ],
  },

  // ─── (g) Toilet weak flush — completed, NOT yet rated, NOT yet paid ───
  {
    id: "g-toilet-flush",
    title: `${DEMO_TITLE_PREFIX}Toilet flushing weakly`,
    description:
      "Guest bathroom toilet flushes very weakly — water level looks normal but the flush doesn't clear properly. Have to flush twice or three times. Suspect partial blockage in the trap.",
    category: "Plumbing",
    priority: "medium",
    tenantKey: "alice",
    maintainerKey: "david",
    finalStatus: "completed",
    createdDaysAgo: 4,
    timeline: [
      { to: "submitted", daysAgo: 4, by: "tenant" },
      { to: "assigned", daysAgo: 3.8, by: "manager" },
      { to: "in_progress", daysAgo: 3.3, by: "maintainer" },
      { to: "completed", daysAgo: 3, by: "maintainer" },
    ],
    cost: { laborHours: 2, hourlyRate: 80, materialCost: 60 },
    paymentStatus: "unpaid",
    chat: [
      { from: "tenant", text: "Annoying — sometimes have to flush 3 times.", daysAgo: 4 },
      { from: "maintainer", text: "Cleared a wad of wet wipes from the trap. Flush is back to full power. Please remind household — only toilet paper down the bowl!", daysAgo: 3, readByExtra: ["tenant", "manager"] },
      { from: "manager", text: "Cost recorded RM 220. Tenant please rate when convenient.", daysAgo: 2.9, readByExtra: ["tenant"] },
    ],
  },

  // ─── (h) Cabinet door fell off — cancelled ───
  {
    id: "h-cabinet",
    title: `${DEMO_TITLE_PREFIX}Cabinet door fell off`,
    description:
      "Lower kitchen cabinet door (the one under the sink) fell off — looks like the hinge screws stripped out. Honestly I'll just live with it for now.",
    category: "General",
    priority: "low",
    tenantKey: "bob",
    finalStatus: "cancelled",
    createdDaysAgo: 9,
    timeline: [
      { to: "submitted", daysAgo: 9, by: "tenant" },
      { to: "cancelled", daysAgo: 8.7, by: "tenant" },
    ],
    chat: [
      { from: "tenant", text: "Actually never mind, I'll fix it myself this weekend. Cancelling.", daysAgo: 8.7 },
    ],
  },

  // ─── (i) Burnt outlet smell — completed, 5★, paid ───
  {
    id: "i-burnt-outlet",
    title: `${DEMO_TITLE_PREFIX}Burnt outlet smell`,
    description:
      "Smelled something burning near the bedroom power outlet — when I checked, the outlet was warm to touch and slightly discoloured. Unplugged everything immediately. URGENT — I'm scared this could start a fire.",
    category: "Electrical",
    priority: "high",
    prioritySource: "auto",
    priorityReason: "Detected keywords: burnt, smell, fire — critical safety",
    tenantKey: "alice",
    maintainerKey: "emily",
    finalStatus: "completed",
    createdDaysAgo: 18,
    timeline: [
      { to: "submitted", daysAgo: 18, by: "tenant" },
      { to: "assigned", daysAgo: 17.97, by: "manager" },
      { to: "in_progress", daysAgo: 17.85, by: "maintainer" },
      { to: "completed", daysAgo: 17.7, by: "maintainer" },
    ],
    rating: 5,
    ratingComment: "Quick response prevented fire risk!",
    cost: { laborHours: 2, hourlyRate: 95, materialCost: 60 },
    paymentStatus: "paid",
    paymentMethod: "bank_transfer",
    paymentDaysAgo: 17,
    chat: [
      { from: "tenant", text: "I can smell burning plastic — coming to check NOW please!", daysAgo: 18 },
      { from: "manager", text: "Emily dispatched immediately, ETA 20 min. Please keep that outlet unplugged and do NOT switch on the breaker for that circuit.", daysAgo: 17.97, readByExtra: ["tenant"] },
      { from: "maintainer", text: "Outlet was carbonised — receptacle melted. Replaced the receptacle and tested with thermal camera, no further hot spots. Strongly suggest tenant replace any extension cords plugged in.", daysAgo: 17.7, readByExtra: ["tenant", "manager"] },
      { from: "tenant", text: "Thank you Emily! You probably saved my unit from a fire. ★★★★★", daysAgo: 17.5, readByExtra: ["maintainer", "manager"] },
    ],
  },

  // ─── (j) Garbage disposal noise — completed, 3★ ───
  {
    id: "j-disposal",
    title: `${DEMO_TITLE_PREFIX}Garbage disposal noise`,
    description:
      "Kitchen garbage disposal makes loud rattling noise when I switch it on — but still grinds. Could be something stuck. Smells a bit too.",
    category: "Plumbing",
    priority: "low",
    tenantKey: "bob",
    maintainerKey: "david",
    finalStatus: "completed",
    createdDaysAgo: 27,
    timeline: [
      { to: "submitted", daysAgo: 27, by: "tenant" },
      { to: "assigned", daysAgo: 26.5, by: "manager" },
      { to: "in_progress", daysAgo: 24, by: "maintainer" },
      { to: "completed", daysAgo: 23.5, by: "maintainer" },
    ],
    rating: 3,
    ratingComment: "Took longer than expected, but it works now.",
    cost: { laborHours: 1, hourlyRate: 80, materialCost: 70 },
    paymentStatus: "paid",
    paymentMethod: "bank_transfer",
    paymentDaysAgo: 23,
    chat: [
      { from: "tenant", text: "Sounds like there's a coin or something stuck in there.", daysAgo: 27 },
      { from: "manager", text: "Sorry for the delay — David was on another job. Confirmed for Friday.", daysAgo: 25, readByExtra: ["tenant"] },
      { from: "maintainer", text: "Removed a metal bottle cap and a peach pit. Cleaned and sanitised. All good.", daysAgo: 23.5, readByExtra: ["tenant", "manager"] },
    ],
  },

  // ─── (k) Hot water inconsistent — in_progress ───
  {
    id: "k-hot-water",
    title: `${DEMO_TITLE_PREFIX}Hot water inconsistent`,
    description:
      "Bathroom hot water comes and goes — fine for 2 minutes, then turns cold for 30 seconds, then hot again. Storage heater (Joven 30L) — could be the thermostat or heating element giving up.",
    category: "Plumbing",
    priority: "medium",
    tenantKey: "alice",
    maintainerKey: "david",
    finalStatus: "in_progress",
    createdDaysAgo: 2.5,
    timeline: [
      { to: "submitted", daysAgo: 2.5, by: "tenant" },
      { to: "assigned", daysAgo: 2.3, by: "manager" },
      { to: "in_progress", daysAgo: 0.8, by: "maintainer" },
    ],
    chat: [
      { from: "tenant", text: "Cold showers in KL aren't actually that bad, but still…", daysAgo: 2.5 },
      { from: "maintainer", text: "Suspect heating element. Will test with multimeter and quote replacement.", daysAgo: 0.7, readByExtra: ["tenant", "manager"] },
    ],
  },

  // ─── (l) Window won't close — assigned ───
  {
    id: "l-window",
    title: `${DEMO_TITLE_PREFIX}Window won't close fully`,
    description:
      "Living room sliding window has a 2cm gap when 'closed' — looks like the track is bent. Mosquitoes coming in at night. Block B side facing the river.",
    category: "General",
    priority: "medium",
    tenantKey: "bob",
    maintainerKey: "farah",
    finalStatus: "assigned",
    createdDaysAgo: 1.8,
    timeline: [
      { to: "submitted", daysAgo: 1.8, by: "tenant" },
      { to: "assigned", daysAgo: 1.4, by: "manager" },
    ],
    chat: [
      { from: "tenant", text: "Mosquitoes are eating me alive at night.", daysAgo: 1.8 },
      { from: "manager", text: "Booked Farah for Saturday morning, she'll bring spare track sections.", daysAgo: 1.3, readByExtra: ["tenant"] },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────
// Request creation
// ────────────────────────────────────────────────────────────────────────

interface SeedContext {
  managerUid: string;
  managerName: string;
  tenants: UserMap;
  maintainers: UserMap;
}

function uidForActor(
  actor: "tenant" | "maintainer" | "manager",
  spec: RequestSpec,
  ctx: SeedContext,
): { uid: string; name: string; phone?: string } {
  if (actor === "manager") {
    return { uid: ctx.managerUid, name: ctx.managerName };
  }
  if (actor === "tenant") {
    const t = ctx.tenants[spec.tenantKey];
    return { uid: t.uid, name: t.name, phone: t.phone };
  }
  // maintainer
  if (!spec.maintainerKey) {
    throw new Error(`Request ${spec.id} chat has a maintainer line but no maintainerKey`);
  }
  const m = ctx.maintainers[spec.maintainerKey];
  return { uid: m.uid, name: m.name, phone: m.phone };
}

function buildStatusHistory(spec: RequestSpec, ctx: SeedContext): StatusChange[] {
  const history: StatusChange[] = [];
  let prev: RequestStatus = "submitted";
  // The very first entry is the "(submitted)" event itself which we still
  // log so the timeline is visible — but it has no `from` predecessor.
  // The current app expects `from` to be a real status, so for the first
  // entry we use "submitted" → "submitted" as a sentinel. The detail screen
  // simply skips entries where from === to.
  for (const step of spec.timeline) {
    const actor = uidForActor(step.by, spec, ctx);
    if (step.to === "submitted") {
      history.push({
        from: "submitted",
        to: "submitted",
        changedBy: actor.uid,
        changedByName: actor.name,
        changedAt: daysAgo(step.daysAgo),
      });
      prev = "submitted";
      continue;
    }
    history.push({
      from: prev,
      to: step.to,
      changedBy: actor.uid,
      changedByName: actor.name,
      changedAt: daysAgo(step.daysAgo),
      ...(step.note ? { note: step.note } : {}),
    });
    prev = step.to;
  }
  return history;
}

async function seedOneRequest(spec: RequestSpec, ctx: SeedContext): Promise<{ id: string; messageCount: number; noteCount: number }> {
  const tenant = ctx.tenants[spec.tenantKey];
  const maintainer = spec.maintainerKey ? ctx.maintainers[spec.maintainerKey] : undefined;

  const statusHistory = buildStatusHistory(spec, ctx);
  const finalStep = spec.timeline[spec.timeline.length - 1];

  // Base doc fields. We deliberately use a real Timestamp for `createdAt`
  // (rather than serverTimestamp) so the manager dashboard ordering matches
  // the historical date in the timeline.
  const docPayload: Record<string, unknown> = {
    title: spec.title,
    description: spec.description,
    category: spec.category,
    priority: spec.priority,
    status: spec.finalStatus,
    tenantId: tenant.uid,
    tenantName: tenant.name,
    statusHistory,
    createdAt: daysAgo(spec.createdDaysAgo),
    clientTimestamp: Date.now() - spec.createdDaysAgo * 86_400_000,
  };
  if (tenant.unitNumber) docPayload.tenantUnit = tenant.unitNumber;

  if (spec.imageUrl) docPayload.imageUrl = spec.imageUrl;
  else docPayload.imageUrl = null;

  if (spec.prioritySource) {
    docPayload.prioritySuggestion = {
      priority: spec.priority,
      reason: spec.priorityReason ?? "Auto-suggested by keyword analysis",
      source: spec.prioritySource,
    };
  }

  if (maintainer) {
    docPayload.assignedTo = maintainer.uid;
    docPayload.assignedToName = maintainer.name;
    if (maintainer.phone) docPayload.assignedToPhone = maintainer.phone;
    docPayload.estimatedArrival = "Within 24h";
  }

  if (spec.finalStatus === "completed") {
    docPayload.resolvedAt = daysAgo(finalStep.daysAgo);
  }

  if (spec.rating !== undefined) {
    docPayload.rating = spec.rating;
    if (spec.ratingComment) docPayload.ratingComment = spec.ratingComment;
  }

  if (spec.cost) {
    const total =
      Math.round(
        (Math.max(0, spec.cost.laborHours) * Math.max(0, spec.cost.hourlyRate) +
          Math.max(0, spec.cost.materialCost)) *
          100,
      ) / 100;
    const cost: RequestCost = {
      laborHours: spec.cost.laborHours,
      hourlyRate: spec.cost.hourlyRate,
      materialCost: spec.cost.materialCost,
      total,
      setBy: ctx.managerUid,
      setByName: ctx.managerName,
      setAt: daysAgo(finalStep.daysAgo - 0.05),
    };
    docPayload.cost = cost;

    if (spec.paymentStatus === "paid" && maintainer) {
      const payment: RequestPayment = {
        status: "paid",
        method: spec.paymentMethod ?? "bank_transfer",
        amount: total,
        paidAt: daysAgo(spec.paymentDaysAgo ?? finalStep.daysAgo - 0.5),
        paidBy: ctx.managerUid,
        paidByName: ctx.managerName,
        paidTo: maintainer.uid,
        paidToName: maintainer.name,
        reference: `TKP-DEMO-${spec.id.toUpperCase()}`,
      };
      docPayload.payment = payment;
    } else {
      const payment: RequestPayment = { status: "unpaid", amount: total };
      docPayload.payment = payment;
    }
  }

  // Create the request. We use addDoc so Firestore generates the id.
  const docRef = await addDoc(collection(db, "requests"), docPayload);

  // ─── Messages ───
  let messageCount = 0;
  for (const line of spec.chat) {
    const sender = uidForActor(line.from, spec, ctx);
    const readBy = new Set<string>([sender.uid]);
    for (const extraActor of line.readByExtra ?? []) {
      const r = uidForActor(extraActor, spec, ctx);
      readBy.add(r.uid);
    }
    await addDoc(collection(db, "requests", docRef.id, "messages"), {
      senderId: sender.uid,
      senderName: sender.name,
      text: line.text,
      readBy: Array.from(readBy),
      createdAt: daysAgo(line.daysAgo),
    });
    messageCount += 1;
  }

  // ─── Manager notes (private) ───
  let noteCount = 0;
  if (spec.managerNotes) {
    for (const note of spec.managerNotes) {
      await addDoc(collection(db, "requests", docRef.id, "notes"), {
        managerId: ctx.managerUid,
        managerName: ctx.managerName,
        text: note.text,
        createdAt: daysAgo(note.daysAgo),
      });
      noteCount += 1;
    }
  }

  return { id: docRef.id, messageCount, noteCount };
}

// ────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const managerEmail = process.env.SEED_MANAGER_EMAIL;
  const managerPassword = process.env.SEED_MANAGER_PASSWORD;
  if (!managerEmail || !managerPassword) {
    throw new Error(
      "SEED_MANAGER_EMAIL and SEED_MANAGER_PASSWORD must be set in .env. " +
        "These should be the credentials of an EXISTING manager account in your Firestore /users collection.",
    );
  }

  console.log(`TracKeeper demo seeder`);
  fmt("project", process.env.FIREBASE_PROJECT_ID ?? "(unknown)");
  fmt("manager", managerEmail);
  fmt("demo email domain", DEMO_EMAIL_DOMAIN);

  announce("Sign in as manager");
  const credential = await signInWithEmailAndPassword(auth, managerEmail, managerPassword);
  const managerUid = credential.user.uid;

  // Fetch the manager profile to grab the display name.
  const usersSnap = await getDocs(
    query(collection(db, "users"), where("__name__", "==", managerUid)),
  );
  if (usersSnap.empty) {
    throw new Error(
      `Signed in as ${managerEmail} (uid ${managerUid}) but there is no /users/${managerUid} doc. ` +
        `Make sure this account is provisioned as a manager.`,
    );
  }
  const managerProfile = usersSnap.docs[0].data() as User;
  if (managerProfile.role !== "manager") {
    throw new Error(
      `Account ${managerEmail} has role "${managerProfile.role}" — must be "manager" to run the seeder.`,
    );
  }
  const managerName = managerProfile.name || "Demo Manager";
  fmt("manager uid", managerUid);
  fmt("manager name", managerName);

  announce("Wipe old demo data");
  let cleanup: CleanupCounts = {
    requestsDeleted: 0,
    messagesDeleted: 0,
    notesDeleted: 0,
    usersDeleted: 0,
    notificationsDeleted: 0,
  };
  if (process.env.SEED_SKIP_WIPE !== "1") {
    try {
      cleanup = await wipeOldDemoData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ⚠ wipe skipped (${msg})`);
    }
  } else {
    console.log("  · skipped (SEED_SKIP_WIPE=1)");
  }
  fmt("requests deleted", cleanup.requestsDeleted);
  fmt("messages deleted", cleanup.messagesDeleted);
  fmt("notes deleted", cleanup.notesDeleted);
  fmt("user docs cleared", cleanup.usersDeleted);
  fmt("notifications deleted", cleanup.notificationsDeleted);

  announce("Provision demo users (3 tenants, 3 maintainers)");
  const { tenants, maintainers } = await provisionAllUsers();

  announce(`Seed ${REQUEST_SPECS.length} maintenance requests`);
  const ctx: SeedContext = { managerUid, managerName, tenants, maintainers };

  let totalMessages = 0;
  let totalNotes = 0;
  for (const spec of REQUEST_SPECS) {
    const { id, messageCount, noteCount } = await seedOneRequest(spec, ctx);
    totalMessages += messageCount;
    totalNotes += noteCount;
    fmt(
      `${spec.id}`,
      `${spec.finalStatus.padEnd(11, " ")} ${spec.priority.padEnd(6, " ")} ${
        spec.category.padEnd(10, " ")
      } → ${id}  (${messageCount} chat, ${noteCount} note)`,
    );
  }

  announce("Summary");
  fmt("tenants", Object.keys(tenants).length);
  fmt("maintainers", Object.keys(maintainers).length);
  fmt("requests created", REQUEST_SPECS.length);
  fmt("messages created", totalMessages);
  fmt("manager notes created", totalNotes);
  console.log("");
  console.log(`Demo password for every demo user: "${DEMO_PASSWORD}"`);
  console.log(`Demo emails:`);
  for (const email of Array.from(ALL_DEMO_EMAILS).sort()) {
    console.log(`  · ${email}`);
  }
  console.log("");
  console.log("Done. You can now demo TracKeeper.");

  // Tidy up — sign out so the script process exits cleanly.
  await firebaseSignOut(auth).catch(() => {});
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("");
    console.error("Seeder failed:", err);
    process.exit(1);
  });
