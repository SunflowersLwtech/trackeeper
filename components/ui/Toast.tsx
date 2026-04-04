import { BaseToast, ErrorToast, BaseToastProps } from "react-native-toast-message";
import Colors, { palette } from "@/constants/Colors";

const toastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: palette.green500,
        backgroundColor: Colors.light.successBg,
        borderLeftWidth: 4,
        borderRadius: 12,
        marginHorizontal: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: 14,
        fontWeight: "600",
        color: Colors.light.successTextDark,
      }}
      text2Style={{
        fontSize: 13,
        color: Colors.light.successTextMedium,
      }}
    />
  ),
  error: (props: BaseToastProps) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: palette.red500,
        backgroundColor: Colors.light.errorBg,
        borderLeftWidth: 4,
        borderRadius: 12,
        marginHorizontal: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: 14,
        fontWeight: "600",
        color: Colors.light.errorTextDark,
      }}
      text2Style={{
        fontSize: 13,
        color: Colors.light.errorTextMedium,
      }}
    />
  ),
  info: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: palette.blue500,
        backgroundColor: Colors.light.primaryBg,
        borderLeftWidth: 4,
        borderRadius: 12,
        marginHorizontal: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: 14,
        fontWeight: "600",
        color: Colors.light.primaryDark,
      }}
      text2Style={{
        fontSize: 13,
        color: Colors.light.primaryDark,
      }}
    />
  ),
};

export { toastConfig };
