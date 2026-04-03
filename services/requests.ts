import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "@/config/firebase";
import { MaintenanceRequest, RequestStatus, RequestCategory, RequestPriority, UserRole } from "@/types";
import { canCancel, canTransitionWithRole } from "@/utils/status";

const REQUESTS_COLLECTION = "requests";

export interface CreateRequestInput {
  title: string;
  description: string;
  category: RequestCategory;
  priority?: RequestPriority;
  tenantId: string;
  tenantName: string;
  imageUri?: string;
}

/** Upload a request image to Firebase Storage. Returns the download URL. */
async function uploadRequestImage(uri: string, requestId: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const imageRef = ref(storage, `requests/${requestId}/${Date.now()}.jpg`);
  const uploadTask = uploadBytesResumable(imageRef, blob);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null,
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      },
    );
  });
}

/** Create a new maintenance request. Image upload failures are handled gracefully. */
export async function createRequest(input: CreateRequestInput): Promise<string> {
  const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), {
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority ?? "medium",
    status: "submitted" as RequestStatus,
    tenantId: input.tenantId,
    tenantName: input.tenantName,
    imageUrl: null,
    statusHistory: [],
    createdAt: serverTimestamp(),
    clientTimestamp: Date.now(),
  });

  if (input.imageUri) {
    try {
      const imageUrl = await uploadRequestImage(input.imageUri, docRef.id);
      await updateDoc(doc(db, REQUESTS_COLLECTION, docRef.id), { imageUrl });
    } catch {
      // Request created successfully but image upload failed.
      // The request is still valid without an image — return the ID
      // so the user can see it and optionally re-upload later.
      console.warn(`[createRequest] Image upload failed for request ${docRef.id}, continuing without image`);
    }
  }

  return docRef.id;
}

/** Update request status with role-based transition validation. Throws on invalid transition. */
export async function updateRequestStatus(
  requestId: string,
  currentStatus: RequestStatus,
  newStatus: RequestStatus,
  userId: string,
  userName: string,
  role: UserRole,
): Promise<void> {
  if (!canTransitionWithRole(currentStatus, newStatus, role)) {
    throw new Error(`Invalid transition: ${currentStatus} → ${newStatus} for role ${role}`);
  }
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    status: newStatus,
    statusHistory: arrayUnion({
      from: currentStatus,
      to: newStatus,
      changedBy: userId,
      changedByName: userName,
      changedAt: Timestamp.now(),
    }),
  });
}

/** Update editable fields on a request (title, description, category, priority). */
export async function updateRequest(
  requestId: string,
  fields: Partial<Pick<MaintenanceRequest, "title" | "description" | "category" | "priority">>,
): Promise<void> {
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), fields);
}

/** Submit a 1-5 star rating with optional comment for a completed request. */
export async function rateRequest(
  requestId: string,
  rating: number,
  comment?: string,
): Promise<void> {
  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    rating,
    ratingComment: comment ?? null,
  });
}

/** Cancel a request. Only allowed from submitted or assigned status. */
export async function cancelRequest(
  requestId: string,
  currentStatus: RequestStatus,
  userId: string,
  userName: string,
): Promise<void> {
  if (!canCancel(currentStatus)) {
    throw new Error(`Cannot cancel a request with status: ${currentStatus}`);
  }
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    status: "cancelled" as RequestStatus,
    statusHistory: arrayUnion({
      from: currentStatus,
      to: "cancelled" as RequestStatus,
      changedBy: userId,
      changedByName: userName,
      changedAt: Timestamp.now(),
    }),
  });
}

/** Assign a request to a maintainer. Manager-only operation. */
export async function assignRequest(
  requestId: string,
  currentStatus: RequestStatus,
  assigneeId: string,
  assigneeName: string,
  assigneePhone: string,
  estimatedArrival: string,
  userId: string,
  userName: string,
): Promise<void> {
  if (!canTransitionWithRole(currentStatus, "assigned", "manager")) {
    throw new Error(`Invalid transition: ${currentStatus} → assigned for role manager`);
  }
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    status: "assigned" as RequestStatus,
    assignedTo: assigneeId,
    assignedToName: assigneeName,
    assignedToPhone: assigneePhone,
    estimatedArrival,
    statusHistory: arrayUnion({
      from: currentStatus,
      to: "assigned" as RequestStatus,
      changedBy: userId,
      changedByName: userName,
      changedAt: Timestamp.now(),
    }),
  });
}

/** Put a request on hold from assigned or in_progress status. */
export async function putOnHold(
  requestId: string,
  currentStatus: RequestStatus,
  userId: string,
  userName: string,
  role: UserRole,
  note?: string,
): Promise<void> {
  if (!canTransitionWithRole(currentStatus, "on_hold", role)) {
    throw new Error(`Invalid transition: ${currentStatus} → on_hold for role ${role}`);
  }
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    status: "on_hold" as RequestStatus,
    statusHistory: arrayUnion({
      from: currentStatus,
      to: "on_hold" as RequestStatus,
      changedBy: userId,
      changedByName: userName,
      changedAt: Timestamp.now(),
      ...(note ? { note } : {}),
    }),
  });
}

/** Resume a request from on_hold back to assigned or in_progress. */
export async function resumeRequest(
  requestId: string,
  resumeTo: "assigned" | "in_progress",
  userId: string,
  userName: string,
  role: UserRole,
): Promise<void> {
  if (!canTransitionWithRole("on_hold", resumeTo, role)) {
    throw new Error(`Invalid transition: on_hold → ${resumeTo} for role ${role}`);
  }
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    status: resumeTo as RequestStatus,
    statusHistory: arrayUnion({
      from: "on_hold" as RequestStatus,
      to: resumeTo as RequestStatus,
      changedBy: userId,
      changedByName: userName,
      changedAt: Timestamp.now(),
    }),
  });
}

/** Mark a request as completed. Sets resolvedAt timestamp. Maintainer-only. */
export async function completeRequest(
  requestId: string,
  currentStatus: RequestStatus,
  userId: string,
  userName: string,
): Promise<void> {
  if (!canTransitionWithRole(currentStatus, "completed", "maintainer")) {
    throw new Error(`Invalid transition: ${currentStatus} → completed for role maintainer`);
  }
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    status: "completed" as RequestStatus,
    resolvedAt: serverTimestamp(),
    statusHistory: arrayUnion({
      from: currentStatus,
      to: "completed" as RequestStatus,
      changedBy: userId,
      changedByName: userName,
      changedAt: Timestamp.now(),
    }),
  });
}

const REQUESTS_PAGE_SIZE = 100;

/** Subscribe to real-time updates for a tenant's requests. Returns unsubscribe function. */
export function subscribeToTenantRequests(
  tenantId: string,
  callback: (requests: MaintenanceRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where("tenantId", "==", tenantId),
    orderBy("createdAt", "desc"),
    limit(REQUESTS_PAGE_SIZE),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MaintenanceRequest[];
      callback(requests);
    },
    (error) => onError?.(error),
  );
}

/** Subscribe to real-time updates for a maintainer's assigned requests. Returns unsubscribe function. */
export function subscribeToMaintainerRequests(
  maintainerId: string,
  callback: (requests: MaintenanceRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where("assignedTo", "==", maintainerId),
    orderBy("createdAt", "desc"),
    limit(REQUESTS_PAGE_SIZE),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MaintenanceRequest[];
      callback(requests);
    },
    (error) => onError?.(error),
  );
}

/** Subscribe to real-time updates for all requests (manager dashboard). Returns unsubscribe function. */
export function subscribeToAllRequests(
  callback: (requests: MaintenanceRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(REQUESTS_PAGE_SIZE),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MaintenanceRequest[];
      callback(requests);
    },
    (error) => onError?.(error),
  );
}

/** Subscribe to real-time updates for a single request. Returns unsubscribe function. */
export function subscribeToRequest(
  requestId: string,
  callback: (request: MaintenanceRequest | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, REQUESTS_COLLECTION, requestId),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback({ id: snapshot.id, ...snapshot.data() } as MaintenanceRequest);
    },
    (error) => onError?.(error),
  );
}
