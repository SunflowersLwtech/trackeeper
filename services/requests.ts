import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  Timestamp,
  Unsubscribe,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "@/config/firebase";
import {
  MaintenanceRequest,
  RequestStatus,
  RequestCategory,
  RequestPriority,
  PrioritySuggestion,
  UserRole,
} from "@/types";
import { canCancel, canTransitionWithRole, getStatusLabel } from "@/utils/status";
import { suggestPriority } from "@/utils/priority";
import { createNotification } from "@/services/notifications";
import { compressImages } from "@/services/imageCompression";
import {
  UPLOAD_CONCURRENCY,
  MAX_IMAGES_PER_REQUEST,
  assertWithinImageLimit,
} from "@/utils/images";

const REQUESTS_COLLECTION = "requests";
const USERS_COLLECTION = "users";

export interface CreateRequestInput {
  title: string;
  description: string;
  category: RequestCategory;
  tenantId: string;
  tenantName: string;
  tenantUnit?: string;
  /** Up to MAX_IMAGES_PER_REQUEST local URIs to attach. Compressed before upload. */
  imageUris?: string[];
  /** @deprecated single-image — use imageUris. Kept for legacy callers. */
  imageUri?: string;
  /** Optional progress callback during multi-upload (0–1). */
  onUploadProgress?: (overall: number) => void;
}

/** Upload one already-compressed image. Resolves with the storage download URL. */
async function uploadOneRequestImage(
  uri: string,
  requestId: string,
  index: number,
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  // Index keeps URLs sortable on read; ts disambiguates same-index re-uploads.
  const filename = `${Date.now()}-${index}.jpg`;
  const imageRef = ref(storage, `requests/${requestId}/${filename}`);
  const uploadTask = uploadBytesResumable(imageRef, blob, {
    contentType: "image/jpeg",
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null,
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

/**
 * Upload many request images with capped concurrency. Compresses each via
 * services/imageCompression first, then uploads. Returns URLs in input order.
 */
export async function uploadRequestImages(
  uris: string[],
  requestId: string,
  onProgress?: (overall: number) => void,
): Promise<string[]> {
  if (uris.length === 0) return [];
  const compressed = await compressImages(uris, UPLOAD_CONCURRENCY);

  const urls: string[] = new Array(uris.length);
  let done = 0;
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= compressed.length) return;
      urls[i] = await uploadOneRequestImage(compressed[i].uri, requestId, i);
      done += 1;
      onProgress?.(done / compressed.length);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(UPLOAD_CONCURRENCY, compressed.length) }, worker),
  );
  return urls;
}

/** Best-effort: notify every manager. Failures are silenced (notification UX only). */
async function notifyAllManagers(args: {
  kind: Parameters<typeof createNotification>[1]["kind"];
  title: string;
  body: string;
  requestId?: string;
  actorId?: string;
  actorName?: string;
}) {
  try {
    const managersSnap = await getDocs(
      query(collection(db, USERS_COLLECTION), where("role", "==", "manager")),
    );
    await Promise.all(
      managersSnap.docs.map((d) =>
        createNotification(d.id, {
          kind: args.kind,
          title: args.title,
          body: args.body,
          requestId: args.requestId,
          actorId: args.actorId,
          actorName: args.actorName,
        }).catch(() => {}),
      ),
    );
  } catch {
    // Never block the user-visible action on notification fan-out.
  }
}

/** Create a new maintenance request. Auto-suggests a priority — manager has final say. */
export async function createRequest(input: CreateRequestInput): Promise<string> {
  // Normalise images: prefer imageUris[], fall back to legacy single imageUri.
  const allUris = (input.imageUris && input.imageUris.length > 0)
    ? input.imageUris
    : (input.imageUri ? [input.imageUri] : []);
  assertWithinImageLimit(allUris.length, 0, MAX_IMAGES_PER_REQUEST);

  const suggestion: PrioritySuggestion = suggestPriority(input.title, input.description, input.category);
  const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), {
    title: input.title,
    description: input.description,
    category: input.category,
    priority: suggestion.priority,
    prioritySuggestion: suggestion,
    status: "submitted" as RequestStatus,
    tenantId: input.tenantId,
    tenantName: input.tenantName,
    ...(input.tenantUnit ? { tenantUnit: input.tenantUnit } : {}),
    imageUrls: [],
    statusHistory: [],
    createdAt: serverTimestamp(),
    clientTimestamp: Date.now(),
  });

  if (allUris.length > 0) {
    try {
      const imageUrls = await uploadRequestImages(allUris, docRef.id, input.onUploadProgress);
      await updateDoc(doc(db, REQUESTS_COLLECTION, docRef.id), { imageUrls });
    } catch (err) {
      console.warn(`[createRequest] Image upload failed for ${docRef.id}:`, err);
    }
  }

  // Fan-out notification to all managers — best-effort.
  void notifyAllManagers({
    kind: "request_created",
    title: "New maintenance request",
    body: `${input.tenantName} reported: ${input.title} (${suggestion.priority.toUpperCase()} priority — ${suggestion.reason})`,
    requestId: docRef.id,
    actorId: input.tenantId,
    actorName: input.tenantName,
  });

  return docRef.id;
}

/**
 * Append additional images to an existing request. Used for editing the
 * request after creation or for the maintainer/manager to upload completion
 * proofs. Enforces the same per-request cap.
 */
export async function appendRequestImages(
  requestId: string,
  newUris: string[],
  existingCount: number,
  onProgress?: (overall: number) => void,
): Promise<string[]> {
  assertWithinImageLimit(newUris.length, existingCount, MAX_IMAGES_PER_REQUEST);
  const urls = await uploadRequestImages(newUris, requestId, onProgress);
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    imageUrls: arrayUnion(...urls),
  });
  return urls;
}

/** Update request status with role-based transition validation. */
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

/** Manager sets a custom priority — overrides any auto-suggestion. */
export async function setPriority(
  requestId: string,
  priority: RequestPriority,
  setById: string,
  setByName: string,
  reason?: string,
): Promise<void> {
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    priority,
    prioritySuggestion: {
      priority,
      reason: reason || `Set by ${setByName}`,
      source: "manager",
    } satisfies PrioritySuggestion,
  });
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

/** Assign a request to a maintainer. Manager-only operation. Notifies the maintainer + tenant. */
export async function assignRequest(
  requestId: string,
  currentStatus: RequestStatus,
  assigneeId: string,
  assigneeName: string,
  assigneePhone: string,
  estimatedArrival: string,
  userId: string,
  userName: string,
  tenantId?: string,
  jobTitle?: string,
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

  // Notify the maintainer
  void createNotification(assigneeId, {
    kind: "request_assigned",
    title: "New job assigned",
    body: `${userName} assigned you to ${jobTitle ?? "a maintenance request"}${estimatedArrival ? ` — ETA ${estimatedArrival}` : ""}.`,
    requestId,
    actorId: userId,
    actorName: userName,
  }).catch(() => {});

  // Notify the tenant
  if (tenantId) {
    void createNotification(tenantId, {
      kind: "request_assigned",
      title: "Your request is on the way",
      body: `${assigneeName} has been assigned to ${jobTitle ?? "your request"}${estimatedArrival ? ` (ETA ${estimatedArrival})` : ""}.`,
      requestId,
      actorId: userId,
      actorName: userName,
    }).catch(() => {});
  }
}

/** Put a request on hold from assigned or in_progress status. */
export async function putOnHold(
  requestId: string,
  currentStatus: RequestStatus,
  userId: string,
  userName: string,
  role: UserRole,
  note?: string,
  tenantId?: string,
  jobTitle?: string,
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

  if (tenantId) {
    void createNotification(tenantId, {
      kind: "request_status_changed",
      title: "Request on hold",
      body: `${jobTitle ?? "Your request"} has been placed on hold${note ? `: ${note}` : "."}`,
      requestId,
      actorId: userId,
      actorName: userName,
    }).catch(() => {});
  }
}

/** Resume a request from on_hold back to assigned or in_progress. */
export async function resumeRequest(
  requestId: string,
  resumeTo: "assigned" | "in_progress",
  userId: string,
  userName: string,
  role: UserRole,
  tenantId?: string,
  jobTitle?: string,
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

  if (tenantId) {
    void createNotification(tenantId, {
      kind: "request_status_changed",
      title: "Request resumed",
      body: `${jobTitle ?? "Your request"} is now ${getStatusLabel(resumeTo).toLowerCase()}.`,
      requestId,
      actorId: userId,
      actorName: userName,
    }).catch(() => {});
  }
}

/** Mark a request as completed. Sets resolvedAt timestamp. Maintainer-only. */
export async function completeRequest(
  requestId: string,
  currentStatus: RequestStatus,
  userId: string,
  userName: string,
  tenantId?: string,
  jobTitle?: string,
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

  if (tenantId) {
    void createNotification(tenantId, {
      kind: "request_completed",
      title: "Maintenance complete",
      body: `${userName} marked ${jobTitle ?? "your request"} as completed. Please rate the service!`,
      requestId,
      actorId: userId,
      actorName: userName,
    }).catch(() => {});
  }

  // Also notify any manager so the dashboard reflects it
  void notifyAllManagers({
    kind: "request_completed",
    title: "Job completed",
    body: `${userName} completed ${jobTitle ?? "a request"}.`,
    requestId,
    actorId: userId,
    actorName: userName,
  });
}

/** Maintainer accepts an assigned job — moves it to in_progress. */
export async function startWork(
  requestId: string,
  currentStatus: RequestStatus,
  userId: string,
  userName: string,
  tenantId?: string,
  jobTitle?: string,
): Promise<void> {
  if (!canTransitionWithRole(currentStatus, "in_progress", "maintainer")) {
    throw new Error(`Invalid transition: ${currentStatus} → in_progress for role maintainer`);
  }
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    status: "in_progress" as RequestStatus,
    statusHistory: arrayUnion({
      from: currentStatus,
      to: "in_progress" as RequestStatus,
      changedBy: userId,
      changedByName: userName,
      changedAt: Timestamp.now(),
    }),
  });

  if (tenantId) {
    void createNotification(tenantId, {
      kind: "request_status_changed",
      title: "Work started",
      body: `${userName} has started working on ${jobTitle ?? "your request"}.`,
      requestId,
      actorId: userId,
      actorName: userName,
    }).catch(() => {});
  }
}

export const PAGE_SIZE = 20;

export interface PaginatedResult {
  requests: MaintenanceRequest[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/** Subscribe to first page of tenant's requests (real-time). */
export function subscribeToTenantRequests(
  tenantId: string,
  callback: (requests: MaintenanceRequest[], lastDoc: QueryDocumentSnapshot<DocumentData> | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where("tenantId", "==", tenantId),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MaintenanceRequest[];
      const last = snapshot.docs[snapshot.docs.length - 1] ?? null;
      callback(requests, last);
    },
    (error) => onError?.(error),
  );
}

export async function loadMoreTenantRequests(
  tenantId: string,
  afterDoc: QueryDocumentSnapshot<DocumentData>,
): Promise<PaginatedResult> {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where("tenantId", "==", tenantId),
    orderBy("createdAt", "desc"),
    startAfter(afterDoc),
    limit(PAGE_SIZE),
  );
  const snapshot = await getDocs(q);
  const requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as MaintenanceRequest[];
  return {
    requests,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null,
    hasMore: snapshot.docs.length === PAGE_SIZE,
  };
}

export function subscribeToMaintainerRequests(
  maintainerId: string,
  callback: (requests: MaintenanceRequest[], lastDoc: QueryDocumentSnapshot<DocumentData> | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where("assignedTo", "==", maintainerId),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MaintenanceRequest[];
      const last = snapshot.docs[snapshot.docs.length - 1] ?? null;
      callback(requests, last);
    },
    (error) => onError?.(error),
  );
}

export async function loadMoreMaintainerRequests(
  maintainerId: string,
  afterDoc: QueryDocumentSnapshot<DocumentData>,
): Promise<PaginatedResult> {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where("assignedTo", "==", maintainerId),
    orderBy("createdAt", "desc"),
    startAfter(afterDoc),
    limit(PAGE_SIZE),
  );
  const snapshot = await getDocs(q);
  const requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as MaintenanceRequest[];
  return {
    requests,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null,
    hasMore: snapshot.docs.length === PAGE_SIZE,
  };
}

export function subscribeToAllRequests(
  callback: (requests: MaintenanceRequest[], lastDoc: QueryDocumentSnapshot<DocumentData> | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MaintenanceRequest[];
      const last = snapshot.docs[snapshot.docs.length - 1] ?? null;
      callback(requests, last);
    },
    (error) => onError?.(error),
  );
}

export async function loadMoreAllRequests(
  afterDoc: QueryDocumentSnapshot<DocumentData>,
): Promise<PaginatedResult> {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    orderBy("createdAt", "desc"),
    startAfter(afterDoc),
    limit(PAGE_SIZE),
  );
  const snapshot = await getDocs(q);
  const requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as MaintenanceRequest[];
  return {
    requests,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null,
    hasMore: snapshot.docs.length === PAGE_SIZE,
  };
}

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

/**
 * Subscribe to all completed requests assigned to a maintainer that have a non-empty
 * cost. Used by the earnings page.
 */
export function subscribeToMaintainerEarnings(
  maintainerId: string,
  callback: (requests: MaintenanceRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where("assignedTo", "==", maintainerId),
    where("status", "==", "completed"),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as MaintenanceRequest)
        .filter((r) => r.cost && r.cost.total > 0);
      callback(requests);
    },
    (error) => onError?.(error),
  );
}
