import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  deleteUser,
} from "firebase/auth";
import { setDoc, getDoc } from "firebase/firestore";

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  deleteUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => "mock-doc-ref"),
  setDoc: jest.fn().mockResolvedValue(undefined),
  getDoc: jest.fn(),
}));

jest.mock("@/config/firebase", () => ({
  auth: "mock-auth",
  db: "mock-db",
}));

import { signIn, signUp, signOut, getUserProfile, updateUserProfile, onAuthChange } from "@/services/auth";

const mockSignIn = signInWithEmailAndPassword as jest.Mock;
const mockCreateUser = createUserWithEmailAndPassword as jest.Mock;
const mockFirebaseSignOut = firebaseSignOut as jest.Mock;
const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("signIn", () => {
  it("calls signInWithEmailAndPassword and returns user", async () => {
    const mockUser = { uid: "u1", email: "a@b.com" };
    mockSignIn.mockResolvedValue({ user: mockUser });

    const user = await signIn("a@b.com", "pass123");
    expect(user).toEqual(mockUser);
    expect(mockSignIn).toHaveBeenCalledWith("mock-auth", "a@b.com", "pass123");
  });

  it("propagates auth errors", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid credentials"));
    await expect(signIn("bad@email.com", "wrong")).rejects.toThrow("Invalid credentials");
  });
});

describe("signUp", () => {
  it("creates user and writes profile to Firestore", async () => {
    mockCreateUser.mockResolvedValue({ user: { uid: "new-uid" } });

    const result = await signUp("test@test.com", "pass123", "Test User", "tenant", "A-12");

    expect(mockCreateUser).toHaveBeenCalledWith("mock-auth", "test@test.com", "pass123");
    expect(mockSetDoc).toHaveBeenCalledWith("mock-doc-ref", {
      uid: "new-uid",
      email: "test@test.com",
      name: "Test User",
      role: "tenant",
      unitNumber: "A-12",
    });
    expect(result).toEqual({
      uid: "new-uid",
      email: "test@test.com",
      name: "Test User",
      role: "tenant",
      unitNumber: "A-12",
    });
  });

  it("deletes Auth account if Firestore profile write fails", async () => {
    const mockUser = { uid: "orphan-uid" };
    mockCreateUser.mockResolvedValue({ user: mockUser });
    mockSetDoc.mockRejectedValueOnce(new Error("PERMISSION_DENIED"));
    const mockDeleteUser = deleteUser as jest.Mock;

    await expect(signUp("t@test.com", "pass123", "Test", "tenant")).rejects.toThrow("PERMISSION_DENIED");
    expect(mockDeleteUser).toHaveBeenCalledWith(mockUser);
  });

  it("sets unitNumber to undefined when empty", async () => {
    mockCreateUser.mockResolvedValue({ user: { uid: "new-uid" } });

    const result = await signUp("t@test.com", "pass123", "Tenant", "tenant", "");

    expect(result.unitNumber).toBeUndefined();
    expect(mockSetDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      expect.objectContaining({ role: "tenant", unitNumber: undefined }),
    );
  });
});

describe("signOut", () => {
  it("calls firebase signOut", async () => {
    await signOut();
    expect(mockFirebaseSignOut).toHaveBeenCalledWith("mock-auth");
  });
});

describe("getUserProfile", () => {
  it("returns user data when document exists", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: "u1", name: "John", email: "j@test.com", role: "tenant" }),
    });

    const profile = await getUserProfile("u1");
    expect(profile).toEqual({ uid: "u1", name: "John", email: "j@test.com", role: "tenant" });
  });

  it("returns null when document does not exist", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const profile = await getUserProfile("nonexistent");
    expect(profile).toBeNull();
  });
});

describe("updateUserProfile", () => {
  it("merges fields into user document", async () => {
    await updateUserProfile("u1", { name: "Updated Name" });
    expect(mockSetDoc).toHaveBeenCalledWith("mock-doc-ref", { name: "Updated Name" }, { merge: true });
  });
});

describe("onAuthChange", () => {
  it("subscribes to auth state changes", () => {
    const mockUnsub = jest.fn();
    mockOnAuthStateChanged.mockReturnValue(mockUnsub);

    const callback = jest.fn();
    const unsub = onAuthChange(callback);

    expect(mockOnAuthStateChanged).toHaveBeenCalledWith("mock-auth", callback);
    expect(unsub).toBe(mockUnsub);
  });
});
