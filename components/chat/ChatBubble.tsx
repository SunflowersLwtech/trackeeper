import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Modal,
  Pressable,
  TouchableOpacity,
  Platform,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Message } from "@/types";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";
import { formatTime } from "@/utils/time";
import { MessageStatusIcon } from "./MessageStatusIcon";
import { ImageGallery } from "@/components/ui/ImageGallery";
import { getMessageImages } from "@/utils/images";
import { ALLOWED_REACTIONS, MESSAGE_EDIT_WINDOW_MS, AllowedReaction } from "@/services/messages";

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  showName?: boolean;
  /** Role of the current viewer — managers can delete others' messages. */
  currentUserRole?: "tenant" | "manager" | "maintainer";
  /** Sender names by uid — used to render "X reacted" lists. */
  participantNames?: Record<string, string>;
  /** Triggered by swipe-right or long-press → Reply. */
  onReply?: (message: Message) => void;
  /** Triggered by long-press → Edit. */
  onEdit?: (message: Message) => void;
  /** Triggered by long-press → Delete (after confirm in caller). */
  onDelete?: (message: Message) => void;
  /** Toggle a reaction on this message for the current user. */
  onToggleReaction?: (message: Message, emoji: AllowedReaction) => void;
  /** Show the reaction-people sheet for a given emoji. */
  onShowReactionPeople?: (message: Message, emoji: AllowedReaction) => void;
}

const SWIPE_THRESHOLD = 36; // px to trigger reply
const CHAT_SINGLE_IMAGE_SIZE = 214;
const CHAT_GRID_2_TILE = 104;
const CHAT_GRID_3_TILE = 74;

export const ChatBubble = React.memo(function ChatBubble({
  message,
  isOwn,
  showName = true,
  currentUserRole,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onShowReactionPeople,
}: ChatBubbleProps) {
  const c = useColors();
  const [menuOpen, setMenuOpen] = useState(false);

  const time = message.createdAt?.toDate ? formatTime(message.createdAt.toDate()) : "";
  const isDeleted = !!message.deletedAt;
  const isEdited = !!message.editedAt && !isDeleted;
  const readBy = message.readBy ?? [];
  const isRead = readBy.some((uid) => uid !== message.senderId);
  const images = getMessageImages(message);
  const hasImage = images.length > 0 && !isDeleted;
  const trimmedText = message.text.trim();
  const isPlaceholder = hasImage && trimmedText === "📷";
  const hasText = trimmedText.length > 0 && !isPlaceholder && !isDeleted;
  const gridLayout: "grid-2" | "grid-3" | undefined =
    images.length === 1 ? undefined : images.length <= 4 ? "grid-2" : "grid-3";
  const chatGridTileSize =
    gridLayout === "grid-2" ? CHAT_GRID_2_TILE : CHAT_GRID_3_TILE;

  // Edit window — own + within 15min + not deleted
  const createdMs = message.createdAt?.toMillis ? message.createdAt.toMillis() : 0;
  const canEdit =
    isOwn &&
    !isDeleted &&
    createdMs > 0 &&
    Date.now() - createdMs < MESSAGE_EDIT_WINDOW_MS;
  const canDelete = !isDeleted && (isOwn || currentUserRole === "manager");

  // Swipe-to-reply gesture
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeReplyTriggered = useRef(false);

  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: false },
  );
  const onPanStateChange = (e: { nativeEvent: { state: number; translationX: number } }) => {
    const { state, translationX: tx } = e.nativeEvent;
    if (state === State.ACTIVE && !swipeReplyTriggered.current && tx >= SWIPE_THRESHOLD) {
      swipeReplyTriggered.current = true;
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      onReply?.(message);
    }
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      swipeReplyTriggered.current = false;
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: false,
        speed: 18,
        bounciness: 6,
      }).start();
    }
  };

  // Reaction summary: { emoji: count }
  const reactionEntries: { emoji: AllowedReaction; count: number; mineUid?: string }[] = [];
  if (!isDeleted && message.reactions) {
    for (const e of ALLOWED_REACTIONS) {
      const list = message.reactions[e] ?? [];
      if (list.length > 0) reactionEntries.push({ emoji: e as AllowedReaction, count: list.length });
    }
  }

  const replyTo = message.replyTo;

  const onLongPress = () => setMenuOpen(true);

  return (
    <>
      <PanGestureHandler
        onGestureEvent={onPanEvent}
        onHandlerStateChange={onPanStateChange}
        activeOffsetX={[-30, 12]}
        failOffsetY={[-20, 20]}
        enabled={!!onReply && !isDeleted}
      >
        <Animated.View
          style={[
            styles.wrapper,
            isOwn ? styles.wrapperOwn : styles.wrapperOther,
            { transform: [{ translateX }] },
          ]}
        >
          {!isOwn && showName && !isDeleted ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{message.senderName.charAt(0).toUpperCase()}</Text>
            </View>
          ) : !isOwn ? (
            <View style={styles.avatarSpacer} />
          ) : null}

          <View
            style={[
              styles.bubbleColumn,
              hasImage ? styles.bubbleColumnMedia : null,
              isOwn ? styles.bubbleColumnOwn : styles.bubbleColumnOther,
            ]}
          >
            {!isOwn && showName && !isDeleted && (
              <Text style={styles.senderName}>{message.senderName.toUpperCase()}</Text>
            )}

            <Pressable
              onLongPress={isDeleted ? undefined : onLongPress}
              delayLongPress={300}
              accessibilityRole="button"
              accessibilityLabel="Open message actions"
              testID={`chat-message-${message.id}`}
              style={[
                styles.bubble,
                isDeleted
                  ? { backgroundColor: c.surfaceAlt, borderStyle: "dashed", borderColor: palette.ink400 }
                  : isOwn
                    ? { backgroundColor: palette.cobalt500 }
                    : { backgroundColor: c.surface },
                hasImage && hasText ? styles.bubbleWithImage : null,
                hasImage && !hasText ? styles.bubbleImageOnly : null,
              ]}
            >
              {/* Quoted reply header */}
              {replyTo && !isDeleted && (
                <ReplyQuote replyTo={replyTo} ownBubble={isOwn} />
              )}

              {isDeleted ? (
                <Text style={styles.deletedText}>
                  {message.deletedBy && message.deletedBy !== message.senderId
                    ? "This message was deleted by manager"
                    : "This message was deleted"}
                </Text>
              ) : (
                <>
                  {hasImage && images.length === 1 && (
                    <ImageGallery
                      uris={images}
                      layout="horizontal"
                      thumbSize={CHAT_SINGLE_IMAGE_SIZE}
                      testIDPrefix={`chat-image-${message.id}`}
                    />
                  )}
                  {hasImage && images.length > 1 && (
                    <View style={{ marginBottom: 6 }}>
                      <ImageGallery
                        uris={images}
                        layout={gridLayout!}
                        gridTileSize={chatGridTileSize}
                        maxThumbs={6}
                        testIDPrefix={`chat-image-${message.id}`}
                      />
                    </View>
                  )}
                  {hasText && (
                    <Text
                      style={[
                        styles.messageText,
                        hasImage && styles.messageTextWithImage,
                        { color: isOwn ? palette.paper : c.text },
                      ]}
                    >
                      {message.text}
                      {isEdited && (
                        <Text
                          style={{
                            fontStyle: "italic",
                            fontSize: 11,
                            color: isOwn ? palette.cream100 : palette.ink400,
                          }}
                        >
                          {"  "}(edited)
                        </Text>
                      )}
                    </Text>
                  )}
                </>
              )}
            </Pressable>

            {/* Reactions strip */}
            {reactionEntries.length > 0 && (
              <View style={[styles.reactionRow, isOwn ? { justifyContent: "flex-end" } : null]}>
                {reactionEntries.map((r) => (
                  <Pressable
                    key={r.emoji}
                    onPress={() => onToggleReaction?.(message, r.emoji)}
                    onLongPress={() => onShowReactionPeople?.(message, r.emoji)}
                    style={styles.reactionChip}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.emoji} ${r.count}, tap to toggle`}
                    testID={`chat-reaction-${message.id}-${r.emoji}`}
                  >
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                    <Text style={styles.reactionCount}>{r.count}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={[styles.metaRow, isOwn ? styles.metaRowOwn : styles.metaRowOther]}>
              <Text style={[styles.time, { color: c.textMuted }]}>{time}</Text>
              {isOwn && !isDeleted && (
                <View style={styles.statusIcon}>
                  <MessageStatusIcon read={isRead} />
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </PanGestureHandler>

      {/* Long-press action menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable onPress={() => {}} style={styles.menuCard}>
            {/* Reactions row */}
            <View style={styles.reactionsRow}>
              {ALLOWED_REACTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionPicker}
                  onPress={() => {
                    setMenuOpen(false);
                    onToggleReaction?.(message, emoji as AllowedReaction);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`React with ${emoji}`}
                  testID={`chat-react-${emoji}`}
                >
                  <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.menuDivider} />

            {onReply && (
              <MenuItem
                icon="return-up-back"
                label="Reply"
                onPress={() => {
                  setMenuOpen(false);
                  onReply(message);
                }}
                testID="chat-action-reply"
              />
            )}
            {canEdit && onEdit && (
              <MenuItem
                icon="create"
                label="Edit"
                onPress={() => {
                  setMenuOpen(false);
                  onEdit(message);
                }}
                testID="chat-action-edit"
              />
            )}
            {canDelete && onDelete && (
              <MenuItem
                icon="trash"
                label="Delete"
                destructive
                onPress={() => {
                  setMenuOpen(false);
                  onDelete(message);
                }}
                testID="chat-action-delete"
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

function MenuItem({
  icon,
  label,
  destructive,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  destructive?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <Ionicons name={icon} size={18} color={destructive ? palette.tomato500 : palette.ink} />
      <Text
        style={[
          styles.menuLabel,
          destructive ? { color: palette.tomato500 } : null,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ReplyQuote({
  replyTo,
  ownBubble,
}: {
  replyTo: NonNullable<Message["replyTo"]>;
  ownBubble: boolean;
}) {
  const stripeColor = ownBubble ? palette.paper : palette.cobalt500;
  const textColor = ownBubble ? palette.cream100 : palette.ink600;
  return (
    <View
      style={{
        flexDirection: "row",
        marginBottom: 6,
        paddingLeft: 6,
        paddingVertical: 4,
        borderLeftWidth: 3,
        borderLeftColor: stripeColor,
        backgroundColor: ownBubble ? "rgba(255,254,248,0.12)" : palette.cream100,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: FONT.display,
            fontSize: 9,
            fontWeight: "900",
            color: textColor,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
          numberOfLines={1}
        >
          ◼ Reply
        </Text>
        <Text
          style={{
            fontFamily: FONT.body,
            fontSize: 12,
            color: textColor,
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {replyTo.type === "image" ? "📷 Photo" : replyTo.textPreview || "Original message deleted"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  wrapperOwn: {
    justifyContent: "flex-end",
  },
  wrapperOther: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    backgroundColor: palette.mustard500,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 18,
  },
  avatarText: {
    fontFamily: FONT.display,
    fontSize: 13,
    fontWeight: "900",
    color: palette.ink,
  },
  avatarSpacer: {
    width: 40,
  },
  bubbleColumn: {
    maxWidth: "78%",
  },
  bubbleColumnMedia: {
    maxWidth: "86%",
  },
  bubbleColumnOwn: {
    alignItems: "flex-end",
  },
  bubbleColumnOther: {
    alignItems: "flex-start",
  },
  senderName: {
    fontFamily: FONT.display,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: palette.ink,
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.xs,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    overflow: "hidden",
    ...SHADOW_SM,
  },
  bubbleWithImage: {
    paddingTop: 6,
    paddingHorizontal: 6,
    paddingBottom: 10,
  },
  bubbleImageOnly: {
    padding: 6,
  },
  messageText: {
    fontFamily: FONT.body,
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextWithImage: {
    paddingHorizontal: 8,
  },
  deletedText: {
    fontFamily: FONT.body,
    fontStyle: "italic",
    fontSize: 13,
    color: palette.ink500,
  },
  reactionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    marginHorizontal: 2,
    gap: 4,
  },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: palette.ink,
    backgroundColor: palette.paper,
    borderRadius: 12,
  },
  reactionEmoji: {
    fontSize: 13,
    marginRight: 3,
  },
  reactionCount: {
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: "700",
    color: palette.ink,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metaRowOwn: {
    marginRight: 4,
    justifyContent: "flex-end",
  },
  metaRowOther: {
    marginLeft: 4,
    justifyContent: "flex-start",
  },
  time: {
    fontFamily: FONT.mono,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  statusIcon: {
    marginLeft: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  // Long-press menu
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10,10,10,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  menuCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: palette.paper,
    borderWidth: BORDER.heavy,
    borderColor: palette.ink,
    ...SHADOW_MD,
    paddingVertical: 8,
  },
  reactionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reactionPicker: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  reactionPickerEmoji: {
    fontSize: 24,
  },
  menuDivider: {
    height: BORDER.base,
    backgroundColor: palette.ink,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuLabel: {
    fontFamily: FONT.display,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: palette.ink,
  },
});
