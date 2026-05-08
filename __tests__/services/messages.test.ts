import { addDoc, onSnapshot } from "firebase/firestore";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "mock-messages-ref"),
  addDoc: jest.fn().mockResolvedValue({ id: "msg-1" }),
  query: jest.fn(() => "mock-query"),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => "mock-ts"),
}));

jest.mock("@/config/firebase", () => ({
  db: "mock-db",
}));

import { sendMessage, subscribeToMessages } from "@/services/messages";

const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockOnSnapshot = onSnapshot as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("sendMessage", () => {
  it("creates a message document with correct fields", async () => {
    const id = await sendMessage("req-1", "user-1", "John", "Hello");
    expect(id).toBe("msg-1");
    expect(mockAddDoc).toHaveBeenCalledWith("mock-messages-ref", {
      senderId: "user-1",
      senderName: "John",
      text: "Hello",
      readBy: ["user-1"],
      createdAt: "mock-ts",
    });
  });

  it("trims whitespace from text", async () => {
    await sendMessage("req-1", "user-1", "John", "  Hello world  ");
    expect(mockAddDoc).toHaveBeenCalledWith(
      "mock-messages-ref",
      expect.objectContaining({ text: "Hello world" }),
    );
  });
});

describe("subscribeToMessages", () => {
  it("calls onSnapshot and returns unsubscribe", () => {
    const mockUnsub = jest.fn();
    mockOnSnapshot.mockReturnValue(mockUnsub);

    const callback = jest.fn();
    const unsub = subscribeToMessages("req-1", callback);

    expect(mockOnSnapshot).toHaveBeenCalledWith("mock-query", expect.any(Function), expect.any(Function));
    expect(unsub).toBe(mockUnsub);
  });

  it("passes message data to callback", () => {
    mockOnSnapshot.mockImplementation((_q: unknown, cb: (snap: unknown) => void) => {
      cb({
        docs: [
          { id: "m1", data: () => ({ text: "Hi", senderId: "u1", senderName: "A" }) },
          { id: "m2", data: () => ({ text: "Hey", senderId: "u2", senderName: "B" }) },
        ],
      });
      return jest.fn();
    });

    const callback = jest.fn();
    subscribeToMessages("req-1", callback);

    expect(callback).toHaveBeenCalledWith([
      { id: "m1", text: "Hi", senderId: "u1", senderName: "A" },
      { id: "m2", text: "Hey", senderId: "u2", senderName: "B" },
    ]);
  });

  it("calls onError for errors", () => {
    const error = new Error("Firestore error");
    mockOnSnapshot.mockImplementation((_q: unknown, _cb: unknown, errCb: (e: Error) => void) => {
      errCb(error);
      return jest.fn();
    });

    const callback = jest.fn();
    const onError = jest.fn();
    subscribeToMessages("req-1", callback, onError);

    expect(onError).toHaveBeenCalledWith(error);
  });

  it("handles missing onError gracefully", () => {
    const error = new Error("Firestore error");
    mockOnSnapshot.mockImplementation((_q: unknown, _cb: unknown, errCb: (e: Error) => void) => {
      errCb(error);
      return jest.fn();
    });

    expect(() => subscribeToMessages("req-1", jest.fn())).not.toThrow();
  });
});
