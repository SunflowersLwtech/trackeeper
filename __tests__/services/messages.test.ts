jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: "msg-1" }),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
}));

jest.mock("@/config/firebase", () => ({
  db: {},
}));

describe("messages service", () => {
  it("can be imported without error", () => {
    const { sendMessage, subscribeToMessages } = require("@/services/messages");
    expect(typeof sendMessage).toBe("function");
    expect(typeof subscribeToMessages).toBe("function");
  });

  it("sendMessage calls addDoc with correct structure", async () => {
    const { addDoc } = require("firebase/firestore");
    const { sendMessage } = require("@/services/messages");

    await sendMessage("req-1", "user-1", "John", "Hello");

    expect(addDoc).toHaveBeenCalledWith(
      undefined, // collection mock returns undefined
      expect.objectContaining({
        senderId: "user-1",
        senderName: "John",
        text: "Hello",
      }),
    );
  });

  it("sendMessage trims whitespace", async () => {
    const { addDoc } = require("firebase/firestore");
    const { sendMessage } = require("@/services/messages");

    await sendMessage("req-1", "user-1", "John", "  Hello world  ");

    expect(addDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        text: "Hello world",
      }),
    );
  });
});
