import { onSnapshot } from "firebase/firestore";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "mock-collection"),
  query: jest.fn(() => "mock-query"),
  where: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
}));

jest.mock("@/config/firebase", () => ({
  db: "mock-db",
}));

import { subscribeToMaintainers } from "@/services/users";

const mockOnSnapshot = onSnapshot as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("subscribeToMaintainers", () => {
  it("calls onSnapshot and returns unsubscribe", () => {
    const mockUnsub = jest.fn();
    mockOnSnapshot.mockReturnValue(mockUnsub);
    const callback = jest.fn();
    const unsub = subscribeToMaintainers(callback);
    expect(mockOnSnapshot).toHaveBeenCalledWith("mock-query", expect.any(Function), expect.any(Function));
    expect(unsub).toBe(mockUnsub);
  });

  it("passes maintainer data to callback", () => {
    mockOnSnapshot.mockImplementation((_q: unknown, cb: (snap: unknown) => void) => {
      cb({
        docs: [
          { id: "m1", data: () => ({ name: "John Plumber", email: "john@test.com", role: "maintainer" }) },
          { id: "m2", data: () => ({ name: "Jane Electric", email: "jane@test.com", role: "maintainer" }) },
        ],
      });
      return jest.fn();
    });

    const callback = jest.fn();
    subscribeToMaintainers(callback);

    expect(callback).toHaveBeenCalledWith([
      { uid: "m1", name: "John Plumber", email: "john@test.com", role: "maintainer" },
      { uid: "m2", name: "Jane Electric", email: "jane@test.com", role: "maintainer" },
    ]);
  });

  it("calls onError for errors", () => {
    const mockError = new Error("Network error");
    mockOnSnapshot.mockImplementation((_q: unknown, _cb: unknown, errCb: (e: Error) => void) => {
      errCb(mockError);
      return jest.fn();
    });

    const callback = jest.fn();
    const onError = jest.fn();
    subscribeToMaintainers(callback, onError);

    expect(onError).toHaveBeenCalledWith(mockError);
  });
});
