/**
 * Integration test for the full request lifecycle:
 * create → assign → in_progress → complete → rate
 *
 * Tests the service layer functions work together correctly
 * with mocked Firestore.
 */

import { updateDoc } from "firebase/firestore";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "mock-collection"),
  addDoc: jest.fn().mockResolvedValue({ id: "lifecycle-req-1" }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  doc: jest.fn(() => "mock-doc-ref"),
  query: jest.fn(() => "mock-query"),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => "mock-ts"),
  arrayUnion: jest.fn((...args: unknown[]) => args),
  Timestamp: { now: jest.fn(() => "mock-timestamp") },
}));

jest.mock("firebase/storage", () => ({
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock("@/config/firebase", () => ({
  db: "mock-db",
  storage: "mock-storage",
}));

import {
  createRequest,
  assignRequest,
  updateRequestStatus,
  completeRequest,
  rateRequest,
} from "@/services/requests";

const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;

beforeEach(() => jest.clearAllMocks());

describe("Request lifecycle: create → assign → in_progress → complete → rate", () => {
  it("creates a request successfully", async () => {
    const id = await createRequest({
      title: "Broken window",
      description: "Living room window cracked in the corner",
      category: "General",
      priority: "high",
      tenantId: "tenant-1",
      tenantName: "Alice",
    });
    expect(id).toBe("lifecycle-req-1");
  });

  it("assigns the request (submitted → assigned)", async () => {
    await assignRequest(
      "lifecycle-req-1",
      "submitted",
      "maint-1",
      "Bob",
      "555-1234",
      "Today 3PM",
      "mgr-1",
      "Manager Carol",
    );
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      expect.objectContaining({
        status: "assigned",
        assignedTo: "maint-1",
        assignedToName: "Bob",
      }),
    );
  });

  it("starts work (assigned → in_progress)", async () => {
    await updateRequestStatus(
      "lifecycle-req-1",
      "assigned",
      "in_progress",
      "maint-1",
      "Bob",
      "maintainer",
    );
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      expect.objectContaining({ status: "in_progress" }),
    );
  });

  it("completes the request (in_progress → completed)", async () => {
    await completeRequest("lifecycle-req-1", "in_progress", "maint-1", "Bob");
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      expect.objectContaining({ status: "completed" }),
    );
  });

  it("tenant rates the completed request", async () => {
    await rateRequest("lifecycle-req-1", 5, "Excellent work!");
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      expect.objectContaining({ rating: 5, ratingComment: "Excellent work!" }),
    );
  });

  it("rejects invalid transition (submitted → completed)", async () => {
    await expect(
      updateRequestStatus("lifecycle-req-1", "submitted", "completed", "maint-1", "Bob", "maintainer"),
    ).rejects.toThrow("Invalid transition");
  });

  it("rejects rating out of range", async () => {
    await expect(rateRequest("lifecycle-req-1", 6)).rejects.toThrow("Rating must be between 1 and 5");
  });
});
