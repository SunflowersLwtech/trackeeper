import React from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const c = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/*
        Overlay + card are tap targets but MUST NOT be accessibility containers
        themselves — otherwise iOS collapses every descendant into a single
        node ("title, message, Cancel, Confirm") and Maestro/VoiceOver lose
        the ability to focus the individual buttons. Setting accessible={false}
        on both Pressables keeps the dismiss-on-overlay-tap behaviour while
        leaving Confirm and Cancel as the only addressable a11y leaves.
       */}
      <Pressable
        style={[styles.overlay, { backgroundColor: c.overlay }]}
        onPress={onCancel}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        testID="confirm-modal-overlay"
      >
        <Pressable
          style={[styles.card, { backgroundColor: c.surface }]}
          onPress={(e) => e.stopPropagation()}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">{title}</Text>
          <View style={styles.divider} />
          <Text style={[styles.message, { color: c.textBody }]}>{message}</Text>
          <View style={styles.buttons}>
            <Pressable
              style={[styles.btn, { backgroundColor: c.surfaceAlt }]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              testID="confirm-modal-cancel"
            >
              <Text style={[styles.btnText, { color: c.text }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.btn,
                {
                  backgroundColor: destructive ? palette.tomato500 : palette.cobalt500,
                },
              ]}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              testID="confirm-modal-confirm"
            >
              <Text style={[styles.btnText, { color: palette.paper }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    borderWidth: BORDER.heavy,
    borderColor: palette.ink,
    borderRadius: RADIUS.sm,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    ...SHADOW_MD,
  },
  title: {
    fontFamily: FONT.display,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  divider: {
    height: BORDER.base,
    backgroundColor: palette.ink,
    marginBottom: 14,
  },
  message: {
    fontFamily: FONT.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.xs,
    borderWidth: BORDER.base,
    borderColor: palette.ink,
    minWidth: 92,
    alignItems: "center",
    ...SHADOW_SM,
  },
  btnText: {
    fontFamily: FONT.display,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
