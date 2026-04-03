import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from "@/services/notifications";
import { router } from "expo-router";
import { EventSubscription } from "expo-notifications";

/**
 * Hook to manage push notification lifecycle:
 * - Registers for push notifications on mount (when user is authenticated)
 * - Handles notification taps to navigate to the relevant request
 * - Cleans up listeners on unmount
 */
export function useNotifications() {
  const { user } = useAuth();
  const receivedSub = useRef<EventSubscription | null>(null);
  const responseSub = useRef<EventSubscription | null>(null);

  useEffect(() => {
    if (!user) return;

    // Register for push notifications
    registerForPushNotifications(user.uid).catch((err) => {
      console.warn("[useNotifications] Registration failed:", err);
    });

    // Listen for notifications received while app is in foreground
    receivedSub.current = addNotificationReceivedListener((_notification) => {
      // Notification is shown automatically by the handler configured in services/notifications.ts
    });

    // Listen for notification taps
    responseSub.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.requestId && typeof data.requestId === "string") {
        // Navigate to the request detail screen based on user role
        if (user.role === "manager") {
          router.push(`/(manager)/${data.requestId}`);
        } else if (user.role === "maintainer") {
          router.push(`/(maintainer)/${data.requestId}`);
        } else {
          router.push(`/(tenant)/${data.requestId}`);
        }
      }
    });

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, [user]);
}
