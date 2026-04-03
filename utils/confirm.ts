import { Alert, Platform } from "react-native";

/**
 * Cross-platform confirmation dialog.
 * Uses native Alert on iOS/Android, window.confirm on web.
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  options?: { destructive?: boolean },
): void {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        style: options?.destructive ? "destructive" : "default",
        onPress: onConfirm,
      },
    ]);
  }
}

/**
 * Cross-platform alert (info only, no confirmation needed).
 * Uses native Alert on iOS/Android, window.alert on web.
 */
export function alertMessage(title: string, message: string): void {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}
