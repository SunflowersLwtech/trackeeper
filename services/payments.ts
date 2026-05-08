import {
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { PaymentMethod, RequestCost, RequestPayment } from "@/types";
import { createNotification } from "@/services/notifications";

const REQUESTS_COLLECTION = "requests";

/** Compute the breakdown total. */
export function computeCostTotal(
  laborHours: number,
  hourlyRate: number,
  materialCost: number,
): number {
  const subtotal = Math.max(0, laborHours) * Math.max(0, hourlyRate);
  return Math.round((subtotal + Math.max(0, materialCost)) * 100) / 100;
}

/** Manager records a cost breakdown for a completed request. Stores who set it. */
export async function setRequestCost(
  requestId: string,
  laborHours: number,
  hourlyRate: number,
  materialCost: number,
  setById: string,
  setByName: string,
): Promise<void> {
  if (laborHours < 0 || hourlyRate < 0 || materialCost < 0) {
    throw new Error("Cost values must be non-negative");
  }
  const total = computeCostTotal(laborHours, hourlyRate, materialCost);
  const cost: RequestCost = {
    laborHours,
    hourlyRate,
    materialCost,
    total,
    setBy: setById,
    setByName,
    setAt: Timestamp.now(),
  };
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    cost,
    payment: {
      status: "unpaid",
      amount: total,
    } satisfies RequestPayment,
  });
}

/**
 * Manager pays the maintainer (mock payment — no real money moves).
 * Records timestamp, payer, payee, amount, method, and a fake reference number.
 */
export async function payMaintainer(
  requestId: string,
  amount: number,
  method: PaymentMethod,
  payerId: string,
  payerName: string,
  payeeId: string,
  payeeName: string,
): Promise<void> {
  if (amount <= 0) {
    throw new Error("Payment amount must be positive");
  }
  const reference = `TKP-${Date.now().toString(36).toUpperCase()}`;
  const payment: RequestPayment = {
    status: "paid",
    method,
    amount: Math.round(amount * 100) / 100,
    paidAt: Timestamp.now(),
    paidBy: payerId,
    paidByName: payerName,
    paidTo: payeeId,
    paidToName: payeeName,
    reference,
  };
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), { payment });

  await createNotification(payeeId, {
    kind: "payment_received",
    title: "Payment received",
    body: `${payerName} paid you RM ${payment.amount.toFixed(2)} (ref ${reference})`,
    requestId,
    actorId: payerId,
    actorName: payerName,
  });
}

/** Mark a payment as pending (e.g., bank transfer initiated). */
export async function markPaymentPending(
  requestId: string,
  amount: number,
  method: PaymentMethod,
  payerId: string,
  payerName: string,
): Promise<void> {
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    payment: {
      status: "pending",
      method,
      amount: Math.round(amount * 100) / 100,
      paidBy: payerId,
      paidByName: payerName,
      paidAt: Timestamp.now(),
    } satisfies Partial<RequestPayment>,
  });
}
