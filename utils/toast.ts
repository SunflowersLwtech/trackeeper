import Toast from "react-native-toast-message";

export function showSuccess(titleOrMessage: string, message?: string): void {
  Toast.show({
    type: "success",
    text1: message ? titleOrMessage : "Success",
    text2: message ?? titleOrMessage,
    visibilityTime: 2200,
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

export function showInfo(titleOrMessage: string, message?: string): void {
  Toast.show({
    type: "info",
    text1: message ? titleOrMessage : "Info",
    text2: message ?? titleOrMessage,
    visibilityTime: 3000,
    topOffset: 60,
  });
}
