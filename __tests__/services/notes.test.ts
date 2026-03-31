import { addDoc, onSnapshot } from "firebase/firestore";

jest.mock("firebase/firestore", () => ({
  __esModule: true,
  collection: jest.fn(() => "mock-notes-ref"),
  addDoc: jest.fn(() => Promise.resolve({ id: "note-1" })),
  query: jest.fn(() => "mock-query"),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => "mock-ts"),
}));

jest.mock("@/config/firebase", () => ({
  db: "mock-db",
}));

import { addNote, subscribeToNotes } from "@/services/notes";

const mockAddDoc = addDoc as jest.Mock;
const mockOnSnapshot = onSnapshot as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAddDoc.mockResolvedValue({ id: "note-1" });
});

describe("addNote", () => {
  it("creates a note document with correct fields", async () => {
    const id = await addNote("req-1", "mgr-1", "Manager A", "Plumber scheduled");
    expect(id).toBe("note-1");
    expect(mockAddDoc).toHaveBeenCalledWith("mock-notes-ref", {
      managerId: "mgr-1",
      managerName: "Manager A",
      text: "Plumber scheduled",
      createdAt: "mock-ts",
    });
  });

  it("trims whitespace from text", async () => {
    await addNote("req-1", "mgr-1", "Manager A", "  note with spaces  ");
    expect(mockAddDoc).toHaveBeenCalledWith(
      "mock-notes-ref",
      expect.objectContaining({ text: "note with spaces" }),
    );
  });
});

describe("subscribeToNotes", () => {
  it("calls onSnapshot and returns unsubscribe", () => {
    const mockUnsub = jest.fn();
    mockOnSnapshot.mockReturnValue(mockUnsub);

    const callback = jest.fn();
    const unsub = subscribeToNotes("req-1", callback);

    expect(mockOnSnapshot).toHaveBeenCalledWith("mock-query", expect.any(Function), expect.any(Function));
    expect(unsub).toBe(mockUnsub);
  });

  it("passes notes data to callback", () => {
    mockOnSnapshot.mockImplementation((_q: unknown, cb: (snap: unknown) => void) => {
      cb({
        docs: [
          { id: "n1", data: () => ({ text: "Note 1", managerId: "m1", managerName: "Mgr" }) },
        ],
      });
      return jest.fn();
    });

    const callback = jest.fn();
    subscribeToNotes("req-1", callback);

    expect(callback).toHaveBeenCalledWith([
      { id: "n1", text: "Note 1", managerId: "m1", managerName: "Mgr" },
    ]);
  });

  it("calls onError for errors", () => {
    const error = new Error("fail");
    mockOnSnapshot.mockImplementation((_q: unknown, _cb: unknown, errCb: (e: Error) => void) => {
      errCb(error);
      return jest.fn();
    });

    const callback = jest.fn();
    const onError = jest.fn();
    subscribeToNotes("req-1", callback, onError);

    expect(onError).toHaveBeenCalledWith(error);
  });

  it("handles missing onError gracefully", () => {
    const error = new Error("fail");
    mockOnSnapshot.mockImplementation((_q: unknown, _cb: unknown, errCb: (e: Error) => void) => {
      errCb(error);
      return jest.fn();
    });

    expect(() => subscribeToNotes("req-1", jest.fn())).not.toThrow();
  });
});
