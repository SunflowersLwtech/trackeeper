import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useNotificationCenter } from "@/hooks/useNotificationCenter";
import { useColors } from "@/hooks/useColors";
import { withOpacity } from "@/utils/color";
import { AppNotification, NotificationKind } from "@/types";
import { formatTimeAgo } from "@/utils/time";

const KIND_ICON: Record<NotificationKind, keyof typeof Ionicons.glyphMap> = {
  request_created: "add-circle-outline",
  request_assigned: "person-add-outline",
  request_status_changed: "swap-horizontal-outline",
  request_completed: "checkmark-circle-outline",
  chat_message: "chatbubble-outline",
  payment_received: "cash-outline",
  tenant_approved: "shield-checkmark-outline",
  tenant_rejected: "close-circle-outline",
};

const KIND_TINT: Record<NotificationKind, "primary" | "success" | "warning" | "violet" | "error"> = {
  request_created: "primary",
  request_assigned: "primary",
  request_status_changed: "violet",
  request_completed: "success",
  chat_message: "primary",
  payment_received: "success",
  tenant_approved: "success",
  tenant_rejected: "error",
};

export function NotificationBell() {
  const c = useColors();
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationCenter();
  const [open, setOpen] = useState(false);

  const handleOpen = (n: AppNotification) => {
    void markRead(n.id);
    if (n.requestId) {
      setOpen(false);
      // Heuristic: just push the request ID onto the current role group.
      router.push(`./${n.requestId}` as never);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.surface,
        }}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Open notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        testID="notification-bell"
      >
        <Ionicons name="notifications-outline" size={22} color={c.text} />
        {unreadCount > 0 && (
          <View
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              paddingHorizontal: 4,
              borderRadius: 8,
              backgroundColor: c.error,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: c.background, fontSize: 9, fontWeight: "800" }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: c.overlay }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              marginTop: 80,
              marginHorizontal: 16,
              backgroundColor: c.background,
              borderRadius: 16,
              maxHeight: "75%",
              overflow: "hidden",
              shadowColor: c.text,
              shadowOpacity: 0.18,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 6 },
              elevation: 10,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: c.borderLight,
              }}
            >
              <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: c.text }}>
                Notifications
              </Text>
              {notifications.length > 0 && (
                <TouchableOpacity onPress={markAllRead} accessibilityRole="button" accessibilityLabel="Mark all as read">
                  <Text style={{ fontSize: 12, fontWeight: "600", color: c.primary }}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 480 }}>
              {notifications.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 60 }}>
                  <Ionicons name="notifications-off-outline" size={48} color={c.borderLight} />
                  <Text style={{ marginTop: 10, fontSize: 13, color: c.textTertiary }}>
                    No notifications yet
                  </Text>
                </View>
              ) : (
                notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onPress={() => handleOpen(n)}
                    colors={c}
                  />
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

interface NotificationItemProps {
  notification: AppNotification;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function NotificationItem({ notification: n, onPress, colors: c }: NotificationItemProps) {
  const tint = KIND_TINT[n.kind] ?? "primary";
  const tintColor =
    tint === "primary" ? c.primary :
    tint === "success" ? c.success :
    tint === "warning" ? c.warning :
    tint === "violet" ? c.violet :
    c.error;

  const fade = React.useRef(new Animated.Value(n.read ? 0.55 : 1)).current;
  React.useEffect(() => {
    Animated.timing(fade, { toValue: n.read ? 0.65 : 1, duration: 200, useNativeDriver: true }).start();
  }, [n.read, fade]);

  return (
    <Animated.View style={{ opacity: fade }}>
      <TouchableOpacity
        style={{
          flexDirection: "row",
          padding: 14,
          borderBottomWidth: 1,
          borderBottomColor: c.borderLight,
          backgroundColor: n.read ? c.background : withOpacity(tintColor, 0.04),
        }}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Notification: ${n.title}`}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: withOpacity(tintColor, 0.14),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={KIND_ICON[n.kind] ?? "notifications-outline"} size={20} color={tintColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: c.text }} numberOfLines={1}>
              {n.title}
            </Text>
            {!n.read && (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary, marginLeft: 6 }} />
            )}
          </View>
          <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }} numberOfLines={2}>
            {n.body}
          </Text>
          {n.createdAt && (
            <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 4 }}>
              {formatTimeAgo(n.createdAt)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
