import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  GestureResponderEvent,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { palette } from "@/constants/Colors";
import { FONT, BORDER, RADIUS, SHADOW_MD, SHADOW_SM } from "@/constants/Brutalism";
import { PaymentMethod, RequestPayment } from "@/types";
import { formatLongDate } from "@/utils/time";

export type PaymentAction = "pay" | "mark_pending";

interface PaymentDialogProps {
  visible: boolean;
  amount: number;
  payeeName: string;
  payeeRole?: string;
  jobTitle: string;
  /** Current payment record — drives read-only / pending / fresh modes. */
  payment?: RequestPayment | null;
  onClose: () => void;
  /** Called with the selected action + method. Caller routes to the right backend fn. */
  onSubmit: (action: PaymentAction, method: PaymentMethod) => Promise<void>;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Bank",
  cash: "Cash",
  card: "Card",
};

const METHOD_ICONS: Record<PaymentMethod, keyof typeof Ionicons.glyphMap> = {
  bank_transfer: "business",
  cash: "cash",
  card: "card",
};

function stopPressPropagation(event: GestureResponderEvent) {
  event.stopPropagation();
}

export function PaymentDialog({
  visible,
  amount,
  payeeName,
  payeeRole = "Maintainer",
  jobTitle,
  payment,
  onClose,
  onSubmit,
}: PaymentDialogProps) {
  const c = useColors();
  const isPending = payment?.status === "pending";
  const isRefunded = payment?.status === "refunded";
  const [method, setMethod] = useState<PaymentMethod>(
    payment?.method ?? "bank_transfer",
  );
  // Mode toggle only meaningful when there is no pending record yet.
  const [mode, setMode] = useState<PaymentAction>("pay");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<null | "paid" | "pending">(null);
  const successAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (success) {
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }).start();
    } else {
      successAnim.setValue(0);
    }
  }, [success, successAnim]);

  const handleAction = async (action: PaymentAction) => {
    setSubmitting(true);
    try {
      await onSubmit(action, method);
      setSuccess(action === "pay" ? "paid" : "pending");
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1300);
    } catch {
      // Error toast emitted by caller
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: c.overlay,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={stopPressPropagation}
          testID="payment-dialog"
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: c.surface,
            borderRadius: RADIUS.sm,
            borderWidth: BORDER.heavy,
            borderColor: palette.ink,
            overflow: "hidden",
            ...SHADOW_MD,
          }}
        >
          {success ? (
            <View style={{ alignItems: "center", paddingVertical: 56, paddingHorizontal: 24 }}>
              <Animated.View
                style={{
                  width: 88,
                  height: 88,
                  backgroundColor: success === "paid" ? palette.lime500 : palette.mustard500,
                  borderWidth: BORDER.heavy,
                  borderColor: palette.ink,
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ scale: successAnim }],
                  ...SHADOW_MD,
                }}
              >
                <Ionicons
                  name={success === "paid" ? "checkmark" : "hourglass"}
                  size={48}
                  color={palette.ink}
                />
              </Animated.View>
              <Text
                style={{
                  marginTop: 22,
                  fontFamily: FONT.display,
                  fontSize: 22,
                  fontWeight: "900",
                  letterSpacing: -0.4,
                  color: c.text,
                  textTransform: "uppercase",
                }}
              >
                {success === "paid" ? "Payment Sent" : "Marked Pending"}
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  fontFamily: FONT.mono,
                  fontSize: 13,
                  color: c.textBody,
                  letterSpacing: 0.3,
                  textAlign: "center",
                }}
              >
                {success === "paid"
                  ? `RM ${amount.toFixed(2)} → ${payeeName}`
                  : "Confirm in your bank app once received"}
              </Text>
            </View>
          ) : isRefunded ? (
            // Read-only refunded view
            <RefundedView
              amount={amount}
              payment={payment!}
              payeeName={payeeName}
              onClose={onClose}
            />
          ) : (
            <>
              {/* Brutalist receipt header */}
              <View
                style={{
                  backgroundColor: isPending ? palette.mustard500 : palette.cobalt500,
                  paddingHorizontal: 22,
                  paddingTop: 22,
                  paddingBottom: 24,
                  borderBottomWidth: BORDER.heavy,
                  borderBottomColor: palette.ink,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      backgroundColor: palette.paper,
                      borderWidth: BORDER.base,
                      borderColor: palette.ink,
                    }}
                  >
                    <Ionicons name={isPending ? "hourglass" : "card"} size={14} color={palette.ink} />
                    <Text
                      style={{
                        marginLeft: 6,
                        fontFamily: FONT.display,
                        fontSize: 10,
                        fontWeight: "900",
                        color: palette.ink,
                        letterSpacing: 0.8,
                      }}
                    >
                      {isPending ? "TRACKEEPER · PENDING" : "TRACKEEPER · PAY"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    style={{
                      width: 30,
                      height: 30,
                      backgroundColor: palette.tomato500,
                      borderWidth: BORDER.base,
                      borderColor: palette.ink,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Close payment dialog"
                  >
                    <Ionicons name="close" size={18} color={palette.paper} />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    marginTop: 22,
                    fontFamily: FONT.display,
                    fontSize: 11,
                    fontWeight: "900",
                    color: isPending ? palette.ink : palette.paper,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  {isPending ? "Pending Confirmation" : "Amount Due"}
                </Text>
                <Text
                  style={{
                    fontFamily: FONT.display,
                    fontSize: 44,
                    fontWeight: "900",
                    color: isPending ? palette.ink : palette.paper,
                    marginTop: 2,
                    letterSpacing: -2,
                  }}
                >
                  RM {amount.toFixed(2)}
                </Text>
                <Text
                  style={{
                    marginTop: 8,
                    fontFamily: FONT.mono,
                    fontSize: 11,
                    color: isPending ? palette.ink : palette.paper,
                    letterSpacing: 0.4,
                  }}
                  numberOfLines={1}
                >
                  ◼ {jobTitle}
                </Text>
              </View>

              <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18 }}>
                {/* Payee row */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderWidth: BORDER.base,
                    borderColor: palette.ink,
                    backgroundColor: c.surfaceAlt,
                    marginBottom: 16,
                    ...SHADOW_SM,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      backgroundColor: palette.mustard500,
                      borderWidth: BORDER.base,
                      borderColor: palette.ink,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONT.display,
                        fontSize: 14,
                        fontWeight: "900",
                        color: palette.ink,
                      }}
                    >
                      {payeeName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={{
                        fontFamily: FONT.display,
                        fontSize: 14,
                        fontWeight: "900",
                        color: c.text,
                        letterSpacing: 0.2,
                      }}
                    >
                      {payeeName}
                    </Text>
                    <Text
                      style={{
                        fontFamily: FONT.mono,
                        fontSize: 11,
                        color: c.textBody,
                        marginTop: 2,
                        letterSpacing: 0.3,
                      }}
                    >
                      {payeeRole.toUpperCase()}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={palette.ink} />
                </View>

                {!isPending && (
                  <>
                    <Text
                      style={{
                        fontFamily: FONT.display,
                        fontSize: 11,
                        fontWeight: "900",
                        color: c.text,
                        letterSpacing: 0.8,
                        textTransform: "uppercase",
                        marginBottom: 10,
                      }}
                    >
                      ◼ Payment method
                    </Text>
                    <View style={{ flexDirection: "row", marginBottom: 16, gap: 8 }}>
                      {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => {
                        const selected = m === method;
                        return (
                          <TouchableOpacity
                            key={m}
                            style={{
                              flex: 1,
                              paddingVertical: 12,
                              paddingHorizontal: 8,
                              borderRadius: RADIUS.xs,
                              borderWidth: BORDER.base,
                              borderColor: palette.ink,
                              backgroundColor: selected ? palette.cobalt500 : c.surface,
                              alignItems: "center",
                              ...(selected ? SHADOW_SM : {}),
                            }}
                            onPress={() => setMethod(m)}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${METHOD_LABELS[m]}`}
                            accessibilityState={{ selected }}
                            testID={`payment-method-${m}`}
                          >
                            <Ionicons
                              name={METHOD_ICONS[m]}
                              size={22}
                              color={selected ? palette.paper : palette.ink}
                            />
                            <Text
                              style={{
                                fontFamily: FONT.display,
                                fontSize: 11,
                                fontWeight: "900",
                                color: selected ? palette.paper : palette.ink,
                                marginTop: 6,
                                letterSpacing: 0.4,
                                textTransform: "uppercase",
                              }}
                            >
                              {METHOD_LABELS[m]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Mode segmented control — Pay now vs Mark initiated */}
                    <Text
                      style={{
                        fontFamily: FONT.display,
                        fontSize: 11,
                        fontWeight: "900",
                        color: c.text,
                        letterSpacing: 0.8,
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      ◼ Action
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        borderWidth: BORDER.base,
                        borderColor: palette.ink,
                        marginBottom: 18,
                        ...SHADOW_SM,
                      }}
                    >
                      <ModeButton
                        label="Pay now"
                        active={mode === "pay"}
                        onPress={() => setMode("pay")}
                        testID="payment-mode-now"
                        activeColor={palette.lime500}
                      />
                      <View style={{ width: BORDER.base, backgroundColor: palette.ink }} />
                      <ModeButton
                        label="Mark initiated"
                        active={mode === "mark_pending"}
                        onPress={() => setMode("mark_pending")}
                        testID="payment-mode-pending"
                        activeColor={palette.mustard500}
                      />
                    </View>
                  </>
                )}

                {/* Pending banner */}
                {isPending && payment?.paidAt ? (
                  <View
                    style={{
                      padding: 12,
                      borderWidth: BORDER.base,
                      borderColor: palette.ink,
                      backgroundColor: palette.mustard50,
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: palette.ink, letterSpacing: 0.6, textTransform: "uppercase" }}>
                      ◼ Initiated {formatLongDate(payment.paidAt)}
                    </Text>
                    <Text style={{ marginTop: 4, fontFamily: FONT.body, fontSize: 12, color: palette.ink600, lineHeight: 16 }}>
                      Confirm once funds reach the maintainer.
                    </Text>
                  </View>
                ) : null}

                {/* Action button */}
                <TouchableOpacity
                  style={{
                    backgroundColor:
                      submitting
                        ? palette.cobalt300
                        : isPending
                          ? palette.lime500
                          : mode === "pay"
                            ? palette.lime500
                            : palette.mustard500,
                    borderWidth: BORDER.heavy,
                    borderColor: palette.ink,
                    paddingVertical: 16,
                    alignItems: "center",
                    ...SHADOW_MD,
                  }}
                  onPress={() => handleAction(isPending ? "pay" : mode)}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPending
                      ? "Confirm payment received"
                      : mode === "pay"
                        ? `Pay RM ${amount.toFixed(2)}`
                        : "Mark payment as initiated"
                  }
                  testID={isPending ? "payment-confirm-pending" : "payment-pay-button"}
                >
                  {submitting ? (
                    <ActivityIndicator color={palette.ink} />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons
                        name={isPending ? "checkmark-circle" : mode === "pay" ? "lock-closed" : "hourglass"}
                        size={16}
                        color={palette.ink}
                      />
                      <Text
                        style={{
                          marginLeft: 8,
                          color: palette.ink,
                          fontFamily: FONT.display,
                          fontSize: 14,
                          fontWeight: "900",
                          letterSpacing: 0.8,
                          textTransform: "uppercase",
                        }}
                      >
                        {isPending
                          ? "Confirm payment received"
                          : mode === "pay"
                            ? `Pay RM ${amount.toFixed(2)}`
                            : "Mark as initiated"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text
                  style={{
                    marginTop: 12,
                    fontFamily: FONT.mono,
                    fontSize: 10,
                    color: c.textMuted,
                    textAlign: "center",
                    letterSpacing: 0.3,
                  }}
                >
                  Sandbox payment — no real money moved.
                </Text>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ModeButton({
  label,
  active,
  onPress,
  testID,
  activeColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
  activeColor: string;
}) {
  return (
    <TouchableOpacity
      style={{
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        backgroundColor: active ? activeColor : palette.paper,
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      testID={testID}
    >
      <Text
        style={{
          fontFamily: FONT.display,
          fontSize: 12,
          fontWeight: "900",
          color: palette.ink,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function RefundedView({
  amount,
  payment,
  payeeName,
  onClose,
}: {
  amount: number;
  payment: RequestPayment;
  payeeName: string;
  onClose: () => void;
}) {
  const c = useColors();
  return (
    <>
      <View
        style={{
          backgroundColor: c.surfaceAlt,
          paddingHorizontal: 22,
          paddingTop: 22,
          paddingBottom: 22,
          borderBottomWidth: BORDER.heavy,
          borderBottomColor: palette.ink,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: palette.ink400,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
            }}
          >
            <Ionicons name="arrow-undo" size={14} color={palette.paper} />
            <Text style={{ marginLeft: 6, fontFamily: FONT.display, fontSize: 10, fontWeight: "900", color: palette.paper, letterSpacing: 0.8 }}>
              REFUNDED
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 30,
              height: 30,
              backgroundColor: palette.ink,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={18} color={palette.paper} />
          </TouchableOpacity>
        </View>
        <Text
          style={{
            marginTop: 22,
            fontFamily: FONT.display,
            fontSize: 11,
            fontWeight: "900",
            color: palette.ink500,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          Reversed amount
        </Text>
        <Text
          style={{
            fontFamily: FONT.display,
            fontSize: 44,
            fontWeight: "900",
            color: palette.ink500,
            marginTop: 2,
            letterSpacing: -2,
            textDecorationLine: "line-through",
          }}
        >
          RM {amount.toFixed(2)}
        </Text>
        <Text style={{ marginTop: 8, fontFamily: FONT.mono, fontSize: 11, color: palette.ink500, letterSpacing: 0.4 }}>
          Originally paid to {payeeName}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingVertical: 18 }}>
        <Text
          style={{
            fontFamily: FONT.display,
            fontSize: 11,
            fontWeight: "900",
            color: palette.ink,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          ◼ Refund details
        </Text>
        <DetailRow label="Date" value={formatLongDate(payment.refundedAt)} />
        <DetailRow label="By" value={payment.refundedByName ?? "—"} />
        {payment.reference ? <DetailRow label="Ref" value={payment.reference} /> : null}
        {payment.refundReason ? (
          <View
            style={{
              marginTop: 10,
              padding: 12,
              borderWidth: BORDER.base,
              borderColor: palette.ink,
              backgroundColor: palette.cream100,
            }}
          >
            <Text style={{ fontFamily: FONT.display, fontSize: 10, fontWeight: "900", color: palette.ink, letterSpacing: 0.6, textTransform: "uppercase" }}>
              Reason
            </Text>
            <Text style={{ marginTop: 4, fontFamily: FONT.body, fontSize: 13, color: palette.ink, lineHeight: 18 }}>
              {payment.refundReason}
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: "900", color: palette.ink500, letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: palette.ink, fontWeight: "700" }}>
        {value}
      </Text>
    </View>
  );
}
