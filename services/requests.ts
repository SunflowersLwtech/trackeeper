import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
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
  TriageFactor,
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
import {
  computeSlaTargets,
  pauseSla,
  priorityToSlaPriority,
  resumeSla,
} from "@/utils/sla";
import { tokenizeTitle } from "@/utils/search";
import { withoutUndefined } from "@/utils/firestorePayload";
import { friendlyErrorMessage, getErrorCode } from "@/utils/errorMessages";
import type { RequestETA, OnHoldReason } from "@/types";

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
  /** Structured answers from the tenant risk checklist used for system triage. */
  triageFactors?: TriageFactor[];
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
  const contentType = blob.type?.startsWith("image/") ? blob.type : "image/jpeg";
  // Index keeps URLs sortable on read; ts disambiguates same-index re-uploads.
  const filename = `${Date.now()}-${index}.jpg`;
  const imageRef = ref(storage, `requests/${requestId}/${filename}`);
  const uploadTask = uploadBytesResumable(imageRef, blob, {
    contentType,
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null,
      (error) => {
        console.warn("[uploadOneRequestImage] failed", {
          requestId,
          index,
          size: blob.size,
          contentType,
          code: error.code,
        });
        reject(error);
      },
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

/** Create a new maintenance request. System triage suggests priority; manager has final say. */
export async function createRequest(input: CreateRequestInput): Promise<string> {
  // Normalise images: prefer imageUris[], fall back to legacy single imageUri.
  const allUris = (input.imageUris && input.imageUris.length > 0)
    ? input.imageUris
    : (input.imageUri ? [input.imageUri] : []);
  assertWithinImageLimit(allUris.length, 0, MAX_IMAGES_PER_REQUEST);

  const suggestion: PrioritySuggestion = suggestPriority(
    input.title,
    input.description,
    input.category,
    input.triageFactors ?? [],
  );
  const slaPriority = priorityToSlaPriority(suggestion.priority);
  const sla = computeSlaTargets(slaPriority, new Date());
  const titleTokens = tokenizeTitle(input.title);
  const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), {
    title: input.title,
    titleTokens,
    description: input.description,
    category: input.category,
    priority: suggestion.priority,
    prioritySuggestion: suggestion,
    priorityFactors: suggestion.factors ?? [],
    priorityConfidence: suggestion.confidence ?? "low",
    status: "submitted" as RequestStatus,
    tenantId: input.tenantId,
    tenantName: input.tenantName,
    ...(input.tenantUnit ? { tenantUnit: input.tenantUnit } : {}),
    imageUrls: [],
    sla,
    statusHistory: [],
    createdAt: serverTimestamp(),
    clientTimestamp: Date.now(),
  });

  if (allUris.length > 0) {
    try {
      const imageUrls = await uploadRequestImages(allUris, docRef.id, input.onUploadProgress);
      await updateDoc(doc(db, REQUESTS_COLLECTION, docRef.id), {
        imageUrls,
        ...(imageUrls[0] ? { imageUrl: imageUrls[0] } : {}),
      });
    } catch (err) {
      console.warn(`[createRequest] Image upload failed for ${docRef.id}:`, err);
      if (getErrorCode(err) === "storage/unauthorized") {
        throw new Error("Photo upload is blocked by Storage permissions. Deploy the latest Storage rules, then retry.");
      }
      throw new Error(friendlyErrorMessage(err, "Photo upload failed. Check the image and try again."));
    }
  }

  // Fan-out notification to all managers — best-effort.
  void notifyAllManagers({
    kind: "request_created",
    title: "New maintenance request",
    body: `${input.tenantName} reported: ${input.title} (${suggestion.priority.toUpperCase()} priority - ${suggestion.reason})`,
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
    ...(existingCount === 0 && urls[0] ? { imageUrl: urls[0] } : {}),
  });
  return urls;
}

/**
 * Update request status with role-based transition validation. Also handles
 * the SLA pause / resume side-effect: entering on_hold pauses the SLA;
 * leaving on_hold resumes it. Optional `onHoldReason` is recorded when
 * entering on_hold (manager UI should require it).
 */
export async function updateRequestStatus(
  requestId: string,
  currentStatus: RequestStatus,
  newStatus: RequestStatus,
  userId: string,
  userName: string,
  role: UserRole,
  options: { onHoldReason?: OnHoldReason; note?: string } = {},
): Promise<void> {
  if (!canTransitionWithRole(currentStatus, newStatus, role)) {
    throw new Error(`Invalid transition: ${currentStatus} → ${newStatus} for role ${role}`);
  }

  const ref = doc(db, REQUESTS_COLLECTION, requestId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? (snap.data() as MaintenanceRequest) : undefined;

  const update: Record<string, unknown> = {
    status: newStatus,
    statusHistory: arrayUnion({
      from: currentStatus,
      to: newStatus,
      changedBy: userId,
      changedByName: userName,
      changedAt: Timestamp.now(),
      ...(options.note ? { note: options.note } : {}),
      ...(options.onHoldReason && newStatus === "on_hold" ? { reason: options.onHoldReason } : {}),
    }),
  };

  // Track on_hold reason at the request level so the UI can show it without
  // walking statusHistory.
  if (newStatus === "on_hold" && options.onHoldReason) {
    update.onHoldReason = options.onHoldReason;
  } else if (currentStatus === "on_hold" && newStatus !== "on_hold") {
    update.onHoldReason = null;
  }

  // SLA pause/resume side-effect.
  if (data?.sla) {
    if (newStatus === "on_hold" && currentStatus !== "on_hold") {
      update.sla = pauseSla(data.sla);
    } else if (currentStatus === "on_hold" && newStatus !== "on_hold") {
      update.sla = resumeSla(data.sla);
    }
  }

  // Resolved/verified bookkeeping.
  if (newStatus === "completed" && !data?.resolvedAt) {
    update.resolvedAt = Timestamp.now();
  }
  if (newStatus === "verified") {
    update.verifiedByTenantAt = Timestamp.now();
  }

  await updateDoc(ref, update);
}

/**
 * Schedule a request for a specific date/time — moves status to "scheduled"
 * and records the appointment. Both manager and assigned maintainer may call.
 */
export async function scheduleRequest(
  requestId: string,
  scheduledFor: Date,
  userId: string,
  userName: string,
  role: UserRole,
): Promise<void> {
  if (scheduledFor.getTime() < Date.now() - 60_000) {
    throw new Error("Scheduled time must be in the future");
  }
  const ref = doc(db, REQUESTS_COLLECTION, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Request not found");
  const data = snap.data() as MaintenanceRequest;
  const isReschedule = data.status === "scheduled";
  if (!isReschedule && !canTransitionWithRole(data.status, "scheduled", role)) {
    throw new Error(`Cannot schedule from ${data.status} for role ${role}`);
  }
  const actorName = userName || "Someone";
  await updateDoc(ref, withoutUndefined({
    status: "scheduled",
    scheduledFor: Timestamp.fromDate(scheduledFor),
    statusHistory: arrayUnion(withoutUndefined({
      from: data.status,
      to: "scheduled",
      changedBy: userId || undefined,
      changedByName: userName || undefined,
      changedAt: Timestamp.now(),
      note: `${isReschedule ? "Rescheduled" : "Scheduled"} for ${scheduledFor.toISOString()}`,
    })),
  }));

  // Notify the tenant when a manager/maintainer schedules.
  await createNotification(data.tenantId, {
    kind: "request_scheduled",
    title: "Appointment scheduled",
    body: `${actorName} ${isReschedule ? "rescheduled" : "scheduled"} "${data.title}" for ${scheduledFor.toLocaleString()}.`,
    requestId,
    actorId: userId || undefined,
    actorName: userName || undefined,
  }).catch(() => {});
}

/**
 * Tenant confirms the work was completed satisfactorily — moves
 * status to "verified" (terminal, post-completed). Idempotent.
 */
export async function verifyByTenant(
  requestId: string,
  tenantId: string,
  tenantName: string,
): Promise<void> {
  const ref = doc(db, REQUESTS_COLLECTION, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Request not found");
  const data = snap.data() as MaintenanceRequest;
  if (data.tenantId !== tenantId) {
    throw new Error("Only the tenant of this request can verify it");
  }
  if (data.status === "verified") return;
  if (data.status !== "completed") {
    throw new Error("Can only verify a completed request");
  }
  await updateDoc(ref, {
    status: "verified",
    verifiedByTenantAt: Timestamp.now(),
    statusHistory: arrayUnion({
      from: "completed",
      to: "verified",
      changedBy: tenantId,
      changedByName: tenantName,
      changedAt: Timestamp.now(),
    }),
  });

  // Notify the assigned maintainer that the work was confirmed.
  if (data.assignedTo) {
    await createNotification(data.assignedTo, {
      kind: "request_verified",
      title: "Work verified by tenant",
      body: `${tenantName} confirmed your repair on "${data.title}".`,
      requestId,
      actorId: tenantId,
      actorName: tenantName,
    }).catch(() => {});
  }
}

/**
 * Maintainer (or manager on behalf) sets / updates the ETA for the
 * scheduled job. Either a single point estimate or a window.
 *
 * Pushes a notification to the tenant if revisionCount > 0 (i.e. ETA changed).
 */
export async function setEstimatedArrival(
  requestId: string,
  setById: string,
  setByName: string,
  payload: { at?: Date; window?: { start: Date; end: Date } },
): Promise<RequestETA> {
  if (!payload.at && !payload.window) {
    throw new Error("Provide either a single ETA or a window");
  }
  const ref = doc(db, REQUESTS_COLLECTION, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Request not found");
  const data = snap.data() as MaintenanceRequest;

  const previous = data.eta;
  const next: RequestETA = {
    setBy: setById,
    setByName,
    setAt: Timestamp.now(),
    revisionCount: (previous?.revisionCount ?? 0) + (previous ? 1 : 0),
    ...(payload.at ? { estimatedArrivalAt: Timestamp.fromDate(payload.at) } : {}),
    ...(payload.window
      ? {
          estimatedArrivalWindow: {
            start: Timestamp.fromDate(payload.window.start),
            end: Timestamp.fromDate(payload.window.end),
          },
        }
      : {}),
  };
  await updateDoc(ref, { eta: next });

  // Only push on revision (not initial set — that's covered by status_changed).
  if (next.revisionCount > 0) {
    const human = payload.window
      ? `${payload.window.start.toLocaleString()} – ${payload.window.end.toLocaleTimeString()}`
      : payload.at?.toLocaleString();
    await createNotification(data.tenantId, {
      kind: "request_eta_changed",
      title: "ETA updated",
      body: `${setByName} updated the arrival time to ${human}.`,
      requestId,
      actorId: setById,
      actorName: setByName,
    }).catch(() => {});
  }

  return next;
}

/** Maintainer marks "I've arrived" — fixes the actual arrival timestamp. */
export async function markMaintainerArrived(
  requestId: string,
  maintainerId: string,
): Promise<void> {
  const ref = doc(db, REQUESTS_COLLECTION, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Request not found");
  const data = snap.data() as MaintenanceRequest;
  if (data.assignedTo !== maintainerId) {
    throw new Error("Only the assigned maintainer can mark arrival");
  }
  const eta: RequestETA = {
    ...(data.eta ?? {
      setBy: maintainerId,
      setByName: data.assignedToName ?? "",
      setAt: Timestamp.now(),
      revisionCount: 0,
    }),
    actualArrivalAt: Timestamp.now(),
  };
  await updateDoc(ref, { eta });
}

/** Update editable fields on a request (title, description, category, priority). */
export async function updateRequest(
  requestId: string,
  fields: Partial<Pick<MaintenanceRequest, "title" | "description" | "category" | "priority">>,
): Promise<void> {
  // Re-derive titleTokens when title changes.
  const next: Record<string, unknown> = { ...fields };
  if (typeof fields.title === "string") {
    next.titleTokens = tokenizeTitle(fields.title);
  }
  if (
    fields.priority === undefined &&
    (fields.title !== undefined || fields.description !== undefined || fields.category !== undefined)
  ) {
    const ref = doc(db, REQUESTS_COLLECTION, requestId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const current = snap.data() as MaintenanceRequest;
      const suggestion = suggestPriority(
        fields.title ?? current.title,
        fields.description ?? current.description,
        fields.category ?? current.category,
        current.prioritySuggestion?.factors ?? current.priorityFactors ?? [],
      );
      next.priority = suggestion.priority;
      next.prioritySuggestion = suggestion;
      next.priorityFactors = suggestion.factors ?? [];
      next.priorityConfidence = suggestion.confidence ?? "low";
    }
  }
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), next);
}

/** Manager sets a custom priority and overrides system triage. */
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
    priorityFactors: [],
    priorityConfidence: null,
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
