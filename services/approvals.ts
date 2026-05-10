import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { User } from "@/types";
import { createNotification } from "@/services/notifications";
import { withoutUndefined } from "@/utils/firestorePayload";

const USERS_COLLECTION = "users";

/** Subscribe to all tenants currently in pending_approval status. */
export function subscribeToPendingTenants(
  callback: (users: User[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, USERS_COLLECTION),
    where("role", "==", "tenant"),
    where("status", "==", "pending_approval"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map((d) => ({ ...d.data(), uid: d.id })) as User[];
      callback(users);
    },
    (error) => onError?.(error),
  );
}

/** Approve a pending tenant. Records approver and timestamp, fires notification. */
export async function approveTenant(
  tenantUid: string,
  approverId: string,
  approverName: string,
): Promise<void> {
  const actorName = approverName || "your property administrator";
  await setDoc(
    doc(db, USERS_COLLECTION, tenantUid),
    withoutUndefined({
      status: "active",
      approvedAt: serverTimestamp(),
      approvedBy: approverId || undefined,
      approvedByName: approverName || undefined,
    }),
    { merge: true },
  );
  await createNotification(tenantUid, {
    kind: "tenant_approved",
    title: "Account approved",
    body: `Welcome to TracKeeper, your account has been approved by ${actorName}.`,
    ...(approverId ? { actorId: approverId } : {}),
    ...(approverName ? { actorName: approverName } : {}),
  }).catch(() => {});
}

/** Reject a pending tenant with optional reason. */
export async function rejectTenant(
  tenantUid: string,
  approverId: string,
  approverName: string,
  reason?: string,
): Promise<void> {
  await setDoc(
    doc(db, USERS_COLLECTION, tenantUid),
    withoutUndefined({
      status: "rejected",
      rejectedAt: serverTimestamp(),
      approvedBy: approverId || undefined,
      approvedByName: approverName || undefined,
      rejectionReason: reason ?? null,
    }),
    { merge: true },
  );
  await createNotification(tenantUid, {
    kind: "tenant_rejected",
    title: "Account not approved",
    body: reason
      ? `Your registration was rejected: ${reason}`
      : "Your registration was rejected. Please contact your property administrator.",
    ...(approverId ? { actorId: approverId } : {}),
    ...(approverName ? { actorName: approverName } : {}),
  }).catch(() => {});
}

/** Reverse a previous suspend/reject — reactivate a user. */
export async function reactivateUser(
  uid: string,
  approverId: string,
  approverName: string,
): Promise<void> {
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    withoutUndefined({
      status: "active",
      approvedAt: serverTimestamp(),
      approvedBy: approverId || undefined,
      approvedByName: approverName || undefined,
      rejectionReason: null,
    }),
    { merge: true },
  );
}

/** Suspend a previously active user. */
export async function suspendUser(
  uid: string,
  approverId: string,
  approverName: string,
  reason?: string,
): Promise<void> {
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    withoutUndefined({
      status: "suspended",
      approvedBy: approverId || undefined,
      approvedByName: approverName || undefined,
      rejectionReason: reason ?? null,
    }),
    { merge: true },
  );
}
