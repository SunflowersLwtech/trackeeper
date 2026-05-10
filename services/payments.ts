import {
  doc,
  updateDoc,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import {
  MaintenanceRequest,
  PaymentMethod,
  RequestCost,
  RequestPayment,
} from "@/types";
import { createNotification } from "@/services/notifications";

const REQUESTS_COLLECTION = "requests";

/** Compute the breakdown total, rounded to 2 dp. Negative inputs clamp to 0. */
export function computeCostTotal(
  laborHours: number,
  hourlyRate: number,
  materialCost: number,
): number {
  const subtotal = Math.max(0, laborHours) * Math.max(0, hourlyRate);
  return Math.round((subtotal + Math.max(0, materialCost)) * 100) / 100;
}

/**
 * Manager records a cost breakdown for a completed request. Initialises payment
 * to status="unpaid". Re-running before payment is fine — it overwrites the cost.
 * Throws if the request has already been paid (cost is locked once money moved).
 */
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

  const ref = doc(db, REQUESTS_COLLECTION, requestId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("Request not found");
    }
    const data = snap.data() as MaintenanceRequest;
    if (data.payment?.status === "paid") {
      throw new Error("Cannot edit cost: payment already settled");
    }
    if (data.payment?.status === "refunded") {
      throw new Error("Cannot edit cost: payment was refunded");
    }
    tx.update(ref, {
      cost,
      payment: {
        status: "unpaid",
        amount: total,
      } satisfies RequestPayment,
    });
  });
}

/**
 * Manager pays the maintainer (mock payment — no real money moves).
 * Idempotent: rejects if already paid. Validates that cost was set first and
 * the supplied amount matches the recorded cost (within 1 cent).
 */
export async function payMaintainer(
  requestId: string,
  amount: number,
  method: PaymentMethod,
  payerId: string,
  payerName: string,
  payeeId: string,
  payeeName: string,
): Promise<RequestPayment> {
  if (amount <= 0) {
    throw new Error("Payment amount must be positive");
  }

  const reference = `TKP-${Date.now().toString(36).toUpperCase()}`;
  const ref = doc(db, REQUESTS_COLLECTION, requestId);

  const payment = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("Request not found");
    }
    const data = snap.data() as MaintenanceRequest;
    if (!data.cost) {
      throw new Error("Cost has not been set yet");
    }
    if (data.payment?.status === "paid") {
      throw new Error("Already paid");
    }
    if (data.payment?.status === "refunded") {
      throw new Error("Cannot pay: previous payment was refunded");
    }
    if (Math.abs(data.cost.total - amount) > 0.01) {
      throw new Error(
        `Amount mismatch: recorded cost is ${data.cost.total}, given ${amount}`,
      );
    }

    const next: RequestPayment = {
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
    tx.update(ref, { payment: next });
    return next;
  });

  // Notify payee — fan-out best effort, do not fail the payment if it fails.
  await createNotification(payeeId, {
    kind: "payment_received",
    title: "Payment received",
    body: `${payerName} paid you RM ${payment.amount.toFixed(2)} (ref ${reference})`,
    requestId,
    actorId: payerId,
    actorName: payerName,
  }).catch(() => {});

  return payment;
}

/**
 * Refund a previously settled payment (paid → refunded). Records who refunded
 * and why. Cannot be called twice — refunded is terminal.
 */
export async function refundPayment(
  requestId: string,
  refundedById: string,
  refundedByName: string,
  reason?: string,
): Promise<RequestPayment> {
  const ref = doc(db, REQUESTS_COLLECTION, requestId);

  const payment = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("Request not found");
    }
    const data = snap.data() as MaintenanceRequest;
    if (!data.payment) {
      throw new Error("No payment to refund");
    }
    if (data.payment.status !== "paid") {
      throw new Error(`Cannot refund: payment is ${data.payment.status}`);
    }

    const next: RequestPayment = {
      ...data.payment,
      status: "refunded",
      refundedAt: Timestamp.now(),
      refundedBy: refundedById,
      refundedByName: refundedByName,
      refundReason: reason ?? null,
    };
    tx.update(ref, { payment: next });
    return next;
  });

  // Notify the original payee that funds were reversed.
  if (payment.paidTo) {
    await createNotification(payment.paidTo, {
      kind: "payment_received",
      title: "Payment refunded",
      body:
        `RM ${payment.amount.toFixed(2)} (ref ${payment.reference ?? "—"}) was refunded` +
        (reason ? ` — ${reason}` : ""),
      requestId,
      actorId: refundedById,
      actorName: refundedByName,
    }).catch(() => {});
  }

  return payment;
}

/**
 * Mark a payment as pending (e.g., bank transfer initiated, awaiting clearance).
 * Allowed transitions: unpaid → pending, paid → pending is rejected.
 */
export async function markPaymentPending(
  requestId: string,
  amount: number,
  method: PaymentMethod,
  payerId: string,
  payerName: string,
): Promise<void> {
  const normalizedAmount = Math.round(amount * 100) / 100;
  if (normalizedAmount <= 0) {
    throw new Error("Payment amount must be positive");
  }
  const ref = doc(db, REQUESTS_COLLECTION, requestId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("Request not found");
    }
    const data = snap.data() as MaintenanceRequest;
    if (!data.cost) {
      throw new Error("Cost has not been set yet");
    }
    const current = data.payment?.status;
    if (Math.abs(data.cost.total - normalizedAmount) > 0.01) {
      throw new Error(
        `Amount mismatch: recorded cost is ${data.cost.total}, given ${normalizedAmount}`,
      );
    }
    if (current === "paid" || current === "refunded") {
      throw new Error(`Cannot mark pending: payment is already ${current}`);
    }
    tx.update(ref, {
      payment: {
        status: "pending",
        method,
        amount: normalizedAmount,
        paidBy: payerId,
        paidByName: payerName,
        paidAt: Timestamp.now(),
      } satisfies Partial<RequestPayment>,
    });
  });
}
