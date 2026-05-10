import { View, Text, StyleSheet } from "react-native";
import { BaseToastProps } from "react-native-toast-message";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD } from "@/constants/Brutalism";

const styles = StyleSheet.create({
  toast: {
    alignSelf: "center",
    width: "92%",
    maxWidth: 560,
  backgroundColor: palette.paper,
  borderTopWidth: BORDER.base,
  borderRightWidth: BORDER.base,
  borderBottomWidth: BORDER.base,
  borderLeftWidth: 8,
  borderColor: palette.ink,
  borderRadius: RADIUS.sm,
  marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  ...SHADOW_MD,
  },
  text1: {
  fontFamily: FONT.display,
  fontSize: 13,
  fontWeight: "900" as const,
  letterSpacing: 0.4,
  textTransform: "uppercase" as const,
  color: palette.ink,
  },
  text2: {
  fontFamily: FONT.body,
  fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  color: palette.ink,
  },
});

function ToastCard({ props, accent }: { props: BaseToastProps; accent: string }) {
  return (
    <View
      accessibilityRole="alert"
      style={[styles.toast, { borderLeftColor: accent }]}
    >
      {props.text1 ? <Text style={styles.text1}>{props.text1}</Text> : null}
      {props.text2 ? <Text style={styles.text2}>{props.text2}</Text> : null}
    </View>
  );
}

const toastConfig = {
  success: (props: BaseToastProps) => <ToastCard props={props} accent={palette.lime500} />,
  error: (props: BaseToastProps) => <ToastCard props={props} accent={palette.tomato500} />,
  info: (props: BaseToastProps) => <ToastCard props={props} accent={palette.cobalt500} />,
};

export { toastConfig };
