import { useEffect, useMemo, useState } from "react";
import { AppNotification } from "@/types";
import { subscribeToNotifications, markNotificationRead } from "@/services/notifications";
import { useAuth } from "@/hooks/useAuth";

/**
 * Reactive notification feed for the current user. Returns notifications,
 * unread count, and a markRead helper that updates Firestore.
 */
export function useNotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToNotifications(
      user.uid,
      (n) => {
        setNotifications(n);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const markRead = async (id: string) => {
    if (!user) return;
    await markNotificationRead(user.uid, id).catch(() => {});
  };

  const markAllRead = async () => {
    if (!user) return;
    await Promise.all(
      notifications.filter((n) => !n.read).map((n) => markNotificationRead(user.uid, n.id)),
    ).catch(() => {});
  };

  return { notifications, unreadCount, loading, markRead, markAllRead };
}
