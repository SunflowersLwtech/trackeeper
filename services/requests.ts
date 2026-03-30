import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "@/config/firebase";
import { MaintenanceRequest, RequestStatus, RequestCategory } from "@/types";
import { canTransition } from "@/utils/status";

const REQUESTS_COLLECTION = "requests";

export interface CreateRequestInput {
  title: string;
  description: string;
  category: RequestCategory;
  tenantId: string;
  tenantName: string;
  imageUri?: string;
}

export async function uploadRequestImage(uri: string, requestId: string): Promise<string> {
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

export async function createRequest(input: CreateRequestInput): Promise<string> {
  const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), {
    title: input.title,
    description: input.description,
    category: input.category,
    status: "submitted" as RequestStatus,
    tenantId: input.tenantId,
    tenantName: input.tenantName,
    imageUrl: null,
    createdAt: serverTimestamp(),
    clientTimestamp: Date.now(),
  });

  if (input.imageUri) {
    const imageUrl = await uploadRequestImage(input.imageUri, docRef.id);
    await updateDoc(doc(db, REQUESTS_COLLECTION, docRef.id), { imageUrl });
  }

  return docRef.id;
}

export async function updateRequestStatus(
  requestId: string,
  currentStatus: RequestStatus,
  newStatus: RequestStatus,
): Promise<void> {
  if (!canTransition(currentStatus, newStatus)) {
    throw new Error(`Invalid transition: ${currentStatus} → ${newStatus}`);
  }
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    status: newStatus,
  });
}

export function subscribeToTenantRequests(
  tenantId: string,
  callback: (requests: MaintenanceRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where("tenantId", "==", tenantId),
    orderBy("createdAt", "desc"),
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

export function subscribeToAllRequests(
  callback: (requests: MaintenanceRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    orderBy("createdAt", "desc"),
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
