import { setDoc } from "firebase/firestore";
import { createNotification } from "@/services/notifications";
import {
  approveTenant,
  rejectTenant,
  reactivateUser,
  suspendUser,
} from "@/services/approvals";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((...args) => ["collection", ...args]),
  query: jest.fn((...args) => ["query", ...args]),
  where: jest.fn((...args) => ["where", ...args]),
  onSnapshot: jest.fn(() => jest.fn()),
  doc: jest.fn(() => "mock-doc-ref"),
  setDoc: jest.fn().mockResolvedValue(undefined),
  serverTimestamp: jest.fn(() => "mock-ts"),
}));

jest.mock("@/config/firebase", () => ({ db: "mock-db" }));

jest.mock("@/services/notifications", () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

const mockSetDoc = setDoc as jest.Mock;
const mockCreateNotification = createNotification as jest.Mock;

function containsUndefined(value: unknown): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.some(containsUndefined);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value as Record<string, unknown>).some(containsUndefined);
  }
  return false;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetDoc.mockResolvedValue(undefined);
  mockCreateNotification.mockResolvedValue(undefined);
});

describe("tenant approvals", () => {
  it("approves the tenant even if notification addDoc fails", async () => {
    mockCreateNotification.mockRejectedValueOnce(new Error("invalid addDoc payload"));

    await expect(approveTenant("tenant-1", "manager-1", "Admin")).resolves.toBeUndefined();

    expect(mockSetDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      {
        status: "active",
        approvedAt: "mock-ts",
        approvedBy: "manager-1",
        approvedByName: "Admin",
      },
      { merge: true },
    );
    expect(mockCreateNotification).toHaveBeenCalledWith("tenant-1", expect.objectContaining({
      kind: "tenant_approved",
      actorId: "manager-1",
      actorName: "Admin",
    }));
  });

  it("does not put undefined audit fields into approval writes", async () => {
    await approveTenant("tenant-1", "manager-1", undefined as unknown as string);

    expect(containsUndefined(mockSetDoc.mock.calls[0][1])).toBe(false);
    expect(mockSetDoc.mock.calls[0][1]).toEqual({
      status: "active",
      approvedAt: "mock-ts",
      approvedBy: "manager-1",
    });
  });

  it("rejects the tenant even if notification addDoc fails", async () => {
    mockCreateNotification.mockRejectedValueOnce(new Error("invalid addDoc payload"));

    await expect(rejectTenant("tenant-1", "manager-1", "Admin")).resolves.toBeUndefined();

    expect(mockSetDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      {
        status: "rejected",
        rejectedAt: "mock-ts",
        approvedBy: "manager-1",
        approvedByName: "Admin",
        rejectionReason: null,
      },
      { merge: true },
    );
  });

  it("strips undefined audit fields from user status updates", async () => {
    await reactivateUser("tenant-1", "manager-1", undefined as unknown as string);
    await suspendUser("tenant-1", "manager-1", undefined as unknown as string);

    expect(containsUndefined(mockSetDoc.mock.calls[0][1])).toBe(false);
    expect(containsUndefined(mockSetDoc.mock.calls[1][1])).toBe(false);
  });
});
