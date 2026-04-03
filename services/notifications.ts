import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, setDoc, deleteField } from "firebase/firestore";
import { db } from "@/config/firebase";

// Lazy-import expo-notifications to avoid SSR crash (localStorage not available in Node)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Notifications: typeof import("expo-notifications") | null = null;

function getNotifications() {
  if (!Notifications) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require("expo-notifications") as typeof import("expo-notifications");
  }
  return Notifications;
}

// Configure notification behavior (show even when app is in foreground)
// Only runs on client side (not during SSR)
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
    // Silently ignore if notifications not supported (e.g., web SSR)
  }
}

/**
 * Register for push notifications and save the token to the user's Firestore profile.
 * Returns the Expo push token, or null if registration fails (e.g., simulator, web).
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // Push notifications require a physical device
  if (!Device.isDevice) {
    console.log("[notifications] Push notifications require a physical device");
    return null;
  }

  // Web doesn't support Expo push notifications
  if (Platform.OS === "web") {
    return null;
  }

  // Check/request permissions
  const N = getNotifications();
  const { status: existingStatus } = await N.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await N.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[notifications] Permission not granted");
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await N.setNotificationChannelAsync("default", {
      name: "Default",
      importance: N.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // Get the Expo push token
  const tokenData = await N.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Save token to user's Firestore profile for server-side sending
  await setDoc(
    doc(db, "users", userId),
    { pushToken: token },
    { merge: true },
  );

  return token;
}

/**
 * Remove push token from user's Firestore profile (e.g., on logout).
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  await setDoc(
    doc(db, "users", userId),
    { pushToken: deleteField() },
    { merge: true },
  );
}

/**
 * Schedule a local notification (for in-app events when no server push is available).
 */
export async function sendLocalNotification(
  title: string,
  body: string,
): Promise<void> {
  await getNotifications().scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // Immediate
  });
}

/**
 * Add a listener for received notifications (foreground).
 * Returns a subscription that should be removed on cleanup.
 */
export function addNotificationReceivedListener(
  handler: (notification: import("expo-notifications").Notification) => void,
): import("expo-notifications").EventSubscription {
  return getNotifications().addNotificationReceivedListener(handler);
}

/**
 * Add a listener for notification taps (user interaction).
 * Returns a subscription that should be removed on cleanup.
 */
export function addNotificationResponseListener(
  handler: (response: import("expo-notifications").NotificationResponse) => void,
): import("expo-notifications").EventSubscription {
  return getNotifications().addNotificationResponseReceivedListener(handler);
}
