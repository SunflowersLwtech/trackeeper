import React, { useEffect, useRef } from "react";
import {
  View,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { BORDER } from "@/constants/Brutalism";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Fraction of screen height (0-1). Default 0.5 */
  heightFraction?: number;
  children: React.ReactNode;
}

/**
 * Brutalist bottom sheet — hard ink top border, no rounding,
 * chunky drag handle that feels like a tab pull.
 */
export function BottomSheet({
  visible,
  onClose,
  heightFraction = 0.5,
  children,
}: BottomSheetProps) {
  const c = useColors();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  if (!visible) return null;

  const sheetHeight = SCREEN_HEIGHT * heightFraction;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropAnim, backgroundColor: c.overlay },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              backgroundColor: c.surface,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Brutalist drag handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>
          <View style={{ flex: 1 }}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopWidth: BORDER.heavy,
    borderLeftWidth: BORDER.base,
    borderRightWidth: BORDER.base,
    borderColor: palette.ink,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 56,
    height: 6,
    backgroundColor: palette.ink,
  },
});
