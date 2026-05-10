import Toast from "react-native-toast-message";

function visibilityTime(text: string, base: number): number {
  if (text.length <= 90) return base;
  return Math.min(8000, Math.max(base, 2400 + text.length * 35));
}

export function showSuccess(titleOrMessage: string, message?: string): void {
  const body = message ?? titleOrMessage;
  Toast.show({
    type: "success",
    text1: message ? titleOrMessage : "Success",
    text2: body,
    visibilityTime: visibilityTime(body, 2200),
    topOffset: 60,
  });
}

export function showError(title: string, message?: string): void {
  const body = message ?? "";
  Toast.show({
    type: "error",
    text1: title,
    text2: message,
    visibilityTime: visibilityTime(body, 4000),
    topOffset: 60,
  });
}

export function showInfo(titleOrMessage: string, message?: string): void {
  const body = message ?? titleOrMessage;
  Toast.show({
    type: "info",
    text1: message ? titleOrMessage : "Info",
    text2: body,
    visibilityTime: visibilityTime(body, 3000),
    topOffset: 60,
  });
}
