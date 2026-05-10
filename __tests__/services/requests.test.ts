import {
  addDoc,
  updateDoc,
  onSnapshot,
  getDoc,
} from "firebase/firestore";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "mock-collection"),
  addDoc: jest.fn().mockResolvedValue({ id: "req-123" }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  doc: jest.fn(() => "mock-doc-ref"),
  getDoc: jest.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ status: "submitted", tenantId: "u-tenant", tenantName: "Tenant" }),
  }),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  startAfter: jest.fn(),
  query: jest.fn(() => "mock-query"),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => "mock-ts"),
  arrayUnion: jest.fn((...args) => args),
  Timestamp: {
    now: jest.fn(() => "mock-timestamp"),
    fromDate: jest.fn((d: Date) => ({ toMillis: () => d.getTime(), toDate: () => d })),
    fromMillis: jest.fn((ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms) })),
  },
  Unsubscribe: jest.fn(),
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
  updateRequestStatus,
  cancelRequest,
  updateRequest,
  rateRequest,
  subscribeToTenantRequests,
  subscribeToAllRequests,
  subscribeToRequest,
  assignRequest,
  putOnHold,
  resumeRequest,
  completeRequest,
  subscribeToMaintainerRequests,
  scheduleRequest,
} from "@/services/requests";

import { uploadBytesResumable } from "firebase/storage";

const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockOnSnapshot = onSnapshot as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;

const mockUpload = uploadBytesResumable as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("createRequest", () => {
  it("creates a document with correct fields and system-triages a priority", async () => {
    const id = await createRequest({
      title: "Wall scuff",
      description: "Small mark on hallway wall",
      category: "General",
      tenantId: "user-1",
      tenantName: "John",
    });

    expect(id).toBe("req-123");
    expect(mockAddDoc).toHaveBeenCalledWith(
      "mock-collection",
      expect.objectContaining({
        title: "Wall scuff",
        description: "Small mark on hallway wall",
        category: "General",
        priority: "low",
        status: "submitted",
        tenantId: "user-1",
        tenantName: "John",
        imageUrls: [],
        priorityFactors: [],
        priorityConfidence: "low",
        titleTokens: expect.arrayContaining(["wall", "scuff"]),
        sla: expect.objectContaining({ priority: "low", totalPausedMs: 0 }),
        statusHistory: [],
        createdAt: "mock-ts",
      }),
    );
    const callArgs = mockAddDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(callArgs.prioritySuggestion).toMatchObject({
      priority: "low",
      source: "system_triage",
      confidence: "low",
    });
  });

  it("detects high priority from explicit tenant triage factors", async () => {
    await createRequest({
      title: "Door lock issue",
      description: "The main door lock is unreliable and the unit may not be secure",
      category: "General",
      tenantId: "user-1",
      tenantName: "John",
      triageFactors: ["access_security"],
    });

    expect(mockAddDoc).toHaveBeenCalledWith(
      "mock-collection",
      expect.objectContaining({
        priority: "high",
        priorityFactors: ["access_security"],
        priorityConfidence: "high",
      }),
    );
  });

  it("detects high priority from emergency keywords", async () => {
    await createRequest({
      title: "Emergency",
      description: "Power outage on second floor",
      category: "Electrical",
      tenantId: "user-1",
      tenantName: "John",
    });

    expect(mockAddDoc).toHaveBeenCalledWith(
      "mock-collection",
      expect.objectContaining({ priority: "high" }),
    );
  });

  it("includes clientTimestamp for latency measurement", async () => {
    const before = Date.now();
    await createRequest({
      title: "Test",
      description: "Test description",
      category: "General",
      tenantId: "user-1",
      tenantName: "John",
    });
    const after = Date.now();

    const callArgs = mockAddDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(callArgs.clientTimestamp).toBeGreaterThanOrEqual(before);
    expect(callArgs.clientTimestamp).toBeLessThanOrEqual(after);
  });
  it("gracefully handles image upload failure and still returns request ID", async () => {
    global.fetch = jest.fn().mockResolvedValue({ blob: () => Promise.resolve(new Blob()) });
    const mockTask = {
      on: jest.fn((_event: string, _progress: unknown, onError: (e: Error) => void) => {
        onError(new Error("Upload failed"));
      }),
      snapshot: { ref: "mock-snapshot-ref" },
    };
    mockUpload.mockReturnValue(mockTask);
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    const id = await createRequest({
      title: "With image",
      description: "Has a photo",
      category: "General",
      tenantId: "user-1",
      tenantName: "John",
      imageUri: "file:///photo.jpg",
    });

    expect(id).toBe("req-123");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Image upload failed"),
      expect.anything(),
    );
    consoleSpy.mockRestore();
  });
});

describe("updateRequestStatus", () => {
  it("updates status for valid forward transition", async () => {
    await updateRequestStatus("req-1", "submitted", "assigned", "user-1", "Manager Bob", "manager");
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", expect.objectContaining({
      status: "assigned",
      statusHistory: expect.anything(),
    }));
  });

  it("throws for invalid transition for role", async () => {
    await expect(updateRequestStatus("req-1", "submitted", "in_progress", "user-1", "Bob", "manager"))
      .rejects.toThrow("Invalid transition");
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe("cancelRequest", () => {
  it("cancels a submitted request", async () => {
    await cancelRequest("req-1", "submitted", "user-1", "Tenant Jane");
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", expect.objectContaining({
      status: "cancelled",
      statusHistory: expect.anything(),
    }));
  });

  it("cancels an assigned request", async () => {
    await cancelRequest("req-1", "assigned", "user-1", "Tenant Jane");
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", expect.objectContaining({
      status: "cancelled",
    }));
  });

  it("throws for non-cancellable status", async () => {
    await expect(cancelRequest("req-1", "in_progress", "user-1", "Jane")).rejects.toThrow("Cannot cancel");
    await expect(cancelRequest("req-1", "completed", "user-1", "Jane")).rejects.toThrow("Cannot cancel");
  });
});

describe("updateRequest", () => {
  it("updates partial fields and re-derives titleTokens when title changes", async () => {
    await updateRequest("req-1", { title: "Updated heading", priority: "high" });
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      expect.objectContaining({
        title: "Updated heading",
        priority: "high",
        titleTokens: expect.arrayContaining(["updated", "heading"]),
      }),
    );
  });

  it("does not re-derive titleTokens if title is unchanged", async () => {
    await updateRequest("req-1", { priority: "high" });
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      expect.not.objectContaining({ titleTokens: expect.anything() }),
    );
  });
});

describe("rateRequest", () => {
  it("writes rating and comment", async () => {
    await rateRequest("req-1", 5, "Excellent");
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", {
      rating: 5,
      ratingComment: "Excellent",
    });
  });

  it("writes null comment when not provided", async () => {
    await rateRequest("req-1", 3);
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", {
      rating: 3,
      ratingComment: null,
    });
  });

  it("rejects rating out of range", async () => {
    await expect(rateRequest("req-1", 0)).rejects.toThrow("Rating must be between 1 and 5");
    await expect(rateRequest("req-1", 6)).rejects.toThrow("Rating must be between 1 and 5");
  });
});

describe("subscribeToTenantRequests", () => {
  it("calls onSnapshot and returns unsubscribe", () => {
    const mockUnsub = jest.fn();
    mockOnSnapshot.mockReturnValue(mockUnsub);

    const callback = jest.fn();
    const unsub = subscribeToTenantRequests("user-1", callback);

    expect(mockOnSnapshot).toHaveBeenCalledWith("mock-query", expect.any(Function), expect.any(Function));
    expect(unsub).toBe(mockUnsub);
  });

  it("passes snapshot data to callback", () => {
    const mockDoc = { id: "r1", data: () => ({ title: "Test", status: "submitted" }) };
    mockOnSnapshot.mockImplementation((_q: unknown, cb: (snap: unknown) => void) => {
      cb({
        docs: [mockDoc],
      });
      return jest.fn();
    });

    const callback = jest.fn();
    subscribeToTenantRequests("user-1", callback);

    expect(callback).toHaveBeenCalledWith(
      [{ id: "r1", title: "Test", status: "submitted" }],
      mockDoc,
    );
  });

  it("calls onError for errors", () => {
    const mockError = new Error("Network error");
    mockOnSnapshot.mockImplementation((_q: unknown, _cb: unknown, errCb: (e: Error) => void) => {
      errCb(mockError);
      return jest.fn();
    });

    const callback = jest.fn();
    const onError = jest.fn();
    subscribeToTenantRequests("user-1", callback, onError);

    expect(onError).toHaveBeenCalledWith(mockError);
  });
});

describe("subscribeToAllRequests", () => {
  it("calls onSnapshot and returns unsubscribe", () => {
    const mockUnsub = jest.fn();
    mockOnSnapshot.mockReturnValue(mockUnsub);

    const callback = jest.fn();
    const unsub = subscribeToAllRequests(callback);

    expect(mockOnSnapshot).toHaveBeenCalled();
    expect(unsub).toBe(mockUnsub);
  });

  it("passes snapshot data to callback", () => {
    const mockDoc1 = { id: "r1", data: () => ({ title: "A" }) };
    const mockDoc2 = { id: "r2", data: () => ({ title: "B" }) };
    mockOnSnapshot.mockImplementation((_q: unknown, cb: (snap: unknown) => void) => {
      cb({
        docs: [mockDoc1, mockDoc2],
      });
      return jest.fn();
    });

    const callback = jest.fn();
    subscribeToAllRequests(callback);

    expect(callback).toHaveBeenCalledWith(
      [{ id: "r1", title: "A" }, { id: "r2", title: "B" }],
      mockDoc2,
    );
  });
});

describe("subscribeToRequest", () => {
  it("calls onSnapshot on a single document", () => {
    const mockUnsub = jest.fn();
    mockOnSnapshot.mockReturnValue(mockUnsub);

    const callback = jest.fn();
    const unsub = subscribeToRequest("req-1", callback);

    expect(mockOnSnapshot).toHaveBeenCalledWith("mock-doc-ref", expect.any(Function), expect.any(Function));
    expect(unsub).toBe(mockUnsub);
  });

  it("returns null for non-existent document", () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: (snap: unknown) => void) => {
      cb({ exists: () => false });
      return jest.fn();
    });

    const callback = jest.fn();
    subscribeToRequest("req-missing", callback);

    expect(callback).toHaveBeenCalledWith(null);
  });

  it("returns document data for existing document", () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: (snap: unknown) => void) => {
      cb({
        exists: () => true,
        id: "req-1",
        data: () => ({ title: "Test", status: "submitted" }),
      });
      return jest.fn();
    });

    const callback = jest.fn();
    subscribeToRequest("req-1", callback);

    expect(callback).toHaveBeenCalledWith({
      id: "req-1",
      title: "Test",
      status: "submitted",
    });
  });
});

describe("assignRequest", () => {
  it("assigns a submitted request to a maintainer", async () => {
    await assignRequest("req-1", "submitted", "maint-1", "John Plumber", "555-1234", "Today 3PM", "mgr-1", "Manager");
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", expect.objectContaining({
      status: "assigned",
      assignedTo: "maint-1",
      assignedToName: "John Plumber",
      assignedToPhone: "555-1234",
      estimatedArrival: "Today 3PM",
    }));
  });

  it("throws for invalid source status", async () => {
    await expect(assignRequest("req-1", "in_progress", "m-1", "John", "", "", "mgr-1", "Mgr"))
      .rejects.toThrow("Invalid transition");
  });
});

describe("scheduleRequest", () => {
  it("schedules an assigned request", async () => {
    const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000);
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        status: "assigned",
        tenantId: "tenant-1",
        title: "Leaking pipe",
      }),
    });

    await scheduleRequest("req-1", scheduledFor, "mgr-1", "Manager", "manager");

    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", expect.objectContaining({
      status: "scheduled",
      scheduledFor: expect.objectContaining({
        toMillis: expect.any(Function),
        toDate: expect.any(Function),
      }),
    }));
  });

  it("allows rescheduling an already scheduled request", async () => {
    const scheduledFor = new Date(Date.now() + 3 * 60 * 60 * 1000);
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        status: "scheduled",
        tenantId: "tenant-1",
        title: "Leaking pipe",
      }),
    });

    await expect(scheduleRequest("req-1", scheduledFor, "mgr-1", "Manager", "manager")).resolves.toBeUndefined();
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", expect.objectContaining({
      status: "scheduled",
    }));
    expect(JSON.stringify(mockUpdateDoc.mock.calls[0][1])).toContain("Rescheduled for");
  });

  it("rejects scheduling from submitted", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        status: "submitted",
        tenantId: "tenant-1",
        title: "Leaking pipe",
      }),
    });

    await expect(scheduleRequest("req-1", new Date(Date.now() + 60 * 60 * 1000), "mgr-1", "Manager", "manager"))
      .rejects.toThrow("Cannot schedule from submitted");
  });
});

describe("putOnHold", () => {
  it("puts an assigned request on hold", async () => {
    await putOnHold("req-1", "assigned", "user-1", "Bob", "manager");
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", expect.objectContaining({
      status: "on_hold",
    }));
  });

  it("puts an in_progress request on hold", async () => {
    await putOnHold("req-1", "in_progress", "user-1", "Bob", "maintainer");
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", expect.objectContaining({
      status: "on_hold",
    }));
  });

  it("throws for submitted → on_hold", async () => {
    await expect(putOnHold("req-1", "submitted", "user-1", "Bob", "manager"))
      .rejects.toThrow("Invalid transition");
  });
});

describe("resumeRequest", () => {
  it("resumes to assigned", async () => {
    await resumeRequest("req-1", "assigned", "user-1", "Mgr", "manager");
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", expect.objectContaining({
      status: "assigned",
    }));
  });

  it("resumes to in_progress", async () => {
    await resumeRequest("req-1", "in_progress", "user-1", "John", "maintainer");
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", expect.objectContaining({
      status: "in_progress",
    }));
  });
});

describe("completeRequest", () => {
  it("completes an in_progress request", async () => {
    await completeRequest("req-1", "in_progress", "maint-1", "John");
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", expect.objectContaining({
      status: "completed",
    }));
  });

  it("throws for assigned → completed", async () => {
    await expect(completeRequest("req-1", "assigned", "maint-1", "John"))
      .rejects.toThrow("Invalid transition");
  });
});

describe("subscribeToMaintainerRequests", () => {
  it("calls onSnapshot and returns unsubscribe", () => {
    const mockUnsub = jest.fn();
    mockOnSnapshot.mockReturnValue(mockUnsub);
    const callback = jest.fn();
    const unsub = subscribeToMaintainerRequests("maint-1", callback);
    expect(mockOnSnapshot).toHaveBeenCalled();
    expect(unsub).toBe(mockUnsub);
  });
});
