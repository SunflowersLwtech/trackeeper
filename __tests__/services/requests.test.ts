import { canTransition } from "@/utils/status";

// Mock firebase modules
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: "test-id" }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
}));

jest.mock("firebase/storage", () => ({
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock("@/config/firebase", () => ({
  db: {},
  storage: {},
}));

describe("requests service - status validation", () => {
  it("allows valid forward transitions", () => {
    expect(canTransition("submitted", "assigned")).toBe(true);
    expect(canTransition("assigned", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "completed")).toBe(true);
  });

  it("rejects backward transitions", () => {
    expect(canTransition("completed", "in_progress")).toBe(false);
    expect(canTransition("assigned", "submitted")).toBe(false);
  });

  it("rejects skipping transitions", () => {
    expect(canTransition("submitted", "in_progress")).toBe(false);
    expect(canTransition("submitted", "completed")).toBe(false);
    expect(canTransition("assigned", "completed")).toBe(false);
  });

  it("rejects same-state transitions", () => {
    expect(canTransition("submitted", "submitted")).toBe(false);
    expect(canTransition("completed", "completed")).toBe(false);
  });
});

describe("requests service - createRequest", () => {
  it("can be imported without error", () => {
    // Verifies the module structure and mocks work
    const { createRequest } = require("@/services/requests");
    expect(typeof createRequest).toBe("function");
  });
});
