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
import { AppNotification, NotificationKind, NotificationDeepLink } from "@/types";

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
    // Channels are split by content type (not by role) so users can mute one
    // category in OS settings without losing the others.
    await N.setNotificationChannelAsync("messages", {
      name: "Chat messages",
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
    });
    await N.setNotificationChannelAsync("status_changes", {
      name: "Request updates",
      importance: N.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
    });
    await N.setNotificationChannelAsync("urgent", {
      name: "Urgent / SLA breach",
      importance: N.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      bypassDnd: true,
    });
    await N.setNotificationChannelAsync("digest", {
      name: "Daily / weekly digest",
      importance: N.AndroidImportance.LOW,
    });
    // Backward-compatible default for any older code path.
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

interface LocalNotifOptions {
  data?: NotificationDeepLink & Record<string, unknown>;
  /** Android channel id — also drives iOS interruption level. */
  channelId?: "messages" | "status_changes" | "urgent" | "digest" | "default";
  /** APNs thread-id / Android groupKey for OS-level grouping. */
  threadId?: string;
  /** Override sound (e.g. silent for digest). */
  sound?: boolean;
}

/**
 * Show a local notification (immediate). Safe on web (becomes no-op).
 * Sets `data` payload for deep linking + thread-id for grouping so multiple
 * messages from the same request collapse into a single OS notification stack.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  options: LocalNotifOptions = {},
): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    const N = getNotifications();
    await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: options.sound !== false,
        data: options.data ?? {},
        ...(Platform.OS === "ios" && options.threadId
          ? { threadId: options.threadId }
          : {}),
      },
      trigger:
        Platform.OS === "android" && options.channelId
          ? ({ channelId: options.channelId } as unknown as null)
          : null,
    });
  } catch {
    // ignore — notifications optional
  }
}

/**
 * Map a notification kind onto the recommended Android channel + APNs
 * category. Lets call sites stay simple ("send a request_assigned push")
 * while ensuring SLA breaches go to the urgent channel etc.
 */
export function notificationRouting(kind: NotificationKind): {
  channelId: "messages" | "status_changes" | "urgent" | "digest";
  category?: NotificationDeepLink["category"];
} {
  switch (kind) {
    case "chat_message":
    case "chat_mention":
      return { channelId: "messages", category: "message" };
    case "request_sla_breach":
      return { channelId: "urgent", category: "status" };
    case "payment_received":
      return { channelId: "status_changes", category: "payment" };
    case "tenant_approved":
    case "tenant_rejected":
      return { channelId: "status_changes", category: "approval" };
    case "request_assigned":
    case "request_scheduled":
      return { channelId: "status_changes", category: "assign" };
    default:
      return { channelId: "status_changes", category: "status" };
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
  messageId?: string;
  actorId?: string;
  actorName?: string;
  /** Override the auto-derived deep link / category. */
  deepLink?: Partial<NotificationDeepLink>;
}

/**
 * Write a notification document into users/{uid}/notifications. Use this from
 * the client whenever an event happens that should be visible in the recipient's
 * notification bell.
 *
 * The deepLink field is auto-populated from kind + requestId so the in-app
 * tap handler (and OS push payload) can route directly to the right screen
 * without the caller having to know the routing rules.
 */
export async function createNotification(
  recipientUid: string,
  input: CreateNotificationInput,
): Promise<void> {
  const routing = notificationRouting(input.kind);
  const deepLink: NotificationDeepLink = {
    ticketId: input.requestId,
    messageId: input.messageId,
    threadId: input.requestId, // group by request for OS-level stacking
    category: routing.category,
    ...input.deepLink,
  };
  await addDoc(collection(db, "users", recipientUid, "notifications"), {
    kind: input.kind,
    title: input.title,
    body: input.body,
    read: false,
    createdAt: serverTimestamp(),
    ...(input.requestId ? { requestId: input.requestId } : {}),
    ...(input.actorId ? { actorId: input.actorId } : {}),
    ...(input.actorName ? { actorName: input.actorName } : {}),
    deepLink,
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
