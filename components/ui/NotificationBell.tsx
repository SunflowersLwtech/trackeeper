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
import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_SM, SHADOW_MD } from "@/constants/Brutalism";
import { AppNotification, NotificationKind } from "@/types";
import { formatTimeAgo } from "@/utils/time";

const KIND_ICON: Record<NotificationKind, keyof typeof Ionicons.glyphMap> = {
  request_created: "add-circle-outline",
  request_assigned: "person-add-outline",
  request_scheduled: "calendar-outline",
  request_status_changed: "swap-horizontal-outline",
  request_completed: "checkmark-circle-outline",
  request_verified: "shield-checkmark-outline",
  request_eta_changed: "time-outline",
  request_sla_breach: "alert-circle-outline",
  chat_message: "chatbubble-outline",
  chat_mention: "at-outline",
  payment_received: "cash-outline",
  tenant_approved: "shield-checkmark-outline",
  tenant_rejected: "close-circle-outline",
};

const KIND_TINT: Record<NotificationKind, string> = {
  request_created: palette.cobalt500,
  request_assigned: palette.cobalt500,
  request_scheduled: palette.sky500,
  request_status_changed: palette.plum500,
  request_completed: palette.lime500,
  request_verified: palette.lime500,
  request_eta_changed: palette.mustard500,
  request_sla_breach: palette.tomato500,
  chat_message: palette.sky500,
  chat_mention: palette.cobalt500,
  payment_received: palette.lime500,
  tenant_approved: palette.lime500,
  tenant_rejected: palette.tomato500,
};

const DARK_TINTS: ReadonlySet<string> = new Set<string>([
  palette.cobalt500,
  palette.plum500,
  palette.tomato500,
  palette.sky500,
]);

export function NotificationBell() {
  const c = useColors();
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationCenter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const handleOpen = (n: AppNotification) => {
    void markRead(n.id);
    // Prefer the canonical deepLink.ticketId; fall back to legacy requestId.
    const ticketId = n.deepLink?.ticketId ?? n.requestId;
    if (!ticketId) return;
    setOpen(false);
    const role = user?.role;
    const target =
      role === "manager"
        ? `/(manager)/${ticketId}`
        : role === "maintainer"
          ? `/(maintainer)/${ticketId}`
          : `/(tenant)/${ticketId}`;
    router.push(target as never);
  };

  return (
    <>
      <TouchableOpacity
        style={{
          width: 42,
          height: 42,
          borderRadius: RADIUS.xs,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.surface,
          borderWidth: BORDER.base,
          borderColor: palette.ink,
          ...SHADOW_SM,
        }}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Open notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        testID="notification-bell"
      >
        <Ionicons name="notifications" size={20} color={palette.ink} />
        {unreadCount > 0 && (
          <View
            style={{
              position: "absolute",
              top: -7,
              right: -7,
              minWidth: 20,
              height: 20,
              paddingHorizontal: 4,
              backgroundColor: palette.tomato500,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: palette.paper,
                fontSize: 10,
                fontFamily: FONT.display,
                fontWeight: "900",
              }}
            >
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
              backgroundColor: c.surface,
              borderWidth: BORDER.heavy,
              borderColor: palette.ink,
              borderRadius: RADIUS.sm,
              maxHeight: "75%",
              overflow: "hidden",
              ...SHADOW_MD,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: BORDER.base,
                borderBottomColor: palette.ink,
                backgroundColor: palette.cobalt500,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontFamily: FONT.display,
                  fontSize: 14,
                  fontWeight: "900",
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  color: palette.paper,
                }}
              >
                Notifications {unreadCount > 0 && `· ${unreadCount}`}
              </Text>
              {notifications.length > 0 && (
                <TouchableOpacity
                  onPress={markAllRead}
                  accessibilityRole="button"
                  accessibilityLabel="Mark all as read"
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    backgroundColor: palette.paper,
                    borderWidth: BORDER.base,
                    borderColor: palette.ink,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONT.display,
                      fontSize: 10,
                      fontWeight: "900",
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      color: palette.ink,
                    }}
                  >
                    Mark all read
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 480, backgroundColor: c.surface }}>
              {notifications.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 60 }}>
                  <Ionicons name="notifications-off" size={40} color={c.textMuted} />
                  <Text
                    style={{
                      marginTop: 12,
                      fontFamily: FONT.display,
                      fontSize: 11,
                      fontWeight: "900",
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      color: c.textMuted,
                    }}
                  >
                    All caught up
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
  const tintColor = KIND_TINT[n.kind] ?? palette.cobalt500;
  const useLight = DARK_TINTS.has(tintColor);

  const fade = React.useRef(new Animated.Value(n.read ? 0.6 : 1)).current;
  React.useEffect(() => {
    Animated.timing(fade, { toValue: n.read ? 0.65 : 1, duration: 200, useNativeDriver: true }).start();
  }, [n.read, fade]);

  return (
    <Animated.View style={{ opacity: fade }}>
      <TouchableOpacity
        style={{
          flexDirection: "row",
          padding: 14,
          borderBottomWidth: BORDER.base,
          borderBottomColor: palette.ink,
          backgroundColor: n.read ? c.surface : c.surfaceAlt,
        }}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Notification: ${n.title}`}
      >
        <View
          style={{
            width: 40,
            height: 40,
            backgroundColor: tintColor,
            borderWidth: BORDER.base,
            borderColor: palette.ink,
            alignItems: "center",
            justifyContent: "center",
            ...SHADOW_SM,
          }}
        >
          <Ionicons
            name={KIND_ICON[n.kind] ?? "notifications-outline"}
            size={20}
            color={useLight ? palette.paper : palette.ink}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                flex: 1,
                fontFamily: FONT.display,
                fontSize: 13,
                fontWeight: "900",
                color: c.text,
                letterSpacing: 0.3,
              }}
              numberOfLines={1}
            >
              {n.title}
            </Text>
            {!n.read && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: palette.tomato500,
                  borderWidth: 1.5,
                  borderColor: palette.ink,
                  marginLeft: 6,
                }}
              />
            )}
          </View>
          <Text
            style={{ fontFamily: FONT.body, fontSize: 12, color: c.textBody, marginTop: 3 }}
            numberOfLines={2}
          >
            {n.body}
          </Text>
          {n.createdAt && (
            <Text
              style={{
                fontFamily: FONT.mono,
                fontSize: 10,
                color: c.textMuted,
                marginTop: 5,
                letterSpacing: 0.4,
              }}
            >
              {formatTimeAgo(n.createdAt)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
