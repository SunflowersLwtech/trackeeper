import React, { useState } from "react";
import { Modal, Platform, Pressable, View, Text, TouchableOpacity, GestureResponderEvent } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";

interface DateTimePickerSheetProps {
  visible: boolean;
  /** Initial datetime — defaults to "now + 1h" so the future-only check passes. */
  initial?: Date;
  /** Min selectable date (defaults to now). */
  minimumDate?: Date;
  title?: string;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  testID?: string;
}

/**
 * Cross-platform datetime picker presented as a confirmation sheet.
 *
 * - iOS: native spinner (date + time) inside the sheet.
 * - Android: native dialog flow (date → time) launched on open.
 * - Web: HTML datetime-local input (datetimepicker has no web target).
 */
export function DateTimePickerSheet({
  visible,
  initial,
  minimumDate,
  title = "Pick a date and time",
  onClose,
  onConfirm,
  testID,
}: DateTimePickerSheetProps) {
  const defaultDate = coerceFutureDate(initial, minimumDate);
  const [picked, setPicked] = useState<Date>(defaultDate);
  const [androidStep, setAndroidStep] = useState<"date" | "time" | "done">("date");

  React.useEffect(() => {
    if (visible) {
      setPicked(coerceFutureDate(initial, minimumDate));
      setAndroidStep("date");
    }
  }, [visible, initial, minimumDate]);

  if (!visible) return null;

  const onAndroidChange = (event: DateTimePickerEvent, value?: Date) => {
    if (event.type === "dismissed") {
      onClose();
      return;
    }
    if (!value) return;
    if (androidStep === "date") {
      // Preserve hours/minutes from current picked value.
      const next = new Date(value);
      next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      setPicked(next);
      setAndroidStep("time");
    } else if (androidStep === "time") {
      const next = new Date(picked);
      next.setHours(value.getHours(), value.getMinutes(), 0, 0);
      setPicked(next);
      setAndroidStep("done");
      onConfirm(next);
      onClose();
    }
  };

  // Web — render a native datetime-local input inside a modal sheet.
  if (Platform.OS === "web") {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(10,10,10,0.5)", alignItems: "center", justifyContent: "center", padding: 24 }}
          onPress={onClose}
        >
          <Pressable
            style={{
              width: "100%",
              maxWidth: 380,
              backgroundColor: palette.paper,
              borderWidth: BORDER.heavy,
              borderColor: palette.ink,
              padding: 22,
              ...SHADOW_MD,
          }}
            onPress={stopPressPropagation}
            testID={testID}
          >
            <Text style={titleStyle}>{title.toUpperCase()}</Text>
            <View style={{ height: BORDER.base, backgroundColor: palette.cobalt500, width: 40, marginVertical: 10 }} />
            {React.createElement("input", {
              type: "datetime-local",
              value: toLocalInputValue(picked),
              min: minimumDate ? toLocalInputValue(minimumDate) : undefined,
              "data-testid": testID ? `${testID}-input` : "datetime-picker-input",
              onChange: (e: { target: { value: string } }) => {
                const v = e.target.value;
                if (v) setPicked(new Date(v));
              },
              style: {
                fontFamily: "Inter Tight, sans-serif",
                fontSize: 16,
                padding: 12,
                border: `2px solid ${palette.ink}`,
                width: "100%",
                background: palette.cream100,
                marginTop: 4,
              },
            })}
            <FooterButtons
              onCancel={onClose}
              onConfirm={() => { onConfirm(picked); onClose(); }}
              testID={testID}
            />
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  // Android — sequential native dialogs (date then time).
  if (Platform.OS === "android") {
    if (androidStep === "done") return null;
    return (
      <DateTimePicker
        testID={testID}
        value={picked}
        mode={androidStep === "date" ? "date" : "time"}
        is24Hour
        minimumDate={androidStep === "date" ? minimumDate : undefined}
        onChange={onAndroidChange}
      />
    );
  }

  // iOS — inline calendar/time picker keeps the native control readable in Expo Go.
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(10,10,10,0.5)" }} onPress={onClose}>
        <Pressable
          style={{
            marginTop: "auto",
            backgroundColor: palette.paper,
            borderTopWidth: BORDER.heavy,
            borderColor: palette.ink,
            padding: 16,
          }}
          onPress={stopPressPropagation}
          testID={testID}
        >
          <Text style={titleStyle}>{title.toUpperCase()}</Text>
          <View style={{ height: BORDER.base, backgroundColor: palette.cobalt500, width: 40, marginVertical: 10 }} />
          <DateTimePicker
            value={picked}
            mode="datetime"
            display="inline"
            minimumDate={minimumDate}
            onChange={(_, value) => value && setPicked(value)}
            themeVariant="light"
            textColor={palette.ink}
            style={{ width: "100%", minHeight: 340 }}
          />
          <FooterButtons
            onCancel={onClose}
            onConfirm={() => { onConfirm(picked); onClose(); }}
            testID={testID}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function coerceFutureDate(initial?: Date, minimumDate?: Date): Date {
  const min = minimumDate ?? new Date();
  const fallback = new Date(min.getTime() + 60 * 60 * 1000);
  if (!initial || Number.isNaN(initial.getTime())) return fallback;
  return initial.getTime() >= min.getTime() ? initial : fallback;
}

function stopPressPropagation(event: GestureResponderEvent) {
  event.stopPropagation();
}

function FooterButtons({
  onCancel,
  onConfirm,
  testID,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  testID?: string;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 16, gap: 10 }}>
      <TouchableOpacity
        style={{
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderWidth: BORDER.base,
          borderColor: palette.ink,
          backgroundColor: palette.paper,
          ...SHADOW_SM,
        }}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        testID={testID ? `${testID}-cancel` : undefined}
      >
        <Text style={btnTextStyle}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          paddingHorizontal: 18,
          paddingVertical: 12,
          backgroundColor: palette.cobalt500,
          borderWidth: BORDER.base,
          borderColor: palette.ink,
          ...SHADOW_SM,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
        onPress={onConfirm}
        accessibilityRole="button"
        accessibilityLabel="Confirm"
        testID={testID ? `${testID}-confirm` : undefined}
      >
        <Ionicons name="checkmark" size={14} color={palette.paper} />
        <Text style={[btnTextStyle, { color: palette.paper }]}>Confirm</Text>
      </TouchableOpacity>
    </View>
  );
}

const titleStyle = {
  fontFamily: FONT.display,
  fontSize: 16,
  fontWeight: "900" as const,
  color: palette.ink,
  letterSpacing: 0.4,
  textTransform: "uppercase" as const,
};

const btnTextStyle = {
  fontFamily: FONT.display,
  fontSize: 12,
  fontWeight: "900" as const,
  letterSpacing: 0.6,
  color: palette.ink,
  textTransform: "uppercase" as const,
};
