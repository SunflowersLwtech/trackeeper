import { Timestamp } from "firebase/firestore";

// ── Mocks ───────────────────────────────────────────────────────────────
// runTransaction is the heart of the new idempotency logic; we simulate the
// transaction interface so tests can drive any data state without spinning
// the firestore emulator.

const mockTxGet = jest.fn();
const mockTxUpdate = jest.fn();
const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
const mockRunTransaction = jest.fn(
  async (_db: unknown, fn: (tx: { get: jest.Mock; update: jest.Mock }) => Promise<unknown>) => {
    return fn({ get: mockTxGet, update: mockTxUpdate });
  },
);

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_db, _col, id) => ({ id, _col })),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...(args as [unknown, never])),
  Timestamp: { now: jest.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })) },
}));

jest.mock("@/config/firebase", () => ({ db: "mock-db" }));

const mockCreateNotification = jest.fn().mockResolvedValue(undefined);
jest.mock("@/services/notifications", () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

import {
  computeCostTotal,
  setRequestCost,
  payMaintainer,
  refundPayment,
  markPaymentPending,
} from "@/services/payments";

const PAYER = { id: "mgr1", name: "Manager One" };
const PAYEE = { id: "maint1", name: "Maintainer One" };

beforeEach(() => {
  mockTxGet.mockReset();
  mockTxUpdate.mockReset();
  mockUpdateDoc.mockReset().mockResolvedValue(undefined);
  mockRunTransaction.mockClear();
  mockCreateNotification.mockClear();
});

// ════════════════════════════════════════════════════════════════════════
// computeCostTotal
// ════════════════════════════════════════════════════════════════════════
describe("computeCostTotal", () => {
  it("multiplies hours × rate and adds materials", () => {
    expect(computeCostTotal(2, 80, 50)).toBe(210);
  });
  it("rounds to 2 decimal places", () => {
    expect(computeCostTotal(1.333, 75, 0)).toBe(99.98);
  });
  it("clamps negative inputs to zero", () => {
    expect(computeCostTotal(-5, 80, -10)).toBe(0);
    expect(computeCostTotal(2, -80, 50)).toBe(50);
  });
  it("handles zero correctly", () => {
    expect(computeCostTotal(0, 0, 0)).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// setRequestCost
// ════════════════════════════════════════════════════════════════════════
describe("setRequestCost", () => {
  it("rejects negative input values before any DB call", async () => {
    await expect(
      setRequestCost("req1", -1, 80, 0, PAYER.id, PAYER.name),
    ).rejects.toThrow(/non-negative/i);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("writes cost + initial unpaid payment for fresh request", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: "completed" }),
    });
    await setRequestCost("req1", 2, 80, 50, PAYER.id, PAYER.name);
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    const update = mockTxUpdate.mock.calls[0][1];
    expect(update.cost.total).toBe(210);
    expect(update.cost.setBy).toBe(PAYER.id);
    expect(update.payment).toEqual({ status: "unpaid", amount: 210 });
  });

  it("rejects when request was already paid", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({ payment: { status: "paid", amount: 100 } }),
    });
    await expect(
      setRequestCost("req1", 1, 80, 0, PAYER.id, PAYER.name),
    ).rejects.toThrow(/already settled/i);
  });

  it("rejects when request was refunded", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({ payment: { status: "refunded", amount: 100 } }),
    });
    await expect(
      setRequestCost("req1", 1, 80, 0, PAYER.id, PAYER.name),
    ).rejects.toThrow(/refunded/i);
  });

  it("rejects when request does not exist", async () => {
    mockTxGet.mockResolvedValue({ exists: () => false });
    await expect(
      setRequestCost("missing", 1, 80, 0, PAYER.id, PAYER.name),
    ).rejects.toThrow(/not found/i);
  });
});

// ════════════════════════════════════════════════════════════════════════
// payMaintainer
// ════════════════════════════════════════════════════════════════════════
describe("payMaintainer", () => {
  it("rejects amount <= 0 before any DB call", async () => {
    await expect(
      payMaintainer("req1", 0, "cash", PAYER.id, PAYER.name, PAYEE.id, PAYEE.name),
    ).rejects.toThrow(/positive/i);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("rejects when cost has not been recorded", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: "completed" }),
    });
    await expect(
      payMaintainer("req1", 100, "cash", PAYER.id, PAYER.name, PAYEE.id, PAYEE.name),
    ).rejects.toThrow(/cost has not been set/i);
  });

  it("rejects when amount does not match recorded cost", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({
        cost: { total: 210 },
        payment: { status: "unpaid", amount: 210 },
      }),
    });
    await expect(
      payMaintainer("req1", 200, "cash", PAYER.id, PAYER.name, PAYEE.id, PAYEE.name),
    ).rejects.toThrow(/amount mismatch/i);
  });

  it("is IDEMPOTENT — second call after paid throws Already paid", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({
        cost: { total: 210 },
        payment: { status: "paid", amount: 210, reference: "TKP-EARLIER" },
      }),
    });
    await expect(
      payMaintainer("req1", 210, "cash", PAYER.id, PAYER.name, PAYEE.id, PAYEE.name),
    ).rejects.toThrow(/already paid/i);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it("rejects re-payment after refund", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({
        cost: { total: 210 },
        payment: { status: "refunded", amount: 210 },
      }),
    });
    await expect(
      payMaintainer("req1", 210, "cash", PAYER.id, PAYER.name, PAYEE.id, PAYEE.name),
    ).rejects.toThrow(/previous payment was refunded/i);
  });

  it("writes a paid record + reference on the happy path", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({
        cost: { total: 210 },
        payment: { status: "unpaid", amount: 210 },
      }),
    });
    const result = await payMaintainer(
      "req1", 210, "bank_transfer", PAYER.id, PAYER.name, PAYEE.id, PAYEE.name,
    );
    expect(result.status).toBe("paid");
    expect(result.method).toBe("bank_transfer");
    expect(result.amount).toBe(210);
    expect(result.reference).toMatch(/^TKP-/);
    expect(result.paidBy).toBe(PAYER.id);
    expect(result.paidTo).toBe(PAYEE.id);
  });

  it("fires payment_received notification to payee", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({
        cost: { total: 100 },
        payment: { status: "unpaid", amount: 100 },
      }),
    });
    await payMaintainer("req1", 100, "cash", PAYER.id, PAYER.name, PAYEE.id, PAYEE.name);
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      PAYEE.id,
      expect.objectContaining({
        kind: "payment_received",
        title: "Payment received",
        actorId: PAYER.id,
      }),
    );
  });

  it("does not fail the payment if notification fan-out errors", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({
        cost: { total: 100 },
        payment: { status: "unpaid", amount: 100 },
      }),
    });
    mockCreateNotification.mockRejectedValueOnce(new Error("offline"));
    await expect(
      payMaintainer("req1", 100, "cash", PAYER.id, PAYER.name, PAYEE.id, PAYEE.name),
    ).resolves.toMatchObject({ status: "paid" });
  });

  it("tolerates 1-cent floating-point rounding", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({
        cost: { total: 99.99 },
        payment: { status: "unpaid", amount: 99.99 },
      }),
    });
    await expect(
      payMaintainer("req1", 99.985, "cash", PAYER.id, PAYER.name, PAYEE.id, PAYEE.name),
    ).resolves.toMatchObject({ status: "paid" });
  });
});

// ════════════════════════════════════════════════════════════════════════
// refundPayment
// ════════════════════════════════════════════════════════════════════════
describe("refundPayment", () => {
  it("rejects when no payment exists", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: "completed" }),
    });
    await expect(
      refundPayment("req1", PAYER.id, PAYER.name, "wrong job"),
    ).rejects.toThrow(/no payment/i);
  });

  it("rejects when payment is unpaid", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({ payment: { status: "unpaid", amount: 100 } }),
    });
    await expect(
      refundPayment("req1", PAYER.id, PAYER.name),
    ).rejects.toThrow(/cannot refund: payment is unpaid/i);
  });

  it("rejects double-refund", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({ payment: { status: "refunded", amount: 100 } }),
    });
    await expect(
      refundPayment("req1", PAYER.id, PAYER.name),
    ).rejects.toThrow(/cannot refund: payment is refunded/i);
  });

  it("flips paid → refunded and preserves original payment fields", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({
        payment: {
          status: "paid",
          amount: 210,
          method: "cash",
          paidBy: PAYER.id,
          paidByName: PAYER.name,
          paidTo: PAYEE.id,
          paidToName: PAYEE.name,
          reference: "TKP-ABC",
        },
      }),
    });
    const result = await refundPayment("req1", PAYER.id, PAYER.name, "wrong job");
    expect(result.status).toBe("refunded");
    expect(result.refundedBy).toBe(PAYER.id);
    expect(result.refundReason).toBe("wrong job");
    expect(result.reference).toBe("TKP-ABC"); // original kept
    expect(result.amount).toBe(210);
  });

  it("notifies the original payee when payment is refunded", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({
        payment: { status: "paid", amount: 100, paidTo: PAYEE.id, reference: "TKP-X" },
      }),
    });
    await refundPayment("req1", PAYER.id, PAYER.name, "duplicate");
    expect(mockCreateNotification).toHaveBeenCalledWith(
      PAYEE.id,
      expect.objectContaining({
        kind: "payment_received",
        title: "Payment refunded",
      }),
    );
  });

  it("stores null instead of undefined when refund has no reason", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({
        payment: {
          status: "paid",
          amount: 100,
          paidTo: PAYEE.id,
        },
      }),
    });
    await refundPayment("req1", PAYER.id, PAYER.name);
    const update = mockTxUpdate.mock.calls[0][1];
    expect(update.payment.refundReason).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════
// markPaymentPending
// ════════════════════════════════════════════════════════════════════════
describe("markPaymentPending", () => {
  it("rejects amount <= 0", async () => {
    await expect(
      markPaymentPending("req1", -1, "bank_transfer", PAYER.id, PAYER.name),
    ).rejects.toThrow(/positive/i);
  });

  it("transitions unpaid → pending", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({ payment: { status: "unpaid", amount: 100 } }),
    });
    await markPaymentPending("req1", 100, "bank_transfer", PAYER.id, PAYER.name);
    const update = mockTxUpdate.mock.calls[0][1];
    expect(update.payment.status).toBe("pending");
    expect(update.payment.amount).toBe(100);
  });

  it("rejects pending → pending if already paid", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({ payment: { status: "paid", amount: 100 } }),
    });
    await expect(
      markPaymentPending("req1", 100, "bank_transfer", PAYER.id, PAYER.name),
    ).rejects.toThrow(/already paid/i);
  });

  it("rejects pending after refund", async () => {
    mockTxGet.mockResolvedValue({
      exists: () => true,
      data: () => ({ payment: { status: "refunded", amount: 100 } }),
    });
    await expect(
      markPaymentPending("req1", 100, "bank_transfer", PAYER.id, PAYER.name),
    ).rejects.toThrow(/already refunded/i);
  });
});
