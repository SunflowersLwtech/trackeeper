import React from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

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
      <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onCancel}>
        <Pressable style={[styles.card, { backgroundColor: c.background }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          <Text style={[styles.message, { color: c.textTertiary }]}>{message}</Text>
          <View style={styles.buttons}>
            <Pressable
              style={[styles.btn, { backgroundColor: c.surfaceAlt }]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={[styles.cancelText, { color: c.textSecondary }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.btn,
                { backgroundColor: destructive ? c.error : c.primary },
              ]}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text style={[styles.confirmText, { color: c.background }]}>{confirmLabel}</Text>
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
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 8,
  },
  message: {
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 80,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "500",
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
