import * as Device from "expo-device";
import { Platform } from "react-native";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  deleteField,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { AppNotification, NotificationKind } from "@/types";

let Notifications: typeof import("expo-notifications") | null = null;

function getNotifications() {
  if (!Notifications) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require("expo-notifications") as typeof import("expo-notifications");
  }
  return Notifications;
}

if (typeof window !== "undefined") {
  try {
    getNotifications().setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Silently ignore on platforms without notification support (web SSR).
  }
}

/** Register for push notifications and store the token in Firestore. */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;
  if (Platform.OS === "web") return null;

  const N = getNotifications();
  const { status: existingStatus } = await N.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await N.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await N.setNotificationChannelAsync("default", {
      name: "Default",
      importance: N.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await N.getExpoPushTokenAsync();
  const token = tokenData.data;
  await setDoc(doc(db, "users", userId), { pushToken: token }, { merge: true });
  return token;
}

export async function unregisterPushToken(userId: string): Promise<void> {
  await setDoc(doc(db, "users", userId), { pushToken: deleteField() }, { merge: true });
}

/** Show a local notification (immediate). Safe on web (becomes no-op). */
export async function sendLocalNotification(title: string, body: string): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    await getNotifications().scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {
    // ignore — notifications optional
  }
}

export function addNotificationReceivedListener(
  handler: (notification: import("expo-notifications").Notification) => void,
): import("expo-notifications").EventSubscription {
  return getNotifications().addNotificationReceivedListener(handler);
}

export function addNotificationResponseListener(
  handler: (response: import("expo-notifications").NotificationResponse) => void,
): import("expo-notifications").EventSubscription {
  return getNotifications().addNotificationResponseReceivedListener(handler);
}

// ─── In-app notification center ───

interface CreateNotificationInput {
  kind: NotificationKind;
  title: string;
  body: string;
  requestId?: string;
  actorId?: string;
  actorName?: string;
}

/**
 * Write a notification document into users/{uid}/notifications. Use this from
 * the client whenever an event happens that should be visible in the recipient's
 * notification bell.
 */
export async function createNotification(
  recipientUid: string,
  input: CreateNotificationInput,
): Promise<void> {
  await addDoc(collection(db, "users", recipientUid, "notifications"), {
    kind: input.kind,
    title: input.title,
    body: input.body,
    read: false,
    createdAt: serverTimestamp(),
    ...(input.requestId ? { requestId: input.requestId } : {}),
    ...(input.actorId ? { actorId: input.actorId } : {}),
    ...(input.actorName ? { actorName: input.actorName } : {}),
  });
}

/** Subscribe to a user's recent notifications (max 50, newest first). */
export function subscribeToNotifications(
  recipientUid: string,
  callback: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, "users", recipientUid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AppNotification[];
      callback(notifications);
    },
    (error) => onError?.(error),
  );
}

/** Mark a single notification as read. */
export async function markNotificationRead(
  recipientUid: string,
  notificationId: string,
): Promise<void> {
  await updateDoc(
    doc(db, "users", recipientUid, "notifications", notificationId),
    { read: true },
  );
}
