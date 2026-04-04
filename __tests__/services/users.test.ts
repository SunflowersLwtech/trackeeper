/* eslint-disable @typescript-eslint/no-explicit-any */
import { onSnapshot, setDoc } from "firebase/firestore";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "mock-collection"),
  doc: jest.fn(() => "mock-doc-ref"),
  query: jest.fn(() => "mock-query"),
  where: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  setDoc: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/config/firebase", () => ({
  db: "mock-db",
}));

jest.mock("expo-constants", () => ({
  expoConfig: { extra: { FIREBASE_API_KEY: "test-api-key" } },
}));

import { subscribeToMaintainers, subscribeToUsersByRole, createStaffUser } from "@/services/users";

const mockOnSnapshot = onSnapshot as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
});

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

describe("subscribeToUsersByRole", () => {
  it("subscribes and returns unsubscribe function", () => {
    const mockUnsub = jest.fn();
    mockOnSnapshot.mockReturnValue(mockUnsub);
    const callback = jest.fn();
    const unsub = subscribeToUsersByRole("manager", callback);
    expect(mockOnSnapshot).toHaveBeenCalled();
    expect(unsub).toBe(mockUnsub);
  });

  it("passes user data to callback", () => {
    mockOnSnapshot.mockImplementation((_q: unknown, cb: (snap: unknown) => void) => {
      cb({
        docs: [
          { id: "u1", data: () => ({ name: "Manager A", email: "a@test.com", role: "manager" }) },
        ],
      });
      return jest.fn();
    });

    const callback = jest.fn();
    subscribeToUsersByRole("manager", callback);

    expect(callback).toHaveBeenCalledWith([
      { uid: "u1", name: "Manager A", email: "a@test.com", role: "manager" },
    ]);
  });

  it("calls onError for errors", () => {
    const err = new Error("fail");
    mockOnSnapshot.mockImplementation((_q: unknown, _cb: unknown, errCb: (e: Error) => void) => {
      errCb(err);
      return jest.fn();
    });

    const callback = jest.fn();
    const onError = jest.fn();
    subscribeToUsersByRole("tenant", callback, onError);
    expect(onError).toHaveBeenCalledWith(err);
  });
});

describe("createStaffUser", () => {
  const input = {
    email: "new@test.com",
    password: "password123",
    name: "New User",
    role: "maintainer" as const,
  };

  it("creates user via REST API and saves to Firestore", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ localId: "new-uid-123" }),
    });
    mockSetDoc.mockResolvedValueOnce(undefined);

    const result = await createStaffUser(input);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("accounts:signUp"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockSetDoc).toHaveBeenCalled();
    expect(result).toEqual({
      uid: "new-uid-123",
      email: "new@test.com",
      name: "New User",
      role: "maintainer",
    });
  });

  it("includes phone when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ localId: "uid-phone" }),
    });
    mockSetDoc.mockResolvedValueOnce(undefined);

    const result = await createStaffUser({ ...input, phone: "123456" });
    expect(result.phone).toBe("123456");
  });

  it("throws on EMAIL_EXISTS error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: "EMAIL_EXISTS" } }),
    });

    await expect(createStaffUser(input)).rejects.toThrow("An account with this email already exists");
  });

  it("throws on other REST API errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: "WEAK_PASSWORD" } }),
    });

    await expect(createStaffUser(input)).rejects.toThrow("Failed to create account: WEAK_PASSWORD");
  });

  it("cleans up auth account when Firestore write fails", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ localId: "orphan-uid" }),
      })
      .mockResolvedValueOnce({ ok: true }); // cleanup call

    mockSetDoc.mockRejectedValueOnce(new Error("Firestore write failed"));

    await expect(createStaffUser(input)).rejects.toThrow("Firestore write failed");

    // Second fetch call is the cleanup (delete orphaned auth account)
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining("accounts:delete"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
