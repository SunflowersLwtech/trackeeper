import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { withOpacity } from "@/utils/color";
import { PaymentMethod } from "@/types";

interface PaymentDialogProps {
  visible: boolean;
  amount: number;
  payeeName: string;
  payeeRole?: string;
  jobTitle: string;
  onClose: () => void;
  onPay: (method: PaymentMethod) => Promise<void>;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  card: "Card",
};

const METHOD_ICONS: Record<PaymentMethod, keyof typeof Ionicons.glyphMap> = {
  bank_transfer: "business-outline",
  cash: "cash-outline",
  card: "card-outline",
};

export function PaymentDialog({
  visible,
  amount,
  payeeName,
  payeeRole = "Maintainer",
  jobTitle,
  onClose,
  onPay,
}: PaymentDialogProps) {
  const c = useColors();
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const successAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (success) {
      Animated.timing(successAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
    } else {
      successAnim.setValue(0);
    }
  }, [success, successAnim]);

  const handlePay = async () => {
    setPaying(true);
    try {
      await onPay(method);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1300);
    } catch {
      // Error toast emitted by caller
    } finally {
      setPaying(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={{
            width: "100%",
            maxWidth: 380,
            backgroundColor: c.background,
            borderRadius: 20,
            overflow: "hidden",
            shadowColor: c.text,
            shadowOpacity: 0.3,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 12,
          }}
        >
          {success ? (
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <Animated.View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: withOpacity(c.success, 0.18),
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ scale: successAnim }],
                }}
              >
                <Ionicons name="checkmark" size={42} color={c.success} />
              </Animated.View>
              <Text style={{ marginTop: 18, fontSize: 18, fontWeight: "800", color: c.text }}>
                Payment sent
              </Text>
              <Text style={{ marginTop: 6, fontSize: 13, color: c.textTertiary }}>
                RM {amount.toFixed(2)} to {payeeName}
              </Text>
            </View>
          ) : (
            <>
              {/* Card-style header */}
              <View
                style={{
                  backgroundColor: c.primary,
                  paddingHorizontal: 22,
                  paddingTop: 22,
                  paddingBottom: 26,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <View style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: withOpacity(c.background, 0.08) }} />
                <View style={{ position: "absolute", left: -10, bottom: -10, width: 80, height: 80, borderRadius: 40, backgroundColor: withOpacity(c.background, 0.06) }} />

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="card-outline" size={18} color={c.background} />
                    <Text style={{ marginLeft: 6, fontSize: 11, fontWeight: "700", color: c.background, letterSpacing: 0.5 }}>
                      TRACKEEPER PAY
                    </Text>
                  </View>
                  <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close payment dialog">
                    <Ionicons name="close" size={20} color={c.background} />
                  </TouchableOpacity>
                </View>
                <Text style={{ marginTop: 18, fontSize: 12, color: withOpacity(c.background, 0.85) }}>
                  Amount due
                </Text>
                <Text style={{ fontSize: 36, fontWeight: "900", color: c.background, marginTop: 2, letterSpacing: -1 }}>
                  RM {amount.toFixed(2)}
                </Text>
                <Text style={{ marginTop: 8, fontSize: 11, color: withOpacity(c.background, 0.85) }} numberOfLines={1}>
                  For: {jobTitle}
                </Text>
              </View>

              <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
                {/* Payee row */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: c.surface,
                    marginBottom: 14,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: withOpacity(c.primary, 0.14),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "800", color: c.primary }}>
                      {payeeName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }}>{payeeName}</Text>
                    <Text style={{ fontSize: 11, color: c.textTertiary, marginTop: 2 }}>{payeeRole}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={c.textTertiary} />
                </View>

                {/* Method picker */}
                <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 8 }}>
                  Payment method
                </Text>
                <View style={{ flexDirection: "row", marginBottom: 16 }}>
                  {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => {
                    const selected = m === method;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 8,
                          marginRight: m === "card" ? 0 : 8,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: selected ? c.primary : c.border,
                          backgroundColor: selected ? withOpacity(c.primary, 0.08) : c.background,
                          alignItems: "center",
                        }}
                        onPress={() => setMethod(m)}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${METHOD_LABELS[m]}`}
                        accessibilityState={{ selected }}
                        testID={`payment-method-${m}`}
                      >
                        <Ionicons name={METHOD_ICONS[m]} size={20} color={selected ? c.primary : c.textTertiary} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: selected ? "700" : "500",
                            color: selected ? c.primary : c.textTertiary,
                            marginTop: 4,
                          }}
                        >
                          {METHOD_LABELS[m]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Pay button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: paying ? c.primaryLight : c.primary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                  onPress={handlePay}
                  disabled={paying}
                  accessibilityRole="button"
                  accessibilityLabel={`Pay RM ${amount.toFixed(2)}`}
                  testID="payment-pay-button"
                >
                  {paying ? (
                    <ActivityIndicator color={c.background} />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="lock-closed" size={14} color={c.background} />
                      <Text style={{ marginLeft: 6, color: c.background, fontSize: 14, fontWeight: "800" }}>
                        Pay RM {amount.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={{ marginTop: 10, fontSize: 10, color: c.textMuted, textAlign: "center" }}>
                  This is a sandbox payment for demonstration only — no real money is moved.
                </Text>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
