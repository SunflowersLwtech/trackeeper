jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(() => Promise.resolve()),
  doc: jest.fn(() => "mock-doc-ref"),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  startAfter: jest.fn(),
  arrayUnion: jest.fn((...args: unknown[]) => args),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => "mock-timestamp"),
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

import { updateDoc } from "firebase/firestore";
import { rateRequest, updateRequest } from "@/services/requests";

describe("rateRequest", () => {
  beforeEach(() => jest.clearAllMocks());

  it("writes rating and comment to Firestore", async () => {
    await rateRequest("req-1", 4, "Great job");
    expect(updateDoc).toHaveBeenCalledWith("mock-doc-ref", {
      rating: 4,
      ratingComment: "Great job",
    });
  });

  it("writes null ratingComment when no comment provided", async () => {
    await rateRequest("req-1", 5);
    expect(updateDoc).toHaveBeenCalledWith("mock-doc-ref", {
      rating: 5,
      ratingComment: null,
    });
  });

  it("rejects rating below 1", async () => {
    await expect(rateRequest("req-1", 0)).rejects.toThrow("Rating must be between 1 and 5");
  });

  it("rejects rating above 5", async () => {
    await expect(rateRequest("req-1", 6)).rejects.toThrow("Rating must be between 1 and 5");
  });
});

describe("updateRequest", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates specified fields and re-derives titleTokens when title changes", async () => {
    await updateRequest("req-1", { title: "New Title", priority: "high" });
    expect(updateDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      expect.objectContaining({
        title: "New Title",
        priority: "high",
        titleTokens: expect.arrayContaining(["new", "title"]),
      }),
    );
  });
});
