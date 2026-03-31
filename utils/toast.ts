import Toast from "react-native-toast-message";

export function showSuccess(message: string): void {
  Toast.show({
    type: "success",
    text1: "Success",
    text2: message,
    visibilityTime: 2000,
    topOffset: 60,
  });
}

export function showError(title: string, message?: string): void {
  Toast.show({
    type: "error",
    text1: title,
    text2: message,
    visibilityTime: 4000,
    topOffset: 60,
  });
}

export function showInfo(message: string): void {
  Toast.show({
    type: "info",
    text1: message,
    visibilityTime: 3000,
    topOffset: 60,
  });
}
